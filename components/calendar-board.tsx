"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { InstagramMark } from "@/components/instagram-mark";
import Link from "next/link";
import { reschedulePost } from "@/app/actions/posts";
import { statusDot, typeTint } from "@/components/status-badge";
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
        "flex gap-1.5 overflow-hidden rounded-lg px-1.5 py-1 shadow-sm",
        typeTint(post.postType, post.status),
        isDragging && "opacity-40",
        overlay && "w-44 shadow-lg",
        post.status !== "PUBLISHED" && "cursor-grab active:cursor-grabbing",
        compact ? "h-[58px]" : "",
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
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[10px] font-semibold leading-none">
          <InstagramMark className="h-3 w-3 shrink-0" />
          <span>{post.timeLabel}</span>
          <span className={cn("ml-auto h-1.5 w-1.5 shrink-0 rounded-full", statusDot(post.status))} />
        </div>
        <div className={cn("mt-1 text-[11px] font-medium leading-snug", compact ? "line-clamp-2" : "line-clamp-2")}>
          {post.title}
        </div>
      </div>
      {post.thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumb} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />
      )}
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
        "min-h-28 border-b border-r border-slate-100 bg-white p-1.5",
        muted && "bg-slate-50/80 text-slate-400",
        isOver && "bg-[#2F6BFF]/10",
      )}
    >
      <div className={cn("mb-1.5 text-xs font-medium", muted ? "text-slate-400" : "text-slate-500")}>{dayNumber(date)}</div>
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
}: {
  date: string;
  posts: CalPost[];
  today: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${date}` });
  const height = (END_HOUR - START_HOUR) * ROW;
  return (
    <div
      ref={setNodeRef}
      data-date={date}
      className={cn("relative border-r border-slate-100", isOver && "bg-[#2F6BFF]/10", date === today && "bg-blue-50/40")}
      style={{ height }}
    >
      {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => (
        <div key={index} className="border-b border-slate-100" style={{ height: ROW }} />
      ))}
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
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {mode === "week" ? (
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-slate-100">
                  <div />
                  {days.map((date, index) => (
                    <div key={date} className="border-l border-slate-100 px-2 py-3 text-center">
                      <div className="text-[11px] font-medium text-slate-400">{weekdayLabels()[index]}</div>
                      <div
                        className={cn(
                          "mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-sm font-semibold",
                          date === today ? "bg-[#2F6BFF] text-white" : "text-slate-800",
                        )}
                      >
                        {dayNumber(date)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-400">{pretty(date)}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
                  <div>
                    {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => (
                      <div key={index} className="pr-2 text-right text-[11px] text-slate-400" style={{ height: ROW }}>
                        <span className="-translate-y-2 inline-block">{hourLabel(START_HOUR + index)}</span>
                      </div>
                    ))}
                  </div>
                  {days.map((date) => (
                    <WeekColumn key={date} date={date} posts={byDay.get(date) ?? []} today={today} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-7 border-b border-slate-100">
                  {weekdayLabels().map((label) => (
                    <div key={label} className="px-2 py-2 text-center text-[11px] font-medium text-slate-400">
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
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Scheduled Posts</h2>
        <span className="text-xs text-slate-400">{posts.length}</span>
      </div>
      <ul className="mt-3 max-h-[640px] space-y-1 overflow-y-auto">
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/posts/${post.id}`} className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50">
              <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full", typeTint(post.postType, post.status))}>
                <InstagramMark className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-slate-400">
                  {post.day === today ? "Today" : post.day ? pretty(post.day) : "Unscheduled"}, {post.timeLabel}
                </span>
                <span className="block truncate text-sm font-medium text-slate-800">{post.title}</span>
              </span>
              {post.thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.thumb} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
              )}
            </Link>
          </li>
        ))}
        {posts.length === 0 && <li className="px-2 py-6 text-sm text-slate-400">Nothing is dated in this range.</li>}
      </ul>
      <Link href="/posts" className="mt-2 inline-flex text-sm font-medium text-[#2F6BFF] hover:underline">
        View All Posts
      </Link>
      <div
        ref={setNodeRef}
        className={cn("mt-4 rounded-xl border border-dashed border-slate-200 p-3", isOver && "border-[#2F6BFF] bg-[#2F6BFF]/5")}
      >
        <div className="text-xs font-medium text-slate-500">Unscheduled</div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">Drop a post here to clear its date. The clock stays with the post when you move it to another day.</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {unscheduled.map((post) => (
            <Chip key={post.id} post={post} />
          ))}
        </div>
      </div>
    </aside>
  );
}
