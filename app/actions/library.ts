"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { canEdit } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { attachAssetAs, detachAssetAs, touchApproval } from "@/lib/post-service";

async function editor() {
  const user = await currentUser();
  if (!user || !canEdit(user.role)) return null;
  return user;
}

export async function attachAsset(postId: string, assetId: string) {
  const user = await editor();
  if (!user) return { ok: false as const, error: "You cannot edit media." };
  const result = await attachAssetAs(user, postId, assetId);
  if (!result.ok) return result;
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/library");
  revalidatePath("/calendar");
  return result;
}

export async function detachAsset(postId: string, assetId: string) {
  const user = await editor();
  if (!user) return { ok: false as const, error: "You cannot edit media." };
  const result = await detachAssetAs(user, postId, assetId);
  if (!result.ok) return result;
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/library");
  revalidatePath("/calendar");
  return result;
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
