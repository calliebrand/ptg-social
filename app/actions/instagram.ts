"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { canApprove } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function disconnectInstagram() {
  const user = await currentUser();
  if (!user || !canApprove(user.role)) return { error: "Only an owner or admin can disconnect Instagram." };
  await prisma.instagramAccount.deleteMany();
  await logActivity({
    userId: user.id,
    action: "instagram.disconnect",
    entityType: "instagram",
    detail: `${user.name} disconnected Instagram.`,
  });
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true as const };
}
