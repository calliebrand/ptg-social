import type { PostStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canApprove, canEdit } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { postInputSchema, type PostInput } from "@/lib/validators";
import { zonedDateTime } from "@/lib/time";
import { captionStats } from "@/lib/caption";

/**
 * Post rules shared by the dashboard's server actions and the MCP endpoint.
 * Every function takes the acting user explicitly and applies the same role
 * checks, so an Editor connected through MCP can do exactly what an Editor
 * can do in the browser and nothing more.
 */
export type Actor = { id: string; name: string; role: Role };

function scheduleFromInput(input: PostInput) {
  if (!input.scheduledDate && !input.scheduledTime) return { date: null as Date | null, error: null };
  if (!input.scheduledDate) return { date: null, error: "Pick a date to go with that time." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledDate)) {
    return { date: null, error: "Use a real date." };
  }
  const time = input.scheduledTime || "09:00";
  if (!/^\d{2}:\d{2}$/.test(time)) return { date: null, error: "Use a 24-hour time." };
  return { date: zonedDateTime(input.scheduledDate, time), error: null };
}

function slidesChanged(
  existing: { heading: string; body: string }[],
  next: { heading: string; body: string }[],
) {
  if (existing.length !== next.length) return true;
  return existing.some(
    (slide, index) =>
      slide.heading !== next[index].heading || slide.body !== next[index].body,
  );
}

export async function savePostAs(actor: Actor, id: string | null, raw: PostInput) {
  if (!canEdit(actor.role)) return { ok: false as const, error: "Viewers can look, not edit." };

  const parsed = postInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "Check the form." };
  }
  const input = parsed.data;
  const schedule = scheduleFromInput(input);
  if (schedule.error) return { ok: false as const, error: schedule.error };

  const data = {
    title: input.title,
    caption: input.caption,
    hashtags: input.hashtags,
    postType: input.postType,
    scheduledAt: schedule.date,
    notes: input.notes,
    bibleReference: input.bibleReference,
    quoteText: input.quoteText,
    pillar: input.pillar,
    productTie: input.productTie,
    visualDirection: input.visualDirection,
    palette: input.palette,
    productionNotes: input.productionNotes,
    cta: input.cta,
    assetStatus: input.assetStatus,
  };

  if (!id) {
    const created = await prisma.post.create({
      data: {
        ...data,
        status: "DRAFT",
        createdById: actor.id,
        slides: {
          create: input.slides.map((slide, position) => ({
            position,
            heading: slide.heading,
            body: slide.body,
          })),
        },
      },
    });
    await logActivity({
      userId: actor.id,
      action: "post.create",
      entityType: "post",
      entityId: created.id,
      detail: `${actor.name} drafted "${created.title}".`,
    });
    return { ok: true as const, id: created.id, reverted: false, warning: null };
  }

  const existing = await prisma.post.findUnique({
    where: { id },
    include: { slides: { orderBy: { position: "asc" } } },
  });
  if (!existing) return { ok: false as const, error: "That post is gone." };
  if (existing.status === "PUBLISHED") {
    return { ok: false as const, error: "Published posts stay as they went live. Duplicate it to make a new one." };
  }

  const contentTouched =
    existing.title !== data.title ||
    existing.caption !== data.caption ||
    existing.hashtags !== data.hashtags ||
    existing.postType !== data.postType ||
    existing.notes !== data.notes ||
    existing.bibleReference !== data.bibleReference ||
    existing.quoteText !== data.quoteText ||
    existing.pillar !== data.pillar ||
    existing.productTie !== data.productTie ||
    existing.visualDirection !== data.visualDirection ||
    existing.palette !== data.palette ||
    existing.productionNotes !== data.productionNotes ||
    existing.cta !== data.cta ||
    existing.assetStatus !== data.assetStatus ||
    slidesChanged(existing.slides, input.slides);

  const locked = existing.status === "APPROVED" || existing.status === "SCHEDULED";
  const revert = contentTouched && locked;

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id },
      data: {
        ...data,
        ...(revert
          ? { status: "IN_REVIEW", approvedById: null, approvedAt: null, publishError: null, publishAttempts: 0 }
          : {}),
      },
    });
    await tx.slide.deleteMany({ where: { postId: id } });
    if (input.slides.length) {
      await tx.slide.createMany({
        data: input.slides.map((slide, position) => ({
          postId: id,
          position,
          heading: slide.heading,
          body: slide.body,
        })),
      });
    }
  });

  await logActivity({
    userId: actor.id,
    action: revert ? "post.revise" : "post.update",
    entityType: "post",
    entityId: id,
    detail: revert
      ? `${actor.name} edited "${input.title}" and sent it back to review.`
      : `${actor.name} updated "${input.title}".`,
  });
  const stats = captionStats(input.caption, input.hashtags);
  const warning = stats.overCharacters
    ? `Saved. The caption is over Instagram's ${2200} character limit.`
    : stats.overHashtags
      ? "Saved. More than 30 hashtags will be rejected at publish time."
      : null;
  return { ok: true as const, id, reverted: revert, warning };
}

