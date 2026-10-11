import Link from "next/link";
import { prisma } from "@/lib/db";
import { CalendarBoard, type CalPost } from "@/components/calendar-board";
import { StatusBadge, typeAccent } from "@/components/status-badge";
import { requireUser } from "@/lib/session";
import { canEdit } from "@/lib/permissions";
import { POST_STATUSES, POST_TYPES, postTypeLabel, statusLabel } from "@/lib/posts";
import { Button, Kbd } from "@/components/ui/button";
import { formatInTimeZone } from "date-fns-tz";
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
  TZ,
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
        <h1 className="text-[22px] font-medium leading-none tracking-[-0.035em] text-ink">Content Calendar</h1>
        {canEdit(user.role) && (
          <Button asChild>
            <Link href="/posts/new">
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              Create Post
              <Kbd>C</Kbd>
            </Link>
          </Button>
        )}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {view !== "list" && (
            <Link href={prevHref} aria-label="Previous" className="grid h-8 w-8 place-items-center text-mute hover:bg-paper hover:text-ink">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-44 text-center font-mono text-sm tabular-nums text-ink">{rangeLabel}</div>
          {view !== "list" && (
            <Link href={nextHref} aria-label="Next" className="grid h-8 w-8 place-items-center text-mute hover:bg-paper hover:text-ink">
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <div className="seg">
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
          nowMinutes={chicagoNowMinutes()}
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
              className="field w-auto"
            />
            <select name="status" defaultValue={params.status || ""} className="field w-auto">
              <option value="">Any status</option>
              {["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "FAILED"].map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
            <select name="type" defaultValue={params.type || ""} className="field w-auto">
              <option value="">Any type</option>
              {["QUOTE_CARD", "REEL", "CAROUSEL", "PHOTO", "ENGAGEMENT"].map((type) => (
                <option key={type} value={type}>
                  {postTypeLabel(type)}
                </option>
              ))}
            </select>
            <button className="btn btn-primary">
              Filter
            </button>
          </form>
          <div className="overflow-x-auto border border-line bg-paper">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs font-medium text-mute">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {allForList.map((post) => (
                  <tr key={post.id} className="border-b border-line">
                    <td className="px-3 py-2 text-xs text-mute">
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

function chicagoNowMinutes(now = new Date()) {
  const [hour, minute] = formatInTimeZone(now, TZ, "HH:mm").split(":").map(Number);
  return hour * 60 + minute;
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
        "seg-item",
        current === view && "is-on",
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
          <div className="text-xs text-mute">
            Profile grid of this range, newest first
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-sm bg-paper p-1">
        {ordered.map((post) => (
          <Link key={post.id} href={`/posts/${post.id}`} className={cn("relative aspect-square overflow-hidden rounded-sm bg-canvas", typeAccent(post.postType))}>
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
