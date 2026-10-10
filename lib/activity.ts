import { prisma } from "@/lib/db";

export async function logActivity(input: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: string;
}) {
  await prisma.activity.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      detail: input.detail ?? "",
    },
  });
}