export async function setPostStatusAs(actor: Actor, id: string, status: PostStatus) {
  if (!canEdit(actor.role)) return { ok: false as const, error: "Viewers cannot change status." };

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { ok: false as const, error: "That post is gone." };
  if (post.status === "PUBLISHED") {
    return { ok: false as const, error: "This already published." };
  }

  const needsApprover = status === "APPROVED" || status === "SCHEDULED" || status === "PUBLISHED";
  if (needsApprover && !canApprove(actor.role)) {
    return { ok: false as const, error: "Only an owner or admin can approve or schedule." };
  }
  if (status === "SCHEDULED" && !post.scheduledAt) {
    return { ok: false as const, error: "Set a date and time before scheduling." };
  }
  if (status === "SCHEDULED" && post.scheduledAt && post.scheduledAt.getTime() < Date.now() - 60_000) {
    return { ok: false as const, error: "That time is already past. Pick a future slot, or use Retry publish." };
  }

  const approval =
    status === "APPROVED" || status === "SCHEDULED"
      ? { approvedById: actor.id, approvedAt: new Date(), publishError: null }
      : status === "IN_REVIEW" || status === "DRAFT"
        ? { approvedById: null, approvedAt: null }
        : {};

  await prisma.post.update({
    where: { id },
    data: { status, ...approval },
  });
  await logActivity({
    userId: actor.id,
    action: "post.status",
    entityType: "post",
    entityId: id,
    detail: `${actor.name} set "${post.title}" to ${status.replaceAll("_", " ").toLowerCase()}.`,
  });
  return { ok: true as const };
}

export async function addCommentAs(actor: Actor, postId: string, body: string) {
  if (!canEdit(actor.role)) return { ok: false as const, error: "Viewers cannot comment." };
  const text = body.trim();
  if (!text) return { ok: false as const, error: "Write a note first." };
  if (text.length > 4000) return { ok: false as const, error: "Keep the note under 4,000 characters." };
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { ok: false as const, error: "That post is gone." };
  await prisma.comment.create({
    data: {
      postId,
      userId: actor.id,
      authorName: actor.name,
      authorRole: actor.role,
      body: text,
    },
  });
  await logActivity({
    userId: actor.id,
    action: "post.comment",
    entityType: "post",
    entityId: postId,
    detail: `${actor.name} commented on "${post.title}".`,
  });
  return { ok: true as const };
}

/** Changing media on an approved or scheduled post sends it back to review. */
export async function touchApproval(postId: string, userName: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return;
  if (post.status === "APPROVED" || post.status === "SCHEDULED") {
    await prisma.post.update({
      where: { id: postId },
      data: { status: "IN_REVIEW", approvedById: null, approvedAt: null },
    });
    await logActivity({
      action: "post.revise",
      entityType: "post",
      entityId: postId,
      detail: `${userName} changed media on "${post.title}", so it went back to review.`,
    });
  }
}

export async function attachAssetAs(actor: Actor, postId: string, assetId: string) {
  if (!canEdit(actor.role)) return { ok: false as const, error: "You cannot edit media." };
  const [post, asset] = await Promise.all([
    prisma.post.findUnique({ where: { id: postId } }),
    prisma.asset.findUnique({ where: { id: assetId } }),
  ]);
  if (!post || !asset) return { ok: false as const, error: "Missing post or asset." };
  if (post.status === "PUBLISHED") {
    return { ok: false as const, error: "Published posts keep the media they went out with." };
  }
  const count = await prisma.postAsset.count({ where: { postId } });
  await prisma.postAsset.upsert({
    where: { postId_assetId: { postId, assetId } },
    update: {},
    create: { postId, assetId, position: count },
  });
  await touchApproval(postId, actor.name);
  await logActivity({
    userId: actor.id,
    action: "asset.attach",
    entityType: "post",
    entityId: postId,
    detail: `${actor.name} attached ${asset.filename} to "${post.title}".`,
  });
  return { ok: true as const };
}

export async function detachAssetAs(actor: Actor, postId: string, assetId: string) {
  if (!canEdit(actor.role)) return { ok: false as const, error: "You cannot edit media." };
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { ok: false as const, error: "That post is gone." };
  if (post.status === "PUBLISHED") {
    return { ok: false as const, error: "Published posts keep the media they went out with." };
  }
  await prisma.postAsset.deleteMany({ where: { postId, assetId } });
  await touchApproval(postId, actor.name);
  return { ok: true as const };
}
