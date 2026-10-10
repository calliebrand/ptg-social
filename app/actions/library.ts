"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { canEdit } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

async function editor() {
  const user = await currentUser();
  if (!user || !canEdit(user.role)) return null;
  return user;
}

async function touchApproval(postId: string, userName: string) {
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

export async function attachAsset(postId: string, assetId: string) {
  const user = await editor();
  if (!user) return { ok: false as const, error: "You cannot edit media." };
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
  await touchApproval(postId, user.name);
  await logActivity({
    userId: user.id,
    action: "asset.attach",
    entityType: "post",
    entityId: postId,
    detail: `${user.name} attached ${asset.filename} to "${post.title}".`,
  });
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/library");
  revalidatePath("/calendar");
  return { ok: true as const };
}

export async function detachAsset(postId: string, assetId: string) {
  const user = await editor();
  if (!user) return { ok: false as const, error: "You cannot edit media." };
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { ok: false as const, error: "That post is gone." };
  if (post.status === "PUBLISHED") {
    return { ok: false as const, error: "Published posts keep the media they went out with." };
  }
  await prisma.postAsset.deleteMany({ where: { postId, assetId } });
  await touchApproval(postId, user.name);
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/library");
  revalidatePath("/calendar");
  return { ok: true as const };
}

export async function moveAsset(postId: string, assetId: string, direction: "up" | "down") {
  const user = await editor();
  if (!user) return { ok: false as const, error: "You cannot edit media." };
  const items = await prisma.postAsset.findMany({
    where: { postId },
    orderBy: { position: "asc" },
  });
  const index = items.findIndex((item) => item.assetId === assetId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= items.length) return { ok: true as const };
  const current = items[index];
  const other = items[swapWith];
  await prisma.$transaction([
    prisma.postAsset.update({ where: { id: current.id }, data: { position: other.position } }),
    prisma.postAsset.update({ where: { id: other.id }, data: { position: current.position } }),
  ]);
  await touchApproval(postId, user.name);
  revalidatePath(`/posts/${postId}`);
  return { ok: true as const };
}

export async function deleteAsset(formData: FormData) {
  const user = await editor();
  if (!user) return;
  const id = String(formData.get("id") || "");
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return;
  await prisma.asset.delete({ where: { id } });
  await logActivity({
    userId: user.id,
    action: "asset.delete",
    entityType: "asset",
    entityId: id,
    detail: `${user.name} removed ${asset.filename} from the library.`,
  });
  revalidatePath("/library");
  revalidatePath("/calendar");
  revalidatePath("/posts");
}

export async function updateAssetAlt(id: string, alt: string) {
  const user = await editor();
  if (!user) return { ok: false as const, error: "You cannot edit media." };
  await prisma.asset.update({ where: { id }, data: { alt: alt.slice(0, 300) } });
  revalidatePath("/library");
  return { ok: true as const };
}
