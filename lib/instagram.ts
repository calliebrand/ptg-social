import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { logActivity } from "@/lib/activity";
import { captionStats } from "@/lib/caption";
import { publishBlockReason } from "@/lib/posts";
import type { Asset, Post, PostAsset } from "@prisma/client";

const DEFAULT_VERSION = "v22.0";

export function graphVersion() {
  return process.env.META_GRAPH_VERSION || DEFAULT_VERSION;
}

export function graphBase() {
  return `https://graph.facebook.com/${graphVersion()}`;
}

export function instagramUsername() {
  return (process.env.INSTAGRAM_USERNAME || "preachthegospel.store").replace(/^@/, "");
}

export function redirectUri() {
  if (process.env.META_REDIRECT_URI) return process.env.META_REDIRECT_URI;
  const base = process.env.AUTH_URL?.replace(/\/$/, "");
  if (!base) throw new Error("Set AUTH_URL or META_REDIRECT_URI.");
  return `${base}/api/instagram/callback`;
}

export const IG_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "business_management",
].join(",");

export function metaConfigured() {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

type GraphError = { message?: string; code?: number; error_subcode?: number };

export class InstagramError extends Error {
  retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

async function graphFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: GraphError;
  };
  if (!response.ok || data.error) {
    const message = data.error?.message || `Instagram request failed (${response.status}).`;
    const code = data.error?.code;
    const retryable = response.status >= 500 || code === 4 || code === 17 || code === 32 || code === 613;
    throw new InstagramError(message, retryable);
  }
  return data;
}

export async function exchangeCode(code: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    redirect_uri: redirectUri(),
    code,
  });
  const shortLived = await graphFetch<{ access_token: string }>(
    `${graphBase()}/oauth/access_token?${params}`,
  );
  const longParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    fb_exchange_token: shortLived.access_token,
  });
  return graphFetch<{ access_token: string; expires_in?: number }>(
    `${graphBase()}/oauth/access_token?${longParams}`,
  );
}

type PageAccount = {
  id: string;
  name?: string;
  access_token: string;
  instagram_business_account?: { id: string };
};

export async function findInstagramAccount(userToken: string) {
  const pages = await graphFetch<{ data: PageAccount[] }>(
    `${graphBase()}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(userToken)}`,
  );
  const withIg = (pages.data || []).filter((page) => page.instagram_business_account?.id);
  if (!withIg.length) {
    throw new InstagramError(
      "No Facebook Page with a linked Instagram professional account was found. @preachthegospel.store must be a Business or Creator account connected to a Page you admin.",
    );
  }
  const target = instagramUsername().toLowerCase();
  const detailed = await Promise.all(
    withIg.map(async (page) => {
      const igId = page.instagram_business_account!.id;
      const profile = await graphFetch<{ id: string; username?: string; name?: string }>(
        `${graphBase()}/${igId}?fields=id,username,name&access_token=${encodeURIComponent(page.access_token)}`,
      );
      return { page, profile };
    }),
  );
  const match =
    detailed.find((item) => item.profile.username?.toLowerCase() === target) ?? detailed[0];
  return {
    igUserId: match.profile.id,
    username: match.profile.username || match.profile.id,
    pageId: match.page.id,
    pageName: match.page.name || "",
    pageAccessToken: match.page.access_token,
    matchedTarget: match.profile.username?.toLowerCase() === target,
  };
}

export async function saveConnection(
  account: Awaited<ReturnType<typeof findInstagramAccount>>,
  userId: string,
  expiresIn?: number,
) {
  await prisma.instagramAccount.deleteMany();
  return prisma.instagramAccount.create({
    data: {
      igUserId: account.igUserId,
      username: account.username,
      pageId: account.pageId,
      pageName: account.pageName,
      accessTokenEnc: encryptSecret(account.pageAccessToken),
      tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      connectedById: userId,
    },
  });
}

async function getConnection() {
  return prisma.instagramAccount.findFirst({ orderBy: { createdAt: "desc" } });
}

type PostWithMedia = Post & {
  media: (PostAsset & { asset: Asset })[];
  approvedBy: { role: string } | null;
};

function absoluteHttps(url: string) {
  if (url.startsWith("https://")) return url;
  throw new InstagramError(
    `Media must be a public https URL from Vercel Blob before Instagram can fetch it. "${url}" is only on this server.`,
  );
}

