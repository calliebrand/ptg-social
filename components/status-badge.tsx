import { statusLabel } from "@/lib/posts";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  DRAFT: "bg-[#f3f4f6] text-[#4b5563]",
  IN_REVIEW: "bg-[#fff6e8] text-[#9a6700]",
  APPROVED: "bg-[#e8f8ee] text-[#157a3a]",
  SCHEDULED: "bg-[#fdecee] text-[#c0161c]",
  PUBLISHED: "bg-[#e8f8ee] text-[#157a3a]",
  FAILED: "bg-[#fdecee] text-[#c0161c]",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tones[status] || tones.DRAFT,
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function typeTint(type: string, status?: string) {
  const edge = status === "FAILED" ? "border-l-ptg" : typeAccent(type);
  return cn("border border-line border-l-2 bg-paper text-ink", edge);
}

export function typeAccent(type: string) {
  switch (type) {
    case "QUOTE_CARD":
      return "border-l-ptg";
    case "REEL":
      return "border-l-ink";
    case "CAROUSEL":
      return "border-l-[#8a6a3b]";
    case "PHOTO":
      return "border-l-[#c4a574]";
    case "ENGAGEMENT":
      return "border-l-[#3d6b4f]";
    default:
      return "border-l-line";
  }
}

export function statusDot(status: string) {
  switch (status) {
    case "FAILED":
    case "SCHEDULED":
      return "bg-ptg";
    case "APPROVED":
    case "PUBLISHED":
      return "bg-[#157a3a]";
    case "IN_REVIEW":
      return "bg-[#d4a017]";
    default:
      return "bg-[#c5cad3]";
  }
}
