"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { canApprove, canEdit } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { postInputSchema, type PostInput } from "@/lib/validators";
import { zonedDateTime } from "@/lib/time";
import { captionStats } from "@/lib/caption";
import { publishDuePosts } from "@/lib/instagram";

function revalidatePost(id?: string) {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/posts");
  revalidatePath("/activity");
  revalidatePath("/library");
  if (id) revalidatePath(`/posts/${id}`);
}

async function editor() {
  const user = await currentUser();
  if (!user) return { user: null, error: "Sign in again." as const };
  if (!canEdit(user.role)) return { user, error: "Viewers can look, not edit." as const };
  return { user, error: null };
}

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

export async function savePost(id: string | null, raw: PostInput) {
  const gate = await editor();
  if (!gate.user || gate.error) return { ok: false as const, error: gate.error || "Forbidden" };

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
        createdById: gate.user.id,
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
      userId: gate.user.id,
      action: "post.create",
      entityType: "post",
      entityId: created.id,
      detail: `${gate.user.name} drafted "${created.title}".`,
    });
    revalidatePost(created.id);
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
    userId: gate.user.id,
    action: revert ? "post.revise" : "post.update",
    entityType: "post",
    entityId: id,
    detail: revert
      ? `${gate.user.name} edited "${input.title}" and sent it back to review.`
      : `${gate.user.name} updated "${input.title}".`,
  });
  revalidatePost(id);
  const stats = captionStats(input.caption, input.hashtags);
  const warning = stats.overCharacters
    ? `Saved. The caption is over Instagram's ${2200} character limit.`
    : stats.overHashtags
      ? "Saved. More than 30 hashtags will be rejected at publish time."
      : null;
  return { ok: true as const, id, reverted: revert, warning };
}

export async function setPostStatus(id: string, status: PostStatus) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "Sign in again." };
  if (!canEdit(user.role)) return { ok: false as const, error: "Viewers cannot change status." };

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { ok: false as const, error: "That post is gone." };
  if (post.status === "PUBLISHED") {
    return { ok: false as const, error: "This already published." };
  }

  const needsApprover = status === "APPROVED" || status === "SCHEDULED" || status === "PUBLISHED";
  if (needsApprover && !canApprove(user.role)) {
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
      ? { approvedById: user.id, approvedAt: new Date(), publishError: null }
      : status === "IN_REVIEW" || status === "DRAFT"
        ? { approvedById: null, approvedAt: null }
        : {};

  await prisma.post.update({
    where: { id },
    data: { status, ...approval },
  });
  await logActivity({
    userId: user.id,
    action: "post.status",
    entityType: "post",
    entityId: id,
    detail: `${user.name} set "${post.title}" to ${status.replaceAll("_", " ").toLowerCase()}.`,
  });
  revalidatePost(id);
  return { ok: true as const };
}

export async function reschedulePost(id: string, day: string | null) {
  const gate = await editor();
  if (!gate.user || gate.error) return { ok: false as const, error: gate.error || "Forbidden" };
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { ok: false as const, error: "That post is gone." };
  if (post.status === "PUBLISHED") {
    return { ok: false as const, error: "Published posts cannot move." };
  }
  if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return { ok: false as const, error: "Bad date." };
  }

  const { moveToChicagoDay } = await import("@/lib/time");
  const scheduledAt = day ? moveToChicagoDay(post.scheduledAt, day) : null;
  await prisma.post.update({ where: { id }, data: { scheduledAt } });
  await logActivity({
    userId: gate.user.id,
    action: "post.reschedule",
    entityType: "post",
    entityId: id,
    detail: day
      ? `${gate.user.name} moved "${post.title}" to ${day} (America/Chicago).`
      : `${gate.user.name} cleared the date on "${post.title}".`,
  });
  revalidatePost(id);
  return { ok: true as const, scheduledAt: scheduledAt?.toISOString() ?? null };
}

