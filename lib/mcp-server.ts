import { lookup } from "dns/promises";
import { isIP } from "net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Post, PostStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { agentActor } from "@/lib/agent";
import {
  addCommentAs,
  attachAssetAs,
  detachAssetAs,
  savePostAs,
  setPostStatusAs,
  type Actor,
} from "@/lib/post-service";
import type { PostInput } from "@/lib/validators";
import { POST_STATUSES, POST_TYPES } from "@/lib/posts";
import { chicagoDateValue, chicagoTimeValue, rangeForDays, TZ } from "@/lib/time";
import { captionStats } from "@/lib/caption";
import { RenderError, renderSvg, type SvgPhoto } from "@/lib/render";
import { MAX_UPLOAD_BYTES, storeBuffer } from "@/lib/storage";
import { brandGuideText, REFERENCE_QUOTE_CARD_SVG } from "@/lib/brand-guide";

/**
 * MCP tools for an Editor. Everything here goes through the same rules as the
 * dashboard (lib/post-service.ts). There is deliberately no tool to approve,
 * schedule, or publish: an owner or admin does that in the desk.
 */

const INSTRUCTIONS = `This server is the PTG Social Desk, the editorial calendar for the Instagram account @preachthegospel.store (Preach the Gospel, Christian streetwear from Houston).
You act as an Editor named in the desk's Team page. You can draft and edit posts, make graphics, attach media, comment, and submit posts for review. You cannot approve, schedule, or publish; the owner does that in the dashboard, and only approved + scheduled posts are ever sent to Instagram.
Start with get_brand_guide before drafting. Times are America/Chicago. Preview every graphic with render_graphic before add_graphic_to_post.`;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const timeString = z.string().regex(/^\d{2}:\d{2}$/, "Use 24-hour HH:MM.");

const slideShape = z.object({
  heading: z.string().max(300).default(""),
  body: z.string().max(4000).default(""),
});

const postFields = {
  title: z.string().min(1).max(200).describe("Internal title, e.g. 'No. 23 — Light of the World'."),
  postType: z.enum(POST_TYPES as [string, ...string[]]).describe("QUOTE_CARD, CAROUSEL, PHOTO, ENGAGEMENT, or REEL."),
  caption: z.string().max(8000).describe("Caption without hashtags. Caption + hashtags must stay within 2,200 characters."),
  hashtags: z.string().max(2000).describe("Space-separated hashtags, max 30."),
  scheduledDate: dateString.describe("Planned day in America/Chicago. The owner still has to approve and schedule it."),
  scheduledTime: timeString.describe("Planned time in America/Chicago, 24-hour."),
  bibleReference: z.string().max(300).describe("e.g. 'John 16:33 (BSB)'."),
  quoteText: z.string().max(4000).describe("Exact verse or quote text used on the graphic."),
  pillar: z.string().max(200),
  productTie: z.string().max(500).describe("Product(s) and price this post points to."),
  cta: z.string().max(300),
  visualDirection: z.string().max(8000).describe("Design notes for the graphic."),
  palette: z.string().max(500),
  notes: z.string().max(8000).describe("Notes for the owner, or a Reel script."),
  productionNotes: z.string().max(8000),
  assetStatus: z.string().max(200),
  slides: z.array(slideShape).max(20).describe("Carousel slide copy, in order."),
};

type PostFieldValues = {
  [K in keyof typeof postFields]?: z.infer<(typeof postFields)[K]>;
};

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

