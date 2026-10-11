import { statusLabel } from "@/lib/posts";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  DRAFT: "border-line bg-transparent text-mute",
  IN_REVIEW: "border-transparent bg-[#f3e2c4] text-[#6a4a12]",
  APPROVED: "border-transparent bg-[#d7eadc] text-[#1d5a36]",
  SCHEDULED: "border-transparent bg-ink text-cream",
  PUBLISHED: "border-transparent bg-ink text-cream",
  FAILED: "border-transparent bg-ptg text-white",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
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
      return "bg-ptg";
    case "SCHEDULED":
      return "bg-ptg";
    case "APPROVED":
      return "bg-[#2f7d4a]";
    case "IN_REVIEW":
      return "bg-[#c4a574]";
    case "PUBLISHED":
      return "bg-ink";
    default:
      return "bg-[#b7aa9c]";
  }
}
