import { prisma } from "@/lib/db";
import { chicagoDateValue, chicagoStamp, chicagoTimeValue } from "@/lib/time";
import type { EditorPost } from "@/components/post-editor";

export async function editorContext() {
  const [library, templates, hashtagSets] = await Promise.all([
    prisma.asset.findMany({ orderBy: { createdAt: "desc" }, take: 180 }),
    prisma.captionTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.hashtagSet.findMany({ orderBy: { name: "asc" } }),
  ]);
  return {
    library: library.map((asset) => ({
      id: asset.id,
      url: asset.url,
      filename: asset.filename,
      mimeType: asset.mimeType,
      alt: asset.alt,
    })),
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      body: template.body,
    })),
    hashtagSets: hashtagSets.map((set) => ({ id: set.id, name: set.name, tags: set.tags })),
  };
}

export function toEditorPost(
  post: {
    id: string;
    planNumber: number | null;
    title: string;
    caption: string;
    hashtags: string;
    postType: EditorPost["postType"];
    status: string;
    scheduledAt: Date | null;
    notes: string;
    bibleReference: string;
    quoteText: string;
    pillar: string;
    productTie: string;
    visualDirection: string;
    palette: string;
    productionNotes: string;
    cta: string;
    assetStatus: string;
    igPermalink: string | null;
    publishError: string | null;
    approvedAt: Date | null;
    approvedBy: { name: string } | null;
    slides: { heading: string; body: string; position: number }[];
    media: {
      id: string;
      position: number;
      asset: { id: string; url: string; filename: string; mimeType: string; alt: string };
    }[];
    comments: { id: string; body: string; createdAt: Date; authorName: string; authorRole: string }[];
  },
): EditorPost {
  return {
    id: post.id,
    planNumber: post.planNumber,
    title: post.title,
    caption: post.caption,
    hashtags: post.hashtags,
    postType: post.postType,
    status: post.status,
    scheduledDate: post.scheduledAt ? chicagoDateValue(post.scheduledAt) : "",
    scheduledTime: post.scheduledAt ? chicagoTimeValue(post.scheduledAt) : "",
    notes: post.notes,
    bibleReference: post.bibleReference,
    quoteText: post.quoteText,
    pillar: post.pillar,
    productTie: post.productTie,
    visualDirection: post.visualDirection,
    palette: post.palette,
    productionNotes: post.productionNotes,
    cta: post.cta,
    assetStatus: post.assetStatus,
    slides: [...post.slides]
      .sort((a, b) => a.position - b.position)
      .map((slide) => ({ heading: slide.heading, body: slide.body })),
    approvedByName: post.approvedBy?.name ?? null,
    approvedAtLabel: post.approvedAt ? chicagoStamp(post.approvedAt) : null,
    igPermalink: post.igPermalink,
    publishError: post.publishError,
    media: [...post.media].sort((a, b) => a.position - b.position),
    comments: [...post.comments]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: chicagoStamp(comment.createdAt),
        authorName: comment.authorName,
        authorRole: comment.authorRole,
      })),
  };
}

export const postInclude = {
  slides: true,
  media: { include: { asset: true } },
  comments: true,
  approvedBy: { select: { name: true } },
} as const;
