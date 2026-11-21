import { createHash, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/post-service";

/**
 * The MCP endpoint acts as one dashboard user. It is created as an Editor the
 * first time the endpoint is used, shows up on the Team page, and its drafts,
 * comments and uploads carry its name in the activity log. It cannot sign in:
 * its password is random and never stored anywhere.
 */

export const MIN_KEY_LENGTH = 32;

export function agentEmail() {
  return (process.env.MCP_AGENT_EMAIL || "claude@preachthegospel.store").toLowerCase();
}

export function agentName() {
  return process.env.MCP_AGENT_NAME || "Claude";
}

export function mcpKeyConfigured() {
  return (process.env.MCP_API_KEY || "").length >= MIN_KEY_LENGTH;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function mcpKeyMatches(candidate: string | null | undefined) {
  const expected = process.env.MCP_API_KEY || "";
  if (expected.length < MIN_KEY_LENGTH || !candidate) return false;
  return timingSafeEqual(digest(candidate), digest(expected));
}

export async function agentActor(): Promise<Actor> {
  const email = agentEmail();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { id: existing.id, name: existing.name, role: existing.role };
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const created = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: agentName(), role: "EDITOR", passwordHash },
  });
  return { id: created.id, name: created.name, role: created.role };
}
