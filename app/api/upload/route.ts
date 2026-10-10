import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { canEdit } from "@/lib/permissions";
import { storeUpload } from "@/lib/storage";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || !canEdit(user.role)) {
    return NextResponse.json({ error: "You cannot upload." }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const postId = String(form.get("postId") || "");
  const alt = String(form.get("alt") || "").slice(0, 300);
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  }

  try {
    const stored = await storeUpload(file);
    const asset = await prisma.asset.create({
      data: {
        filename: file.name,
        mimeType: file.type,
        size: stored.size,
        url: stored.url,
        pathname: stored.pathname,
        storage: stored.storage,
        alt,
        createdById: user.id,
      },
    });

    if (postId) {
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (post && post.status !== "PUBLISHED") {
        const count = await prisma.postAsset.count({ where: { postId } });
        await prisma.postAsset.create({
          data: { postId, assetId: asset.id, position: count },
        });
        if (post.status === "APPROVED" || post.status === "SCHEDULED") {
          await prisma.post.update({
            where: { id: postId },
            data: { status: "IN_REVIEW", approvedById: null, approvedAt: null },
          });
        }
      }
    }

    await logActivity({
      userId: user.id,
      action: "asset.upload",
      entityType: "asset",
      entityId: asset.id,
      detail: `${user.name} uploaded ${file.name}${stored.storage === "blob" ? " to Vercel Blob" : ""}.`,
    });

    return NextResponse.json({
      id: asset.id,
      url: asset.url,
      filename: asset.filename,
      mimeType: asset.mimeType,
      storage: asset.storage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
