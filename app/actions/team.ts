"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { canAssignRole, canManageUsers } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

const ROLES: Role[] = ["OWNER", "ADMIN", "EDITOR", "VIEWER"];

function tempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let value = "ptg-";
  for (let i = 0; i < 10; i++) value += alphabet[Math.floor(Math.random() * alphabet.length)];
  return value;
}

export async function createUser(
  _prev: { error?: string; tempPassword?: string; email?: string } | null,
  formData: FormData,
) {
  const actor = await currentUser();
  if (!actor || !canManageUsers(actor.role)) return { error: "Only an owner or admin can add people." };
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "EDITOR") as Role;
  if (!name || !email.includes("@")) return { error: "Name and a real email are required." };
  if (!ROLES.includes(role) || !canAssignRole(actor.role, role)) {
    return { error: "You cannot assign that role." };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "That email is already on the desk." };
  const password = tempPassword();
  await prisma.user.create({
    data: {
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  await logActivity({
    userId: actor.id,
    action: "user.create",
    entityType: "user",
    detail: `${actor.name} added ${name} (${email}) as ${role.toLowerCase()}.`,
  });
  revalidatePath("/team");
  revalidatePath("/activity");
  return { tempPassword: password, email };
}

export async function updateUserRole(userId: string, role: Role) {
  const actor = await currentUser();
  if (!actor || !canManageUsers(actor.role)) return { error: "You cannot change roles." };
  if (!ROLES.includes(role) || !canAssignRole(actor.role, role)) {
    return { error: "You cannot assign that role." };
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "That person is not on the desk." };
  if (!canAssignRole(actor.role, target.role)) return { error: "You cannot change an owner." };
  if (target.role === "OWNER" && role !== "OWNER") {
    const owners = await prisma.user.count({ where: { role: "OWNER" } });
    if (owners <= 1) return { error: "Keep at least one owner." };
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await logActivity({
    userId: actor.id,
    action: "user.role",
    entityType: "user",
    entityId: userId,
    detail: `${actor.name} set ${target.name} to ${role.toLowerCase()}.`,
  });
  revalidatePath("/team");
  revalidatePath("/activity");
  return { ok: true as const };
}

export async function resetUserPassword(userId: string) {
  const actor = await currentUser();
  if (!actor || !canManageUsers(actor.role)) return { error: "You cannot reset passwords." };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "That person is not on the desk." };
  if (!canAssignRole(actor.role, target.role) && actor.id !== target.id) {
    return { error: "You cannot reset an owner password." };
  }
  const password = tempPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  await logActivity({
    userId: actor.id,
    action: "user.password",
    entityType: "user",
    entityId: userId,
    detail: `${actor.name} reset the password for ${target.name}.`,
  });
  revalidatePath("/activity");
  return { tempPassword: password, email: target.email };
}

export async function deleteUser(userId: string) {
  const actor = await currentUser();
  if (!actor || !canManageUsers(actor.role)) return { error: "You cannot remove people." };
  if (actor.id === userId) return { error: "You cannot remove yourself." };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "That person is already gone." };
  if (!canAssignRole(actor.role, target.role)) return { error: "You cannot remove an owner." };
  if (target.role === "OWNER") {
    const owners = await prisma.user.count({ where: { role: "OWNER" } });
    if (owners <= 1) return { error: "Keep at least one owner." };
  }
  await prisma.post.updateMany({
    where: { approvedById: userId, status: { in: ["APPROVED", "SCHEDULED"] } },
    data: { status: "IN_REVIEW", approvedById: null, approvedAt: null },
  });
  await prisma.user.delete({ where: { id: userId } });
  await logActivity({
    userId: actor.id,
    action: "user.delete",
    entityType: "user",
    entityId: userId,
    detail: `${actor.name} removed ${target.name}. Approved posts they signed returned to review.`,
  });
  revalidatePath("/team");
  revalidatePath("/posts");
  revalidatePath("/activity");
  return { ok: true as const };
}

export async function updateAccount(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  const name = String(formData.get("name") || "").trim();
  const currentPassword = String(formData.get("currentPassword") || "");
  const nextPassword = String(formData.get("nextPassword") || "");
  if (!name) return { error: "Name is required." };
  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user) return { error: "Account missing." };
  const data: { name: string; passwordHash?: string } = { name };
  if (nextPassword) {
    if (nextPassword.length < 8) return { error: "Use at least 8 characters." };
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return { error: "Current password does not match." };
    data.passwordHash = await bcrypt.hash(nextPassword, 10);
  }
  await prisma.user.update({ where: { id: actor.id }, data });
  await logActivity({
    userId: actor.id,
    action: "user.account",
    entityType: "user",
    entityId: actor.id,
    detail: `${name} updated their account.`,
  });
  revalidatePath("/account");
  return { ok: true };
}
