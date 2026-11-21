"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { canApprove, canEdit } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import type { PostInput } from "@/lib/validators";
import { addCommentAs, savePostAs, setPostStatusAs } from "@/lib/post-service";
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

export async function savePost(id: string | null, raw: PostInput) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "Sign in again." };
  const result = await savePostAs(user, id, raw);
  if (result.ok) revalidatePost(result.id);
  return result;
}

export async function setPostStatus(id: string, status: PostStatus) {
  const user = await currentUser();
  if (!user) return { ok: false as const, error: "Sign in again." };
  const result = await setPostStatusAs(user, id, status);
  if (result.ok) revalidatePost(id);
  return result;
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
  const result = await addCommentAs(user, postId, body);
  if (result.ok) revalidatePost(postId);
  return result;
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
