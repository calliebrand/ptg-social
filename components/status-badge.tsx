import { statusLabel } from "@/lib/posts";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  IN_REVIEW: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  SCHEDULED: "bg-blue-50 text-[#2F6BFF]",
  PUBLISHED: "bg-slate-900 text-white",
  FAILED: "bg-[#E01F26] text-white",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        tones[status] || tones.DRAFT,
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function typeTint(type: string, status?: string) {
  if (status === "FAILED") return "border border-red-200 bg-red-50 text-red-950";
  switch (type) {
    case "QUOTE_CARD":
      return "border border-rose-100 bg-rose-50 text-rose-950";
    case "REEL":
      return "border border-sky-100 bg-sky-50 text-sky-950";
    case "CAROUSEL":
      return "border border-violet-100 bg-violet-50 text-violet-950";
    case "PHOTO":
      return "border border-amber-100 bg-amber-50 text-amber-950";
    case "ENGAGEMENT":
      return "border border-emerald-100 bg-emerald-50 text-emerald-950";
    default:
      return "border border-slate-200 bg-white text-slate-800";
  }
}

export function typeAccent(type: string) {
  switch (type) {
    case "QUOTE_CARD":
      return "border-l-rose-400";
    case "REEL":
      return "border-l-sky-400";
    case "CAROUSEL":
      return "border-l-violet-400";
    case "PHOTO":
      return "border-l-amber-400";
    case "ENGAGEMENT":
      return "border-l-emerald-400";
    default:
      return "border-l-slate-300";
  }
}

export function statusDot(status: string) {
  switch (status) {
    case "FAILED":
      return "bg-[#E01F26]";
    case "SCHEDULED":
      return "bg-[#2F6BFF]";
    case "APPROVED":
      return "bg-emerald-500";
    case "IN_REVIEW":
      return "bg-amber-400";
    case "PUBLISHED":
      return "bg-slate-900";
    default:
      return "bg-slate-300";
  }
}