async function ensureJpegUrl(asset: Asset) {
  const url = absoluteHttps(asset.url);
  const isJpeg = asset.mimeType === "image/jpeg" || /\.jpe?g($|\?)/i.test(url);
  if (isJpeg) return url;
  if (!asset.mimeType.startsWith("image/")) {
    throw new InstagramError("This file is not an image Instagram can publish.");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new InstagramError(
      "Instagram image posts must be JPEG. Set BLOB_READ_WRITE_TOKEN so the publisher can convert and re-host this file.",
    );
  }
  const response = await fetch(url);
  if (!response.ok) throw new InstagramError("Could not download the asset for JPEG conversion.");
  const input = Buffer.from(await response.arrayBuffer());
  const sharp = (await import("sharp")).default;
  const jpeg = await sharp(input).jpeg({ quality: 90 }).toBuffer();
  const { put } = await import("@vercel/blob");
  const blob = await put(`ptg/publish/${asset.id}.jpg`, jpeg, {
    access: "public",
    contentType: "image/jpeg",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

async function waitForContainer(containerId: string, token: string) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const status = await graphFetch<{ status_code?: string; status?: string }>(
      `${graphBase()}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
    );
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new InstagramError(status.status || "Instagram media container failed.");
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new InstagramError("Instagram is still processing the media. The next cron run will retry.", true);
}

async function createContainer(igUserId: string, token: string, body: URLSearchParams) {
  body.set("access_token", token);
  const created = await graphFetch<{ id: string }>(`${graphBase()}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return created.id;
}

async function publishContainer(igUserId: string, token: string, creationId: string) {
  const body = new URLSearchParams({ creation_id: creationId, access_token: token });
  const published = await graphFetch<{ id: string }>(`${graphBase()}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  let permalink: string | null = null;
  try {
    const media = await graphFetch<{ permalink?: string }>(
      `${graphBase()}/${published.id}?fields=permalink&access_token=${encodeURIComponent(token)}`,
    );
    permalink = media.permalink ?? null;
  } catch {
    permalink = null;
  }
  return { id: published.id, permalink };
}

async function publishPost(post: PostWithMedia, igUserId: string, token: string) {
  const stats = captionStats(post.caption, post.hashtags);
  if (stats.overCharacters) {
    throw new InstagramError(`Caption is ${stats.characters} characters. Instagram allows ${2200}.`);
  }
  if (stats.overHashtags) {
    throw new InstagramError(`Caption has ${stats.hashtagCount} hashtags. Instagram allows 30.`);
  }
  const assets = [...post.media].sort((a, b) => a.position - b.position).map((item) => item.asset);

  if (post.postType === "REEL") {
    const video = assets.find((asset) => asset.mimeType.startsWith("video/"));
    if (!video) throw new InstagramError("Add an MP4 before this Reel can publish.");
    const videoUrl = absoluteHttps(video.url);
    const container = await createContainer(
      igUserId,
      token,
      new URLSearchParams({
        media_type: "REELS",
        video_url: videoUrl,
        caption: stats.combined,
        share_to_feed: "true",
      }),
    );
    await waitForContainer(container, token);
    return publishContainer(igUserId, token, container);
  }

  if (post.postType === "CAROUSEL") {
    if (assets.length < 2 || assets.length > 10) {
      throw new InstagramError("A carousel needs between 2 and 10 images.");
    }
    const children: string[] = [];
    for (const asset of assets) {
      if (!asset.mimeType.startsWith("image/")) {
        throw new InstagramError("Carousel slides must be images. Put the Reel video on a Reel post.");
      }
      const imageUrl = await ensureJpegUrl(asset);
      const child = await createContainer(
        igUserId,
        token,
        new URLSearchParams({
          image_url: imageUrl,
          is_carousel_item: "true",
        }),
      );
      await waitForContainer(child, token);
      children.push(child);
    }
    const parent = await createContainer(
      igUserId,
      token,
      new URLSearchParams({
        media_type: "CAROUSEL",
        children: children.join(","),
        caption: stats.combined,
      }),
    );
    await waitForContainer(parent, token);
    return publishContainer(igUserId, token, parent);
  }

  const image = assets.find((asset) => asset.mimeType.startsWith("image/"));
  if (!image) throw new InstagramError("Add an image before this post can publish.");
  const imageUrl = await ensureJpegUrl(image);
  const container = await createContainer(
    igUserId,
    token,
    new URLSearchParams({
      image_url: imageUrl,
      caption: stats.combined,
    }),
  );
  await waitForContainer(container, token);
  return publishContainer(igUserId, token, container);
}

async function markPublished(postId: string, igMediaId: string, permalink: string | null) {
  await prisma.post.update({
    where: { id: postId },
    data: {
      status: "PUBLISHED",
      igMediaId,
      igPermalink: permalink,
      publishError: null,
      publishedAt: new Date(),
    },
  });
}

async function markFailed(postId: string, message: string) {
  await prisma.post.update({
    where: { id: postId },
    data: { status: "FAILED", publishError: message.slice(0, 2000) },
  });
}

async function markRetry(postId: string, attempts: number, message: string) {
  await prisma.post.update({
    where: { id: postId },
    data: {
      publishAttempts: attempts,
      publishError: message.slice(0, 2000),
    },
  });
}

export async function publishDuePosts() {
  const now = new Date();
  const due = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      approvedById: { not: null },
    },
    include: {
      media: { include: { asset: true } },
      approvedBy: { select: { role: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 8,
  });

  const results: { id: string; title: string; result: string }[] = [];
  if (!due.length) return results;

  const dryRun = process.env.INSTAGRAM_PUBLISH_MODE === "dry-run";
  const connection = dryRun ? null : await getConnection();

  for (const post of due) {
    const reason = publishBlockReason(
      {
        status: post.status,
        approvedById: post.approvedById,
        approverRole: post.approvedBy?.role ?? null,
        scheduledAt: post.scheduledAt,
      },
      now,
    );
    if (reason) {
      results.push({ id: post.id, title: post.title, result: `skipped: ${reason}` });
      continue;
    }

    if (dryRun) {
      await logActivity({
        action: "publish.dry_run",
        entityType: "post",
        entityId: post.id,
        detail: `Dry run kept "${post.title}" scheduled. Set INSTAGRAM_PUBLISH_MODE=live to post.`,
      });
      results.push({ id: post.id, title: post.title, result: "dry-run" });
      continue;
    }

    if (!connection) {
      results.push({
        id: post.id,
        title: post.title,
        result: "skipped: Instagram is not connected",
      });
      continue;
    }

    try {
      const token = decryptSecret(connection.accessTokenEnc);
      const published = await publishPost(post, connection.igUserId, token);
      await markPublished(post.id, published.id, published.permalink);
      await logActivity({
        action: "publish.live",
        entityType: "post",
        entityId: post.id,
        detail: `Published "${post.title}" to @${connection.username}.`,
      });
      results.push({ id: post.id, title: post.title, result: "published" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publish failed.";
      const retryable = error instanceof InstagramError && error.retryable;
      const attempts = post.publishAttempts + 1;
      if (retryable && attempts < 8) {
        await markRetry(post.id, attempts, message);
        results.push({ id: post.id, title: post.title, result: `retry: ${message}` });
      } else {
        await markFailed(post.id, message);
        await logActivity({
          action: "publish.failed",
          entityType: "post",
          entityId: post.id,
          detail: `"${post.title}" failed: ${message}`,
        });
        results.push({ id: post.id, title: post.title, result: `failed: ${message}` });
      }
    }
  }

  return results;
}

export type InsightMedia = {
  id: string;
  caption: string;
  mediaType: string;
  permalink: string;
  timestamp: string;
  likeCount: number | null;
  commentsCount: number | null;
  thumbnailUrl: string | null;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  views: number | null;
};

export async function loadInsights() {
  const connection = await getConnection();
  if (!connection) return { connected: false as const };
  const token = decryptSecret(connection.accessTokenEnc);
  const profile = await graphFetch<{
    username?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    profile_picture_url?: string;
  }>(
    `${graphBase()}/${connection.igUserId}?fields=username,followers_count,follows_count,media_count,profile_picture_url&access_token=${encodeURIComponent(token)}`,
  );
  const mediaResponse = await graphFetch<{
    data: {
      id: string;
      caption?: string;
      media_type?: string;
      permalink?: string;
      timestamp?: string;
      like_count?: number;
      comments_count?: number;
      thumbnail_url?: string;
      media_url?: string;
    }[];
  }>(
    `${graphBase()}/${connection.igUserId}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count,thumbnail_url,media_url&limit=12&access_token=${encodeURIComponent(token)}`,
  );

  const media: InsightMedia[] = await Promise.all(
    (mediaResponse.data || []).map(async (item) => {
      let reach: number | null = null;
      let saved: number | null = null;
      let shares: number | null = null;
      let views: number | null = null;
      try {
        const insights = await graphFetch<{
          data?: { name: string; values?: { value: number }[] }[];
        }>(
          `${graphBase()}/${item.id}/insights?metric=reach,saved,shares,views&access_token=${encodeURIComponent(token)}`,
        );
        for (const metric of insights.data || []) {
          const value = metric.values?.[0]?.value ?? null;
          if (metric.name === "reach") reach = value;
          if (metric.name === "saved") saved = value;
          if (metric.name === "shares") shares = value;
          if (metric.name === "views") views = value;
        }
      } catch {
        // Insights need instagram_manage_insights and a media age Meta accepts.
      }
      return {
        id: item.id,
        caption: item.caption || "",
        mediaType: item.media_type || "",
        permalink: item.permalink || "",
        timestamp: item.timestamp || "",
        likeCount: item.like_count ?? null,
        commentsCount: item.comments_count ?? null,
        thumbnailUrl: item.thumbnail_url || item.media_url || null,
        reach,
        saved,
        shares,
        views,
      };
    }),
  );

  return {
    connected: true as const,
    username: profile.username || connection.username,
    pageName: connection.pageName,
    followers: profile.followers_count ?? null,
    follows: profile.follows_count ?? null,
    mediaCount: profile.media_count ?? null,
    picture: profile.profile_picture_url || null,
    media,
  };
}
