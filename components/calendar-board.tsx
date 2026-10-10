"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { reschedulePost } from "@/app/actions/posts";
import { StatusBadge, typeAccent } from "@/components/status-badge";
import { postTypeLabel } from "@/lib/posts";
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

function Chip({ post, overlay = false }: { post: CalPost; overlay?: boolean }) {
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
        "border border-[#0A0A0A] border-l-4 bg-[#F7F3EA] px-2 py-1.5",
        typeAccent(post.postType),
        isDragging && "opacity-40",
        overlay && "shadow-lg",
        post.status !== "PUBLISHED" && "cursor-grab active:cursor-grabbing",
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
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#767778]">
        {post.timeLabel} · {postTypeLabel(post.postType)}
      </div>
      <div className="mt-0.5 text-xs font-medium leading-snug">{post.title}</div>
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
        "min-h-32 border border-[#0A0A0A]/80 bg-[#F7F3EA] p-2",
        muted && "bg-[#E9DFC9]/70 text-[#767778]",
        isOver && "bg-[#E01F26]/10",
      )}
    >
      <div className="mb-2 font-mono text-[10px] tracking-[0.14em]">{dayNumber(date)}</div>
      <div className="flex flex-col gap-1.5">
        {posts.map((post) => (
          <Chip key={post.id} post={post} />
        ))}
      </div>
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
}: {
  days: string[];
  posts: CalPost[];
  unscheduled: CalPost[];
  year: number;
  month: number;
  canEdit: boolean;
  dimOutside?: boolean;
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
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div>
          <div className="grid grid-cols-7 border border-[#0A0A0A] bg-[#0A0A0A] text-[#F1EBDD]">
            {weekdayLabels().map((label) => (
              <div key={label} className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.16em]">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-7">
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
        <UnscheduledTray posts={unscheduled} />
      </div>
      <DragOverlay>{active ? <Chip post={active} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function UnscheduledTray({ posts }: { posts: CalPost[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "day:unscheduled" });
  return (
    <aside
      ref={setNodeRef}
      className={cn("border border-[#0A0A0A] bg-[#F7F3EA] p-3", isOver && "bg-[#E01F26]/10")}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#767778]">Unscheduled</div>
      <p className="mt-1 text-xs leading-relaxed text-[#3a3a3a]">
        Drag a draft onto a day. The clock stays put. Drop it here to clear the date.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {posts.length === 0 && <div className="text-xs text-[#767778]">Every planned post has a day.</div>}
        {posts.map((post) => (
          <div key={post.id}>
            <Chip post={post} />
            <div className="mt-1">
              <StatusBadge status={post.status} />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
