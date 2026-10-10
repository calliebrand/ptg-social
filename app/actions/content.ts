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

export async function createCaptionTemplate(formData: FormData) {
  const user = await editor();
  if (!user) return;
  const name = String(formData.get("name") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!name || !body) return;
  await prisma.captionTemplate.create({
    data: { name, body, createdById: user.id },
  });
  await logActivity({
    userId: user.id,
    action: "template.create",
    entityType: "template",
    detail: `${user.name} saved caption template "${name}".`,
  });
  revalidatePath("/templates");
  revalidatePath("/posts");
}

export async function deleteCaptionTemplate(formData: FormData) {
  const user = await editor();
  if (!user) return;
  const id = String(formData.get("id") || "");
  const template = await prisma.captionTemplate.findUnique({ where: { id } });
  if (!template) return;
  await prisma.captionTemplate.delete({ where: { id } });
  await logActivity({
    userId: user.id,
    action: "template.delete",
    entityType: "template",
    detail: `${user.name} removed caption template "${template.name}".`,
  });
  revalidatePath("/templates");
}

export async function createHashtagSet(formData: FormData) {
  const user = await editor();
  if (!user) return;
  const name = String(formData.get("name") || "").trim();
  const tags = String(formData.get("tags") || "").trim();
  if (!name || !tags) return;
  await prisma.hashtagSet.create({
    data: { name, tags, createdById: user.id },
  });
  await logActivity({
    userId: user.id,
    action: "hashtags.create",
    entityType: "hashtagSet",
    detail: `${user.name} saved hashtag set "${name}".`,
  });
  revalidatePath("/templates");
}

export async function deleteHashtagSet(formData: FormData) {
  const user = await editor();
  if (!user) return;
  const id = String(formData.get("id") || "");
  const set = await prisma.hashtagSet.findUnique({ where: { id } });
  if (!set) return;
  await prisma.hashtagSet.delete({ where: { id } });
  await logActivity({
    userId: user.id,
    action: "hashtags.delete",
    entityType: "hashtagSet",
    detail: `${user.name} removed hashtag set "${set.name}".`,
  });
  revalidatePath("/templates");
}