function dashboardUrl(path: string) {
  const base = (process.env.AUTH_URL || "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

type FullPost = Post & {
  slides: { heading: string; body: string; position: number }[];
  media: { position: number; asset: { id: string; url: string; mimeType: string; alt: string; filename: string } }[];
  comments?: { authorName: string; authorRole: string; body: string; createdAt: Date }[];
  createdBy?: { name: string } | null;
  approvedBy?: { name: string } | null;
};

function serializePost(post: FullPost, detail: boolean) {
  const stats = captionStats(post.caption, post.hashtags);
  const base = {
    id: post.id,
    title: post.title,
    status: post.status,
    postType: post.postType,
    scheduledDate: post.scheduledAt ? chicagoDateValue(post.scheduledAt) : null,
    scheduledTime: post.scheduledAt ? chicagoTimeValue(post.scheduledAt) : null,
    timezone: TZ,
    mediaCount: post.media.length,
    url: dashboardUrl(`/posts/${post.id}`),
  };
  if (!detail) return { ...base, pillar: post.pillar, productTie: post.productTie };
  return {
    ...base,
    caption: post.caption,
    hashtags: post.hashtags,
    captionCharacters: stats.characters,
    hashtagCount: stats.hashtagCount,
    bibleReference: post.bibleReference,
    quoteText: post.quoteText,
    pillar: post.pillar,
    productTie: post.productTie,
    cta: post.cta,
    visualDirection: post.visualDirection,
    palette: post.palette,
    notes: post.notes,
    productionNotes: post.productionNotes,
    assetStatus: post.assetStatus,
    slides: [...post.slides]
      .sort((a, b) => a.position - b.position)
      .map(({ heading, body }) => ({ heading, body })),
    media: [...post.media]
      .sort((a, b) => a.position - b.position)
      .map(({ asset }) => ({
        assetId: asset.id,
        url: asset.url,
        mimeType: asset.mimeType,
        alt: asset.alt,
        filename: asset.filename,
      })),
    comments: (post.comments || []).map((c) => ({
      author: `${c.authorName} (${c.authorRole.toLowerCase()})`,
      body: c.body,
      at: c.createdAt.toISOString(),
    })),
    createdBy: post.createdBy?.name ?? null,
    approvedBy: post.approvedBy?.name ?? null,
    publishError: post.publishError,
    instagramPermalink: post.igPermalink,
  };
}

const postInclude = {
  slides: true,
  media: { include: { asset: true } },
  comments: { orderBy: { createdAt: "asc" as const } },
  createdBy: { select: { name: true } },
  approvedBy: { select: { name: true } },
};

async function loadPost(id: string) {
  return prisma.post.findUnique({ where: { id }, include: postInclude });
}

function inputFrom(existing: FullPost | null, values: PostFieldValues): PostInput {
  const scheduledDate =
    values.scheduledDate ?? (existing?.scheduledAt ? chicagoDateValue(existing.scheduledAt) : "");
  const scheduledTime =
    values.scheduledTime ?? (existing?.scheduledAt ? chicagoTimeValue(existing.scheduledAt) : "");
  return {
    title: values.title ?? existing?.title ?? "",
    caption: values.caption ?? existing?.caption ?? "",
    hashtags: values.hashtags ?? existing?.hashtags ?? "",
    postType: (values.postType ?? existing?.postType ?? "QUOTE_CARD") as PostInput["postType"],
    scheduledDate,
    scheduledTime: scheduledDate ? scheduledTime : "",
    notes: values.notes ?? existing?.notes ?? "",
    bibleReference: values.bibleReference ?? existing?.bibleReference ?? "",
    quoteText: values.quoteText ?? existing?.quoteText ?? "",
    pillar: values.pillar ?? existing?.pillar ?? "",
    productTie: values.productTie ?? existing?.productTie ?? "",
    visualDirection: values.visualDirection ?? existing?.visualDirection ?? "",
    palette: values.palette ?? existing?.palette ?? "",
    productionNotes: values.productionNotes ?? existing?.productionNotes ?? "",
    cta: values.cta ?? existing?.cta ?? "",
    assetStatus: values.assetStatus ?? existing?.assetStatus ?? "",
    slides: (values.slides ??
      [...(existing?.slides ?? [])]
        .sort((a, b) => a.position - b.position)
        .map(({ heading, body }) => ({ heading, body }))) as PostInput["slides"],
  };
}

const LOCKED: PostStatus[] = ["APPROVED", "SCHEDULED"];

function lockedMessage(post: { status: PostStatus; title: string }) {
  return `"${post.title}" is ${post.status.toLowerCase()} by the owner. Changing it sends it back to review and clears the approval. Pass allowSendBackToReview: true only if the owner asked for this change.`;
}

async function attachBytes(
  actor: Actor,
  postId: string,
  bytes: Buffer,
  filename: string,
  mimeType: string,
  alt: string,
  dimensions?: { width: number; height: number },
) {
  const stored = await storeBuffer(bytes, filename, mimeType);
  const asset = await prisma.asset.create({
    data: {
      filename,
      mimeType,
      size: stored.size,
      url: stored.url,
      pathname: stored.pathname,
      storage: stored.storage,
      alt: alt.slice(0, 300),
      width: dimensions?.width,
      height: dimensions?.height,
      createdById: actor.id,
    },
  });
  await logActivity({
    userId: actor.id,
    action: "asset.upload",
    entityType: "asset",
    entityId: asset.id,
    detail: `${actor.name} added ${filename}${stored.storage === "blob" ? " to Vercel Blob" : ""}.`,
  });
  const attached = await attachAssetAs(actor, postId, asset.id);
  if (!attached.ok) throw new Error(attached.error);
  return asset;
}

function isPrivateAddress(address: string) {
  if (address.includes(":")) {
    const value = address.toLowerCase();
    return (
      value === "::1" ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      value.startsWith("fe80") ||
      value.startsWith("::ffff:127.") ||
      value.startsWith("::ffff:10.") ||
      value.startsWith("::ffff:192.168.")
    );
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

async function assertPublicHttps(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That is not a valid URL.");
  }
  if (url.protocol !== "https:") throw new Error("Only https URLs can be fetched.");
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("That host is not reachable from here.");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("That host resolves to a private address.");
  }
  return url;
}

async function fetchMedia(raw: string) {
  let url = await assertPublicHttps(raw);
  let response: Response | null = null;
  for (let hop = 0; hop < 4; hop++) {
    response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(25_000) });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      url = await assertPublicHttps(new URL(location, url).toString());
      continue;
    }
    break;
  }
  if (!response || !response.ok) throw new Error(`Download failed (${response?.status ?? "no response"}).`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_UPLOAD_BYTES) throw new Error("File is larger than 50 MB.");
  const bytes = Buffer.from(await response.arrayBuffer());
  const mimeType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const filename = decodeURIComponent(url.pathname.split("/").pop() || "media");
  return { bytes, mimeType, filename };
}

