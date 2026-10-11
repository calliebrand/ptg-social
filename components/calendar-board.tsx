"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { InstagramMark } from "@/components/instagram-mark";
import Link from "next/link";
import { reschedulePost } from "@/app/actions/posts";
import { StatusBadge, statusDot, typeTint } from "@/components/status-badge";
import { statusLabel } from "@/lib/posts";
import { dayNumber, inMonth, weekdayLabels } from "@/lib/time";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type CalPost = {
  id: string;
  title: string;
  postType: string;
  status: string;
  timeLabel: string;
  day: string | null;
  assetStatus: string;
  thumb: string | null;
};

const START_HOUR = 7;
const END_HOUR = 21;
const ROW = 76;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function clockMinutes(label: string) {
  const match = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 9 * 60;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(match[2]);
}

function pretty(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

function hourLabel(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h} ${suffix}`;
}

function Chip({ post, overlay = false, compact = false }: { post: CalPost; overlay?: boolean; compact?: boolean }) {
  const router = useRouter();
  const origin = useRef<{ x: number; y: number } | null>(null);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
    disabled: overlay || post.status === "PUBLISHED",
    data: post,
  });
  const { onPointerDown, ...dragRest } = listeners ?? {};
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...dragRest}
      data-post-id={post.id}
      className={cn(
        "event-card flex overflow-hidden bg-paper",
        typeTint(post.postType, post.status),
        isDragging && "scale-[1.02] opacity-90",
        overlay && "w-52",
        post.status !== "PUBLISHED" && "cursor-grab active:cursor-grabbing",
        compact ? "h-[58px]" : "min-h-[48px]",
      )}
      onPointerDown={(event) => {
        origin.current = { x: event.clientX, y: event.clientY };
        onPointerDown?.(event);
      }}
      onPointerUp={(event) => {
        if (!origin.current || overlay) return;
        const dx = Math.abs(event.clientX - origin.current.x);
        const dy = Math.abs(event.clientY - origin.current.y);
        if (dx < 6 && dy < 6) router.push(`/posts/${post.id}`);
      }}
    >
      {post.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumb} alt="" className="w-11 shrink-0 self-stretch object-cover" />
      ) : (
        <span className="grid w-11 shrink-0 place-items-center bg-canvas text-mute">
          <InstagramMark className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="min-w-0 flex-1 px-1.5 py-1">
        <div className="flex items-center gap-1">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot(post.status))} title={statusLabel(post.status)} />
          <span className="font-mono text-[10px] tabular-nums text-mute">{post.timeLabel}</span>
        </div>
        <div className="mt-0.5 line-clamp-2 text-[11px] leading-tight">{post.title}</div>
      </div>
    </div>
  );
}

function DayCell({
  date,
  muted,
  posts,
}: {
  date: string;
  muted: boolean;
  posts: CalPost[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  return (
    <div
      ref={setNodeRef}
      data-date={date}
      className={cn(
        "min-h-28 border-b border-r border-line bg-paper p-1.5",
        muted && "bg-canvas text-mute",
        isOver && "bg-ptg/10",
      )}
    >
      <div className={cn("mb-1.5 font-mono text-[11px] tabular-nums", muted ? "text-mute/70" : "text-mute")}>{dayNumber(date)}</div>
      <div className="flex flex-col gap-1">
        {posts.map((post) => (
          <Chip key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function WeekColumn({
  date,
  posts,
  today,
  nowMinutes,
}: {
  date: string;
  posts: CalPost[];
  today: string;
  nowMinutes: number | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  const height = (END_HOUR - START_HOUR) * ROW;
  return (
    <div
      ref={setNodeRef}
      data-date={date}
      className={cn("relative border-r border-line", isOver && "bg-ptg/10", date === today && "bg-[#f6ebe3]")}
      style={{ height }}
    >
      {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => (
        <div key={index} className="border-b border-line/80" style={{ height: ROW }} />
      ))}
      {date === today && nowMinutes !== null && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60 && (
        <div
          className="pointer-events-none absolute right-0 left-0 z-20"
          style={{ top: ((nowMinutes - START_HOUR * 60) / 60) * ROW }}
        >
          <div className="relative h-px bg-ptg">
            <span className="absolute -top-[3px] -left-[3px] h-1.5 w-1.5 rounded-full bg-ptg" />
          </div>
        </div>
      )}
      {posts.map((post, index) => {
        const minutes = clockMinutes(post.timeLabel);
        const clamped = Math.min(Math.max(minutes, START_HOUR * 60), END_HOUR * 60 - 20);
        const top = ((clamped - START_HOUR * 60) / 60) * ROW + (index % 2) * 2;
        return (
          <div key={post.id} className="absolute left-1 right-1 z-10" style={{ top }}>
            <Chip post={post} compact />
          </div>
        );
      })}
    </div>
  );
}

export function CalendarBoard({
  days,
  posts,
  unscheduled,
  year,
  month,
  canEdit,
  dimOutside = true,
  mode = "month",
  today,
  nowMinutes = null,
}: {
  days: string[];
  posts: CalPost[];
  unscheduled: CalPost[];
  year: number;
  month: number;
  canEdit: boolean;
  dimOutside?: boolean;
  mode?: "month" | "week";
  today: string;
  nowMinutes?: number | null;
}) {
  const router = useRouter();
  const [active, setActive] = useState<CalPost | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const byDay = new Map<string, CalPost[]>();
  for (const post of posts) {
    if (!post.day) continue;
    const list = byDay.get(post.day) ?? [];
    list.push(post);
    byDay.set(post.day, list);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActive(null);
    if (!canEdit) return;
    const postId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : "";
    if (!overId.startsWith("day:")) return;
    const day = overId.slice(4);
    const current = posts.find((post) => post.id === postId) ?? unscheduled.find((post) => post.id === postId);
    if (!current || current.day === day || current.status === "PUBLISHED") return;
    const result = await reschedulePost(postId, day === "unscheduled" ? null : day);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(day === "unscheduled" ? "Cleared the date." : "Moved on the calendar.");
    router.refresh();
  }

  const scheduled = [...posts].sort((a, b) => {
    const day = (a.day || "").localeCompare(b.day || "");
    if (day !== 0) return day;
    return clockMinutes(a.timeLabel) - clockMinutes(b.timeLabel);
  });

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const id = String(event.active.id);
        setActive(posts.find((post) => post.id === id) ?? unscheduled.find((post) => post.id === id) ?? null);
      }}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden border border-line bg-paper">
          {mode === "week" ? (
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-line">
                  <div />
                  {days.map((date, index) => (
                    <div key={date} className="border-l border-line px-2 py-2.5 text-center">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-mute">{weekdayLabels()[index]}</div>
                      <div
                        className={cn(
                          "mx-auto mt-1 text-[15px] font-medium leading-none tracking-[-0.03em]",
                          date === today ? "text-ptg" : "text-ink",
                        )}
                      >
                        {dayNumber(date)}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-mute">{pretty(date)}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
                  <div>
                    {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => (
                      <div key={index} className="pr-2 text-right font-mono text-[10px] tabular-nums text-mute" style={{ height: ROW }}>
                        <span className="-translate-y-2 inline-block">{hourLabel(START_HOUR + index)}</span>
                      </div>
                    ))}
                  </div>
                  {days.map((date) => (
                    <WeekColumn key={date} date={date} posts={byDay.get(date) ?? []} today={today} nowMinutes={nowMinutes} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-7 border-b border-line">
                  {weekdayLabels().map((label) => (
                    <div key={label} className="px-2 py-2 text-center text-[10px] uppercase tracking-[0.12em] text-mute">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {days.map((date) => (
                    <DayCell
                      key={date}
                      date={date}
                      muted={dimOutside && !inMonth(date, year, month)}
                      posts={byDay.get(date) ?? []}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <ScheduledPanel posts={scheduled} unscheduled={unscheduled} today={today} />
      </div>
      <DragOverlay>{active ? <Chip post={active} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function ScheduledPanel({
  posts,
  unscheduled,
  today,
}: {
  posts: CalPost[];
  unscheduled: CalPost[];
  today: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "day:unscheduled" });
  return (
    <aside className="border border-line bg-paper p-3">
      <div className="flex items-center justify-between border-b border-line px-1 pb-2">
        <h2 className="text-[15px] font-medium tracking-[-0.02em]">Scheduled Posts</h2>
        <span className="font-mono text-xs tabular-nums text-mute">{posts.length}</span>
      </div>
      <ul className="mt-1 max-h-[640px] overflow-y-auto">
        {posts.map((post) => (
          <li key={post.id} className="border-b border-line last:border-0">
            <Link href={`/posts/${post.id}`} className="flex items-center gap-2.5 px-1 py-2 hover:bg-canvas">
              {post.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.thumb} alt="" className="h-12 w-10 shrink-0 object-cover" />
              ) : (
                <span className="grid h-12 w-10 shrink-0 place-items-center border border-line bg-canvas text-mute">
                  <InstagramMark className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] tabular-nums text-mute">
                  {post.day === today ? "Today" : post.day ? pretty(post.day) : "Unscheduled"} · {post.timeLabel}
                </span>
                <span className="block truncate text-sm text-ink">{post.title}</span>
              </span>
              <StatusBadge status={post.status} />
            </Link>
          </li>
        ))}
        {posts.length === 0 && <li className="px-1 py-8 text-sm text-mute">Nothing is dated in this range.</li>}
      </ul>
      <Link href="/posts" className="mt-3 inline-flex text-sm text-ptg underline-offset-4 hover:underline">
        View All Posts
      </Link>
      <div
        ref={setNodeRef}
        className={cn("mt-4 border border-dashed border-line p-3", isOver && "border-ptg bg-ptg/5")}
      >
        <div className="text-[11px] uppercase tracking-[0.14em] text-mute">Unscheduled</div>
        <p className="mt-1 text-xs leading-relaxed text-mute">Drop a post here to clear its date. The clock stays with the post when you move it to another day.</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {unscheduled.map((post) => (
            <Chip key={post.id} post={post} />
          ))}
        </div>
      </div>
    </aside>
  );
}
