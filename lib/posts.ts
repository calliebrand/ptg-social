import type { PostStatus, PostType } from "@prisma/client";

export const POST_TYPES: PostType[] = [
  "QUOTE_CARD",
  "REEL",
  "CAROUSEL",
  "PHOTO",
  "ENGAGEMENT",
];

export const POST_STATUSES: PostStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "FAILED",
];

export function postTypeLabel(type: string) {
  switch (type) {
    case "QUOTE_CARD":
      return "Quote card";
    case "REEL":
      return "Reel";
    case "CAROUSEL":
      return "Carousel";
    case "PHOTO":
      return "Photo";
    case "ENGAGEMENT":
      return "Engagement";
    default:
      return type;
  }
}

export function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "IN_REVIEW":
      return "In review";
    case "APPROVED":
      return "Approved";
    case "SCHEDULED":
      return "Scheduled";
    case "PUBLISHED":
      return "Published";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}

export function mapFormat(format: string): PostType {
  const value = format.toLowerCase();
  if (value.includes("reel")) return "REEL";
  if (value.includes("carousel")) return "CAROUSEL";
  if (value.includes("product")) return "PHOTO";
  if (value.includes("quote")) return "QUOTE_CARD";
  if (
    value.includes("engagement") ||
    value.includes("prompt") ||
    value.includes("this or that") ||
    value.includes("this-or-that")
  ) {
    return "ENGAGEMENT";
  }
  return "PHOTO";
}

export function parseSlides(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(S\d+[^:]*):\s*(.*)$/i);
      if (match) return { heading: match[1].trim(), body: match[2].trim() };
      return { heading: "", body: line };
    });
}

export function publishBlockReason(
  post: {
    status: string;
    approvedById: string | null;
    approverRole: string | null;
    scheduledAt: Date | null;
  },
  now = new Date(),
) {
  if (post.status !== "SCHEDULED") return "Post is not scheduled.";
  if (!post.approvedById || !post.approverRole) return "Post has no approval on record.";
  if (post.approverRole !== "OWNER" && post.approverRole !== "ADMIN") {
    return "Only an owner or admin approval can publish.";
  }
  if (!post.scheduledAt) return "Post has no scheduled time.";
  if (post.scheduledAt.getTime() > now.getTime()) return "Scheduled time has not arrived.";
  return null;
}
