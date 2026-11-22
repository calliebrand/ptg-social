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
  assertMediaType(file.type, file.size);
}

export async function storeUpload(file: File) {
  assertUpload(file);
  const bytes = Buffer.from(await file.arrayBuffer());
  return storeBuffer(bytes, file.name, file.type || "application/octet-stream");
}

export function assertMediaType(mimeType: string, size: number) {
  if (!ALLOWED.has(mimeType)) {
    throw new Error("Upload a JPEG, PNG, WebP, GIF, or MP4.");
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error("File is larger than 50 MB.");
  }
}

export async function storeBuffer(bytes: Buffer, name: string, mimeType: string) {
  assertMediaType(mimeType, bytes.length);
  const filename = `${Date.now()}-${safeFilename(name)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`ptg/${filename}`, bytes, {
      access: "public",
      contentType: mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      storage: "blob" as const,
      size: bytes.length,
    };
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Uploads need Vercel Blob on Vercel. Connect a Blob store to the project and set BLOB_READ_WRITE_TOKEN.",
    );
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
