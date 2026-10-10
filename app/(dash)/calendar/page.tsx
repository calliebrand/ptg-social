import Link from "next/link";
import { prisma } from "@/lib/db";
import { CalendarBoard, type CalPost } from "@/components/calendar-board";
import { StatusBadge, typeAccent } from "@/components/status-badge";
import { requireUser } from "@/lib/session";
import { canEdit } from "@/lib/permissions";
import { POST_STATUSES, POST_TYPES, postTypeLabel, statusLabel } from "@/lib/posts";
import { Button } from "@/components/ui/button";
import {
  chicagoDateKey,
  chicagoStamp,
  chicagoTimeValue,
  chicagoToday,
  monthGrid,
  monthTitle,
  parseMonthParam,
  rangeForDays,
  shiftMonth,
  weekDays,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const view = params.view === "month" || params.view === "list" || params.view === "grid" ? params.view : "week";
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

  const rangeLabel =
    view === "week"
      ? `${prettyDay(days[0])} – ${prettyDay(days[6])}, ${days[0].slice(0, 4)}`
      : view === "list"
        ? "All posts"
        : view === "grid"
          ? monthTitle(month.year, month.month)
          : monthTitle(month.year, month.month);
  const prevHref =
    view === "week"
      ? `/calendar?view=week&week=${shiftDay(weekPrev, -7)}&month=${month.key}`
      : `/calendar?view=${view}&month=${prevMonth}`;
  const nextHref =
    view === "week"
      ? `/calendar?view=week&week=${shiftDay(weekNextStart, 1)}&month=${month.key}`
      : `/calendar?view=${view}&month=${nextMonth}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Content Calendar</h1>
        {canEdit(user.role) && (
          <Button asChild>
            <Link href="/posts/new">
              <Plus className="h-4 w-4" />
              Create Post
            </Link>
          </Button>
        )}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {view !== "list" && (
            <Link href={prevHref} aria-label="Previous" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-40 text-center text-sm font-semibold text-slate-800">{rangeLabel}</div>
          {view !== "list" && (
            <Link href={nextHref} aria-label="Next" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white">
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="flex rounded-xl bg-white p-1 shadow-sm">
          <ViewLink current={view} view="week" month={month.key} week={anchor}>
            Week
          </ViewLink>
          <ViewLink current={view} view="month" month={month.key} week={anchor}>
            Month
          </ViewLink>
          <ViewLink current={view} view="list" month={month.key} week={anchor}>
            List
          </ViewLink>
          <ViewLink current={view} view="grid" month={month.key} week={anchor}>
            Grid
          </ViewLink>
        </div>
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
          mode={view === "week" ? "week" : "month"}
          today={chicagoToday()}
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            />
            <select name="status" defaultValue={params.status || ""} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
              <option value="">Any status</option>
              {["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "FAILED"].map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
            <select name="type" defaultValue={params.type || ""} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
              <option value="">Any type</option>
              {["QUOTE_CARD", "REEL", "CAROUSEL", "PHOTO", "ENGAGEMENT"].map((type) => (
                <option key={type} value={type}>
                  {postTypeLabel(type)}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-[#2F6BFF] px-3 py-2 text-sm font-medium text-white">
              Filter
            </button>
          </form>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-100 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {allForList.map((post) => (
                  <tr key={post.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-xs text-slate-500">
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
        "rounded-lg px-3 py-1.5 text-sm font-medium",
        current === view ? "bg-[#2F6BFF] text-white" : "text-slate-500 hover:text-slate-800",
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
          <div className="text-lg font-semibold">@preachthegospel.store</div>
          <div className="text-xs text-slate-400">
            Profile grid of this range, newest first
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl bg-white p-1 shadow-sm">
        {ordered.map((post) => (
          <Link key={post.id} href={`/posts/${post.id}`} className={cn("relative aspect-square overflow-hidden rounded-lg bg-slate-100", typeAccent(post.postType))}>
            {post.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.thumb} alt={post.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-end p-2">
                <span className="text-sm font-medium leading-tight">{post.title}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
      {ordered.length === 0 && <p className="mt-4 text-sm">Nothing is dated in this range.</p>}
    </div>
  );
}