// Clients holding an older copy of the tool list send photos as a JSON
// string; accept that too.
const parseJsonString = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const photosSchema = z.preprocess(
  parseJsonString,
  z
  .array(
    z.object({
      name: z.string().regex(/^[a-z0-9_-]{1,40}$/i, "Use letters, numbers, - or _."),
      url: z.string().url().describe("Public https image: a list_media URL or a cdn.shopify.com product photo."),
    }),
  )
  .max(10)
  .optional()
  .describe('Photos to place in the SVG. Reference each one as <image href="photo:NAME" .../>.'),
);

async function loadPhotos(list: { name: string; url: string }[] | undefined): Promise<SvgPhoto[]> {
  const photos: SvgPhoto[] = [];
  for (const item of list ?? []) {
    const media = await fetchMedia(item.url);
    if (!media.mimeType.startsWith("image/")) {
      throw new RenderError(`photo:${item.name} is ${media.mimeType || "not an image"}. Use an image URL.`);
    }
    if (media.bytes.length > 25 * 1024 * 1024) throw new RenderError(`photo:${item.name} is larger than 25 MB.`);
    photos.push({ name: item.name, bytes: media.bytes });
  }
  return photos;
}

export function createMcpServer() {
  const server = new McpServer(
    { name: "ptg-social-desk", version: "1.0.0" },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    "get_brand_guide",
    {
      title: "Brand guide",
      description:
        "Preach the Gospel's voice, caption structure, hashtag sets, caption closers, posting slots, visual system, the fonts the renderer has, and a reference quote-card SVG. Read this before drafting.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const [templates, hashtagSets] = await Promise.all([
        prisma.captionTemplate.findMany({ orderBy: { name: "asc" } }),
        prisma.hashtagSet.findMany({ orderBy: { name: "asc" } }),
      ]);
      const guide = brandGuideText({ templates, hashtagSets });
      return {
        content: [
          { type: "text", text: guide },
          { type: "text", text: `Typographic tile (bone paper, Bodoni stack), the one non-photo layout in use, as SVG:\n\n${REFERENCE_QUOTE_CARD_SVG}` },
        ],
      };
    },
  );

  server.registerTool(
    "list_posts",
    {
      title: "List posts",
      description:
        "List posts on the calendar, newest scheduled first within the range. Dates are America/Chicago. Use includeUnscheduled to also see posts with no date.",
      inputSchema: {
        from: dateString.optional().describe("First day, inclusive."),
        to: dateString.optional().describe("Last day, inclusive."),
        status: z.array(z.enum(POST_STATUSES as [string, ...string[]])).optional(),
        includeUnscheduled: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ from, to, status, includeUnscheduled, limit }) => {
      const range =
        from || to
          ? rangeForDays([from ?? "2000-01-01", to ?? "2100-01-01"].filter(Boolean) as string[])
          : null;
      const scheduled = range ? { scheduledAt: { gte: range.start, lt: range.end } } : {};
      const where = {
        ...(status?.length ? { status: { in: status as PostStatus[] } } : {}),
        ...(includeUnscheduled
          ? { OR: [scheduled, { scheduledAt: null }] }
          : range
            ? scheduled
            : {}),
      };
      const posts = await prisma.post.findMany({
        where,
        include: { slides: true, media: { include: { asset: true } } },
        orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
        take: limit ?? 60,
      });
      return ok({ count: posts.length, posts: posts.map((post) => serializePost(post, false)) });
    },
  );

  server.registerTool(
    "list_media",
    {
      title: "List media library",
      description:
        "Photos and videos uploaded to the desk's Media page, newest first, with public URLs. Use these URLs in the photos list of render_graphic / add_graphic_to_post, or with add_media_from_url.",
      inputSchema: {
        search: z.string().max(100).optional().describe("Match against filename or alt text."),
        kind: z.enum(["image", "video", "all"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ search, kind, limit }) => {
      const assets = await prisma.asset.findMany({
        where: {
          url: { startsWith: "https://" },
          ...(kind === "image" ? { mimeType: { startsWith: "image/" } } : {}),
          ...(kind === "video" ? { mimeType: { startsWith: "video/" } } : {}),
          ...(search
            ? {
                OR: [
                  { filename: { contains: search, mode: "insensitive" as const } },
                  { alt: { contains: search, mode: "insensitive" as const } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit ?? 40,
        include: { posts: { select: { postId: true } } },
      });
      return ok({
        count: assets.length,
        media: assets.map((a) => ({
          assetId: a.id,
          url: a.url,
          filename: a.filename,
          mimeType: a.mimeType,
          alt: a.alt,
          width: a.width,
          height: a.height,
          usedOnPosts: a.posts.length,
          uploadedAt: a.createdAt.toISOString(),
        })),
      });
    },
  );

  server.registerTool(
    "get_post",
    {
      title: "Get post",
      description: "Full post: caption, hashtags, fields, slides, attached media, comments, and status.",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const post = await loadPost(id);
      if (!post) return fail("No post with that id.");
      return ok(serializePost(post, true));
    },
  );

  server.registerTool(
    "create_post",
    {
      title: "Create draft post",
      description:
        "Create a new post as a Draft. Give it a planned date and time (America/Chicago) so it lands on the calendar. Set submitForReview to send it straight to the owner's review queue. Drafts never publish.",
      inputSchema: {
        ...postFields,
        caption: postFields.caption.optional(),
        hashtags: postFields.hashtags.optional(),
        scheduledDate: postFields.scheduledDate.optional(),
        scheduledTime: postFields.scheduledTime.optional(),
        bibleReference: postFields.bibleReference.optional(),
        quoteText: postFields.quoteText.optional(),
        pillar: postFields.pillar.optional(),
        productTie: postFields.productTie.optional(),
        cta: postFields.cta.optional(),
        visualDirection: postFields.visualDirection.optional(),
        palette: postFields.palette.optional(),
        notes: postFields.notes.optional(),
        productionNotes: postFields.productionNotes.optional(),
        assetStatus: postFields.assetStatus.optional(),
        slides: postFields.slides.optional(),
        submitForReview: z.boolean().optional(),
      },
    },
    async ({ submitForReview, ...values }) => {
      const actor = await agentActor();
      const saved = await savePostAs(actor, null, inputFrom(null, values as PostFieldValues));
      if (!saved.ok) return fail(saved.error);
      if (submitForReview) {
        const status = await setPostStatusAs(actor, saved.id, "IN_REVIEW");
        if (!status.ok) return fail(`Created ${saved.id} but could not submit it: ${status.error}`);
      }
      const post = await loadPost(saved.id);
      return ok({ created: true, post: post ? serializePost(post, true) : { id: saved.id } });
    },
  );

  server.registerTool(
    "update_post",
    {
      title: "Update post",
      description:
        "Change any fields on a post. Only the fields you pass change. Set scheduledDate to \"\" to take it off the calendar. Approved or scheduled posts are protected: editing one sends it back to review, so it needs allowSendBackToReview.",
      inputSchema: {
        id: z.string().min(1),
        title: postFields.title.optional(),
        postType: postFields.postType.optional(),
        caption: postFields.caption.optional(),
        hashtags: postFields.hashtags.optional(),
        scheduledDate: z.union([dateString, z.literal("")]).optional(),
        scheduledTime: z.union([timeString, z.literal("")]).optional(),
        bibleReference: postFields.bibleReference.optional(),
        quoteText: postFields.quoteText.optional(),
        pillar: postFields.pillar.optional(),
        productTie: postFields.productTie.optional(),
        cta: postFields.cta.optional(),
        visualDirection: postFields.visualDirection.optional(),
        palette: postFields.palette.optional(),
        notes: postFields.notes.optional(),
        productionNotes: postFields.productionNotes.optional(),
        assetStatus: postFields.assetStatus.optional(),
        slides: postFields.slides.optional(),
        allowSendBackToReview: z.boolean().optional(),
      },
    },
    async ({ id, allowSendBackToReview, ...values }) => {
      const existing = await loadPost(id);
      if (!existing) return fail("No post with that id.");
      if (LOCKED.includes(existing.status) && !allowSendBackToReview) return fail(lockedMessage(existing));
      const actor = await agentActor();
      const saved = await savePostAs(actor, id, inputFrom(existing, values as PostFieldValues));
      if (!saved.ok) return fail(saved.error);
      const post = await loadPost(id);
      return ok({
        updated: true,
        sentBackToReview: saved.reverted,
        warning: saved.warning,
        post: post ? serializePost(post, true) : { id },
      });
    },
  );

  server.registerTool(
    "render_graphic",
    {
      title: "Preview graphic",
      description:
        "Render an SVG (viewBox 0 0 1080 1350) with the brand fonts and return a half-size preview image. Saves nothing. Use it to check a design before add_graphic_to_post. Photos go in the photos list and are referenced as href=\"photo:NAME\".",
      inputSchema: {
        svg: z.string().min(20).describe("A complete <svg> document. Fonts: see get_brand_guide."),
        photos: photosSchema,
      },
      annotations: { readOnlyHint: true },
    },
    async ({ svg, photos }) => {
      try {
        const preview = await renderSvg(svg, { width: 540, photos: await loadPhotos(photos) });
        return {
          content: [
            { type: "image", data: preview.jpeg.toString("base64"), mimeType: "image/jpeg" },
            { type: "text", text: `Preview ${preview.width}x${preview.height}. Full render is twice this size.` },
          ],
        };
      } catch (error) {
        if (error instanceof RenderError) return fail(error.message);
        return fail(`Render failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );

  server.registerTool(
    "add_graphic_to_post",
    {
      title: "Render and attach graphic",
      description:
        "Render an SVG at full size as a JPEG, upload it, and attach it to the post after any media already there (carousel order = attach order). Returns the asset id and a small preview.",
      inputSchema: {
        postId: z.string().min(1),
        svg: z.string().min(20),
        photos: photosSchema,
        filename: z.string().max(80).optional().describe("e.g. 'q23_john8-12.jpg'."),
        alt: z.string().max(300).describe("Alt text describing the graphic, including the verse."),
        allowSendBackToReview: z.boolean().optional(),
      },
    },
    async ({ postId, svg, photos, filename, alt, allowSendBackToReview }) => {
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) return fail("No post with that id.");
      if (post.status === "PUBLISHED") return fail("Published posts keep the media they went out with.");
      if (LOCKED.includes(post.status) && !allowSendBackToReview) return fail(lockedMessage(post));
      try {
        const loaded = await loadPhotos(photos);
        const full = await renderSvg(svg, { photos: loaded });
        const actor = await agentActor();
        const name = (filename || `${post.title}`).replace(/\.(png|jpe?g|svg)$/i, "") + ".jpg";
        const asset = await attachBytes(actor, postId, full.jpeg, name, "image/jpeg", alt, {
          width: full.width,
          height: full.height,
        });
        const preview = await renderSvg(svg, { width: 360, photos: loaded });
        return {
          content: [
            { type: "image", data: preview.jpeg.toString("base64"), mimeType: "image/jpeg" },
            {
              type: "text",
              text: JSON.stringify(
                { attached: true, assetId: asset.id, url: asset.url, storage: asset.storage, width: full.width, height: full.height },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        if (error instanceof RenderError) return fail(error.message);
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "add_media_from_url",
    {
      title: "Attach media from a URL",
      description:
        "Download a public https image (JPEG, PNG, WebP) or MP4 and attach it to the post, e.g. a product photo from the Shopify CDN or a finished Reel video.",
      inputSchema: {
        postId: z.string().min(1),
        url: z.string().url(),
        alt: z.string().max(300).optional(),
        allowSendBackToReview: z.boolean().optional(),
      },
    },
    async ({ postId, url, alt, allowSendBackToReview }) => {
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) return fail("No post with that id.");
      if (post.status === "PUBLISHED") return fail("Published posts keep the media they went out with.");
      if (LOCKED.includes(post.status) && !allowSendBackToReview) return fail(lockedMessage(post));
      try {
        const media = await fetchMedia(url);
        const actor = await agentActor();
        const asset = await attachBytes(actor, postId, media.bytes, media.filename, media.mimeType, alt ?? "");
        return ok({ attached: true, assetId: asset.id, url: asset.url, mimeType: asset.mimeType, storage: asset.storage });
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    "remove_media",
    {
      title: "Remove media from post",
      description: "Detach one media item from a post. The file stays in the library.",
      inputSchema: {
        postId: z.string().min(1),
        assetId: z.string().min(1),
        allowSendBackToReview: z.boolean().optional(),
      },
    },
    async ({ postId, assetId, allowSendBackToReview }) => {
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) return fail("No post with that id.");
      if (LOCKED.includes(post.status) && !allowSendBackToReview) return fail(lockedMessage(post));
      const actor = await agentActor();
      const result = await detachAssetAs(actor, postId, assetId);
      return result.ok ? ok({ removed: true }) : fail(result.error);
    },
  );

  server.registerTool(
    "submit_for_review",
    {
      title: "Submit for review",
      description:
        "Move a draft into In review so the owner can approve and schedule it. Check the caption, hashtags, date, and media first.",
      inputSchema: { id: z.string().min(1), note: z.string().max(4000).optional().describe("Optional comment for the owner.") },
    },
    async ({ id, note }) => {
      const post = await prisma.post.findUnique({ where: { id }, include: { media: true } });
      if (!post) return fail("No post with that id.");
      if (post.status !== "DRAFT" && post.status !== "FAILED") {
        return fail(`"${post.title}" is ${post.status.toLowerCase()}, not a draft.`);
      }
      const actor = await agentActor();
      if (note) {
        const comment = await addCommentAs(actor, id, note);
        if (!comment.ok) return fail(comment.error);
      }
      const result = await setPostStatusAs(actor, id, "IN_REVIEW");
      if (!result.ok) return fail(result.error);
      const warnings = [];
      if (!post.media.length && post.postType !== "REEL") warnings.push("No media attached yet.");
      if (!post.scheduledAt) warnings.push("No planned date yet.");
      return ok({ submitted: true, status: "IN_REVIEW", warnings, url: dashboardUrl(`/posts/${id}`) });
    },
  );

  server.registerTool(
    "add_comment",
    {
      title: "Comment on post",
      description: "Leave a comment on a post for the owner or team.",
      inputSchema: { postId: z.string().min(1), body: z.string().min(1).max(4000) },
    },
    async ({ postId, body }) => {
      const actor = await agentActor();
      const result = await addCommentAs(actor, postId, body);
      return result.ok ? ok({ commented: true }) : fail(result.error);
    },
  );

  server.registerTool(
    "delete_draft",
    {
      title: "Delete draft",
      description: "Delete a post that is still a Draft and was created through this connector. Anything else must be deleted in the dashboard.",
      inputSchema: { id: z.string().min(1) },
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      const actor = await agentActor();
      const post = await prisma.post.findUnique({ where: { id } });
      if (!post) return fail("No post with that id.");
      if (post.status !== "DRAFT") return fail(`"${post.title}" is ${post.status.toLowerCase()}. Only drafts can be deleted here.`);
      if (post.createdById !== actor.id) return fail("Only drafts created through this connector can be deleted here.");
      await prisma.post.delete({ where: { id } });
      await logActivity({
        userId: actor.id,
        action: "post.delete",
        entityType: "post",
        entityId: id,
        detail: `${actor.name} deleted the draft "${post.title}".`,
      });
      return ok({ deleted: true });
    },
  );

  return server;
}
