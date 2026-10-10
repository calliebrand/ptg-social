import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
]);

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function safeFilename(name: string) {
  const base = name.split(/[/\\]/).pop() || "upload";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
}

export function assertUpload(file: File) {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Upload a JPEG, PNG, WebP, GIF, or MP4.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File is larger than 50 MB.");
  }
}

export async function storeUpload(file: File) {
  assertUpload(file);
  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${safeFilename(file.name)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`ptg/${filename}`, bytes, {
      access: "public",
      contentType: file.type || "application/octet-stream",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      storage: "blob" as const,
      size: bytes.length,
    };
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return {
    url: `/uploads/${filename}`,
    pathname: `uploads/${filename}`,
    storage: "local" as const,
    size: bytes.length,
  };
}
