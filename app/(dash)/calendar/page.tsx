import Link from "next/link";
import { prisma } from "@/lib/db";
import { CalendarBoard, type CalPost } from "@/components/calendar-board";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, typeAccent } from "@/components/status-badge";
import { requireUser } from "@/lib/session";
import { canEdit } from "@/lib/permissions";
import { POST_STATUSES, POST_TYPES, postTypeLabel, statusLabel } from "@/lib/posts";
import {
  chicagoDateKey,
  chicagoStamp,
  chicagoTimeValue,
  monthGrid,
  monthTitle,
  parseMonthParam,
  rangeForDays,
  shiftMonth,
  weekDays,
} from "@/lib/time";
import { cn } from "@/lib/utils";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const view = params.view === "week" || params.view === "list" || params.view === "grid" ? params.view : "month";
  const month = parseMonthParam(params.month);
  const anchor = params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : `${month.key}-12`;
  const days = view === "week" ? weekDays(anchor) : monthGrid(month.year, month.month);
  const range = rangeForDays(days);

  const [dated, unscheduled, allForList] = await Promise.all([
    prisma.post.findMany({
      where: { scheduledAt: { gte: range.start, lt: range.end } },
      orderBy: { scheduledAt: "asc" },
      include: { media: { include: { asset: true }, orderBy: { position: "asc" } } },
    }),
    prisma.post.findMany({
      where: { scheduledAt: null },
      orderBy: { createdAt: "asc" },
      include: { media: { include: { asset: true }, orderBy: { position: "asc" } } },
    }),
    view === "list"
      ? prisma.post.findMany({
          where: {
            ...(POST_STATUSES.find((status) => status === params.status)
              ? { status: POST_STATUSES.find((status) => status === params.status) }
              : {}),
            ...(POST_TYPES.find((type) => type === params.type)
              ? { postType: POST_TYPES.find((type) => type === params.type) }
              : {}),
            ...(params.q
              ? { title: { contains: params.q, mode: "insensitive" } }
              : {}),
          },
          orderBy: [{ scheduledAt: "asc" }],
          include: { media: { include: { asset: true }, orderBy: { position: "asc" }, take: 1 } },
        })
      : Promise.resolve([]),
  ]);

  const toCal = (post: (typeof dated)[number]): CalPost => ({
    id: post.id,
    title: post.title,
    postType: post.postType,
    status: post.status,
    timeLabel: post.scheduledAt ? formatTime(post.scheduledAt) : "—",
    day: post.scheduledAt ? chicagoDateKey(post.scheduledAt) : null,
    assetStatus: post.assetStatus,
    thumb: post.media.find((item) => item.asset.mimeType.startsWith("image/"))?.asset.url ?? null,
  });

  const prevMonth = shiftMonth(month.key, -1);
  const nextMonth = shiftMonth(month.key, 1);
  const weekPrev = days[0];
  const weekNextStart = days[6];

  return (
    <div>
      <PageHeader
        kicker="America/Chicago"
        title={
          view === "week"
            ? `${prettyDay(days[0])} – ${prettyDay(days[6])}`
            : view === "list"
              ? "List"
              : view === "grid"
                ? "Grid"
                : monthTitle(month.year, month.month)
        }
        lede="Drag a post to another day to keep its time and change the date. Published posts stay put."
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <ViewLink current={view} view="month" month={month.key} week={anchor}>
            Month
          </ViewLink>
          <ViewLink current={view} view="week" month={month.key} week={anchor}>
            Week
          </ViewLink>
          <ViewLink current={view} view="list" month={month.key} week={anchor}>
            List
          </ViewLink>
          <ViewLink current={view} view="grid" month={month.key} week={anchor}>
            Grid
          </ViewLink>
        </div>
        {view !== "list" && (
          <div className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            {view === "week" ? (
              <>
                <Link className="border border-[#0A0A0A] px-3 py-2" href={`/calendar?view=week&week=${shiftDay(weekPrev, -7)}&month=${month.key}`}>
                  Prev
                </Link>
                <Link className="border border-[#0A0A0A] px-3 py-2" href={`/calendar?view=week&week=${shiftDay(weekNextStart, 1)}&month=${month.key}`}>
                  Next
                </Link>
              </>
            ) : (
              <>
                <Link className="border border-[#0A0A0A] px-3 py-2" href={`/calendar?view=${view}&month=${prevMonth}`}>
                  Prev
                </Link>
                <Link className="border border-[#0A0A0A] px-3 py-2" href={`/calendar?view=${view}&month=${nextMonth}`}>
                  Next
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {(view === "month" || view === "week") && (
        <CalendarBoard
          days={days}
          posts={dated.map(toCal)}
          unscheduled={unscheduled.map(toCal)}
          year={month.year}
          month={month.month}
          canEdit={canEdit(user.role)}
          dimOutside={view === "month"}
        />
      )}

      {view === "grid" && <FeedGrid posts={dated.map(toCal)} />}

      {view === "list" && (
        <div>
          <form className="mb-4 flex flex-wrap gap-2" method="get">
            <input type="hidden" name="view" value="list" />
            <input
              name="q"
              defaultValue={params.q || ""}
              placeholder="Search title"
              className="border border-[#0A0A0A] bg-white px-3 py-2 text-sm"
            />
            <select name="status" defaultValue={params.status || ""} className="border border-[#0A0A0A] bg-white px-3 py-2 text-sm">
              <option value="">Any status</option>
              {["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "FAILED"].map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
            <select name="type" defaultValue={params.type || ""} className="border border-[#0A0A0A] bg-white px-3 py-2 text-sm">
              <option value="">Any type</option>
              {["QUOTE_CARD", "REEL", "CAROUSEL", "PHOTO", "ENGAGEMENT"].map((type) => (
                <option key={type} value={type}>
                  {postTypeLabel(type)}
                </option>
              ))}
            </select>
            <button className="border border-[#0A0A0A] bg-[#0A0A0A] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#F1EBDD]">
              Filter
            </button>
          </form>
          <div className="overflow-x-auto border border-[#0A0A0A] bg-[#F7F3EA]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[#0A0A0A] font-mono text-[10px] uppercase tracking-[0.14em]">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {allForList.map((post) => (
                  <tr key={post.id} className="border-b border-[#0A0A0A]/10">
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {post.scheduledAt ? chicagoStamp(post.scheduledAt) : "Unscheduled"}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/posts/${post.id}`} className="underline">
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{postTypeLabel(post.postType)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={post.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allForList.length === 0 && <p className="px-3 py-6 text-sm">No posts match.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function prettyDay(date: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, month, day] = date.split("-").map(Number);
  return `${months[month - 1]} ${day}`;
}

function formatTime(date: Date) {
  const value = chicagoTimeValue(date);
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function shiftDay(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function ViewLink({
  current,
  view,
  month,
  week,
  children,
}: {
  current: string;
  view: string;
  month: string;
  week: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/calendar?view=${view}&month=${month}&week=${week}`}
      className={cn(
        "border border-[#0A0A0A] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]",
        current === view ? "bg-[#0A0A0A] text-[#F1EBDD]" : "bg-transparent",
      )}
    >
      {children}
    </Link>
  );
}

function FeedGrid({ posts }: { posts: CalPost[] }) {
  const ordered = [...posts].sort((a, b) => (a.day && b.day ? (a.day < b.day ? 1 : -1) : 0));
  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="font-display text-3xl">@preachthegospel.store</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#767778]">
            Profile grid of this range, newest first
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 border border-[#0A0A0A] bg-[#0A0A0A] p-1">
        {ordered.map((post) => (
          <Link key={post.id} href={`/posts/${post.id}`} className={cn("relative aspect-square bg-[#F1EBDD]", typeAccent(post.postType))}>
            {post.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.thumb} alt={post.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-end p-2">
                <span className="font-display text-sm leading-none md:text-xl">{post.title}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
      {ordered.length === 0 && <p className="mt-4 text-sm">Nothing is dated in this range.</p>}
    </div>
  );
}