export async function duplicatePost(formData: FormData) {
  const gate = await editor();
  if (!gate.user || gate.error) redirect("/posts?error=forbidden");
  const id = String(formData.get("id") || "");
  const post = await prisma.post.findUnique({
    where: { id },
    include: { media: true, slides: { orderBy: { position: "asc" } } },
  });
  if (!post) redirect("/posts");
  const copy = await prisma.post.create({
    data: {
      title: `${post.title} (copy)`,
      caption: post.caption,
      hashtags: post.hashtags,
      postType: post.postType,
      status: "DRAFT",
      scheduledAt: null,
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
      createdById: gate.user.id,
      media: {
        create: post.media.map((item) => ({ assetId: item.assetId, position: item.position })),
      },
      slides: {
        create: post.slides.map((slide) => ({
          position: slide.position,
          heading: slide.heading,
          body: slide.body,
        })),
      },
    },
  });
  await logActivity({
    userId: gate.user.id,
    action: "post.duplicate",
    entityType: "post",
    entityId: copy.id,
    detail: `${gate.user.name} duplicated "${post.title}".`,
  });
  revalidatePost(copy.id);
  redirect(`/posts/${copy.id}`);
}

export async function deletePost(formData: FormData) {
  const gate = await editor();
  if (!gate.user || gate.error) redirect("/posts?error=forbidden");
  const id = String(formData.get("id") || "");
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) redirect("/posts");
  if (post.status === "PUBLISHED" && !canApprove(gate.user.role)) {
    redirect(`/posts/${id}?error=published`);
  }
  await prisma.post.delete({ where: { id } });
  await logActivity({
    userId: gate.user.id,
    action: "post.delete",
    entityType: "post",
    entityId: id,
    detail: `${gate.user.name} deleted "${post.title}".`,
  });
  revalidatePost();
  redirect("/posts");
}

export async function addComment(postId: string, body: string) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "Sign in again." };
  if (!canEdit(user.role)) return { ok: false as const, error: "Viewers cannot comment." };
  const text = body.trim();
  if (!text) return { ok: false as const, error: "Write a note first." };
  if (text.length > 4000) return { ok: false as const, error: "Keep the note under 4,000 characters." };
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { ok: false as const, error: "That post is gone." };
  await prisma.comment.create({
    data: {
      postId,
      userId: user.id,
      authorName: user.name,
      authorRole: user.role,
      body: text,
    },
  });
  await logActivity({
    userId: user.id,
    action: "post.comment",
    entityType: "post",
    entityId: postId,
    detail: `${user.name} commented on "${post.title}".`,
  });
  revalidatePost(postId);
  return { ok: true as const };
}

export async function retryPublish(id: string) {
  const user = await currentUser();
  if (!user || !canApprove(user.role)) {
    return { ok: false as const, error: "Only an owner or admin can retry a publish." };
  }
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { ok: false as const, error: "That post is gone." };
  if (!post.approvedById) {
    return { ok: false as const, error: "Approve the post before it can publish." };
  }
  const scheduledAt =
    post.scheduledAt && post.scheduledAt.getTime() > Date.now() ? post.scheduledAt : new Date();
  await prisma.post.update({
    where: { id },
    data: { status: "SCHEDULED", scheduledAt, publishError: null, publishAttempts: 0 },
  });
  const results = await publishDuePosts();
  revalidatePost(id);
  const mine = results.find((item) => item.id === id);
  return { ok: true as const, result: mine?.result ?? "queued" };
}

export async function publishDueNow() {
  const user = await currentUser();
  if (!user || !canApprove(user.role)) {
    return { ok: false as const, error: "Only an owner or admin can run the publisher." };
  }
  const results = await publishDuePosts();
  await logActivity({
    userId: user.id,
    action: "publish.run",
    entityType: "instagram",
    detail: results.length
      ? `${user.name} ran the publisher: ${results.map((item) => `${item.title} (${item.result})`).join("; ")}`
      : `${user.name} ran the publisher. Nothing was due.`,
  });
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/posts");
  revalidatePath("/settings");
  revalidatePath("/activity");
  return { ok: true as const, results };
}
