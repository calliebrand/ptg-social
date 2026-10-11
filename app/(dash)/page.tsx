import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button, Kbd } from "@/components/ui/button";
import { postTypeLabel } from "@/lib/posts";
import { TZ } from "@/lib/time";
import { formatInTimeZone } from "date-fns-tz";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function DeskPage() {
  const [counts, upcoming, dated] = await Promise.all([
    prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.post.findMany({
      where: { scheduledAt: { not: null }, status: { not: "PUBLISHED" } },
      orderBy: { scheduledAt: "asc" },
      take: 6,
      include: { media: { include: { asset: true }, orderBy: { position: "asc" }, take: 1 } },
    }),
    prisma.post.findMany({
      where: { scheduledAt: { not: null } },
      select: { scheduledAt: true, publishedAt: true, status: true },
    }),
  ]);

  const count = (status: string) => counts.find((row) => row.status === status)?._count._all ?? 0;
  const monthKey = formatInTimeZone(new Date(), TZ, "yyyy-MM");
  const publishedThisMonth = dated.filter((post) => {
    if (post.status !== "PUBLISHED") return false;
    const stamp = post.publishedAt || post.scheduledAt;
    return stamp ? formatInTimeZone(stamp, TZ, "yyyy-MM") === monthKey : false;
  }).length;

  const byDay = new Map<string, number>();
  const byWeekday = Object.fromEntries(WEEKDAYS.map((day) => [day, 0])) as Record<string, number>;
  for (const post of dated) {
    if (!post.scheduledAt) continue;
    const key = formatInTimeZone(post.scheduledAt, TZ, "yyyy-MM-dd");
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
    const weekday = formatInTimeZone(post.scheduledAt, TZ, "EEE");
    if (weekday in byWeekday) byWeekday[weekday] += 1;
  }
  const days = [...byDay.keys()].sort();
  const series = days.map((day) => ({
    day,
    label: formatInTimeZone(new Date(`${day}T12:00:00Z`), "UTC", "MMM d"),
    value: byDay.get(day) ?? 0,
  }));
  const first = dated.map((post) => post.scheduledAt).filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime());
  const range =
    first.length > 0
      ? `${formatInTimeZone(first[0], TZ, "MMM d, yyyy")} – ${formatInTimeZone(first[first.length - 1], TZ, "MMM d, yyyy")}`
      : "No scheduled dates";

  return (
    <div>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <Link href="/calendar" className="btn btn-subtle">
              <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
              {range}
            </Link>
            <Button variant="outline" asChild>
              <Link href="/posts">Posts</Link>
            </Button>
            <Button asChild>
              <Link href="/posts/new">
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                Create Post
                <Kbd>C</Kbd>
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Scheduled" value={count("SCHEDULED")} hint="On the calendar" />
        <Stat label="Awaiting approval" value={count("IN_REVIEW")} hint="In review" />
        <Stat label="Published" value={publishedThisMonth} hint="This month" />
        <Stat label="Drafts" value={count("DRAFT")} hint="Not submitted" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
        <section className="card p-5 md:p-6">
          <h2 className="text-base font-semibold text-ink">Posts on the calendar</h2>
          <p className="mt-1 text-sm text-mute">One mark per day that has a scheduled post.</p>
          <div className="mt-4">
            {series.length > 0 ? <AreaChart points={series} /> : <p className="py-16 text-sm text-mute">No dated posts yet.</p>}
          </div>
        </section>
        <section className="card p-5 md:p-6">
          <h2 className="text-base font-semibold text-ink">By weekday</h2>
          <p className="mt-1 text-sm text-mute">How the plan is spread across the week.</p>
          <WeekBars counts={byWeekday} />
        </section>
      </div>

      <section className="card mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 md:px-6">
          <h2 className="text-base font-semibold text-ink">Upcoming posts</h2>
          <Link href="/calendar" className="text-sm font-medium text-ptg">
            Calendar
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-mute">
              <tr className="border-y border-line">
                <th className="px-5 py-3 font-medium md:px-6">Post</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium md:px-6">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((post) => {
                const thumb = post.media[0]?.asset;
                return (
                  <tr key={post.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 md:px-6">
                      <Link href={`/posts/${post.id}`} className="flex items-center gap-3">
                        {thumb && thumb.mimeType.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb.url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f3f4f6] text-xs font-medium text-mute">
                            {post.planNumber ? String(post.planNumber).padStart(2, "0") : "—"}
                          </span>
                        )}
                        <span className="font-medium text-ink">{post.title}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-mute">
                      {post.scheduledAt ? formatInTimeZone(post.scheduledAt, TZ, "MMM d, h:mm a") : "—"}
                    </td>
                    <td className="px-3 py-3 text-mute">{postTypeLabel(post.postType)}</td>
                    <td className="px-5 py-3 md:px-6">
                      <StatusBadge status={post.status} />
                    </td>
                  </tr>
                );
              })}
              {upcoming.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-sm text-mute">
                    No dated posts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="card px-5 py-5">
      <div className="text-sm text-mute">{label}</div>
      <div className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.04em] text-ink">{value}</div>
      <div className="mt-3 text-xs text-mute">{hint}</div>
    </div>
  );
}

function AreaChart({ points }: { points: { label: string; value: number }[] }) {
  const width = 640;
  const height = 220;
  const max = Math.max(1, ...points.map((point) => point.value));
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((point, index) => ({
    ...point,
    x: index * step,
    y: height - 28 - (point.value / max) * (height - 56),
  }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `0,${height - 8} ${line} ${width},${height - 8}`;
  const peak = coords.reduce((best, point) => (point.value > best.value ? point : best), coords[0]);
  const ticks = coords.filter((_, index) => index % Math.ceil(coords.length / 6) === 0 || index === coords.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Posts scheduled per day">
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1="0"
          x2={width}
          y1={height - 28 - ratio * (height - 56)}
          y2={height - 28 - ratio * (height - 56)}
          stroke="#eef0f3"
        />
      ))}
      <polygon points={area} fill="rgba(224,31,38,0.12)" />
      <polyline points={line} fill="none" stroke="#e01f26" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={peak.x} cy={peak.y} r="5" fill="#e01f26" />
      <circle cx={peak.x} cy={peak.y} r="9" fill="none" stroke="#e01f26" strokeOpacity="0.35" />
      {ticks.map((point) => (
        <text key={point.label + point.x} x={point.x} y={height - 6} textAnchor="middle" fontSize="11" fill="#6b7280">
          {point.label}
        </text>
      ))}
    </svg>
  );
}

function WeekBars({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...WEEKDAYS.map((day) => counts[day] ?? 0));
  const peak = WEEKDAYS.reduce((best, day) => ((counts[day] ?? 0) > (counts[best] ?? 0) ? day : best), WEEKDAYS[0]);
  return (
    <div className="mt-6 flex h-52 items-end gap-3">
      {WEEKDAYS.map((day) => {
        const value = counts[day] ?? 0;
        const hot = day === peak && value > 0;
        return (
          <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-xs font-medium text-mute">{value}</span>
            <div
              className="w-full rounded-xl"
              style={{
                height: `${Math.max(8, (value / max) * 150)}px`,
                background: hot ? "#e01f26" : "#e8eaef",
              }}
            />
            <span className="text-xs text-mute">{day}</span>
          </div>
        );
      })}
    </div>
  );
}
