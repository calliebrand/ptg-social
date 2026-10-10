import { statusLabel } from "@/lib/posts";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  DRAFT: "bg-[#E7E2D6] text-[#0A0A0A]",
  IN_REVIEW: "bg-[#C5B69B] text-[#0A0A0A]",
  APPROVED: "bg-[#5E9073] text-white",
  SCHEDULED: "bg-[#5176BD] text-white",
  PUBLISHED: "bg-[#0A0A0A] text-[#F1EBDD]",
  FAILED: "bg-[#E01F26] text-white",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
        tones[status] || tones.DRAFT,
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function typeAccent(type: string) {
  switch (type) {
    case "QUOTE_CARD":
      return "border-l-[#E01F26]";
    case "REEL":
      return "border-l-[#0A0A0A]";
    case "CAROUSEL":
      return "border-l-[#5176BD]";
    case "PHOTO":
      return "border-l-[#C5B69B]";
    case "ENGAGEMENT":
      return "border-l-[#5E9073]";
    default:
      return "border-l-[#0A0A0A]";
  }
}
