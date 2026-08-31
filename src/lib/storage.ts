// File storage abstraction. Local dev writes to disk under public/uploads.
// At deploy time this swaps to Vercel Blob (BLOB_READ_WRITE_TOKEN) behind
// the same saveUpload() signature — nothing calling this needs to change.
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export interface SavedFile {
  url: string;
  filename: string;
}

export async function saveUpload(file: File): Promise<SavedFile> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`${randomUUID()}-${safeName}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url, filename: file.name };
  }

  // Local dev fallback (no Blob token set): write to disk. Vercel's
  // production filesystem is read-only outside /tmp, so this branch only
  // runs locally — BLOB_READ_WRITE_TOKEN is required in production.
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, storedName), buffer);
  return { url: `/uploads/${storedName}`, filename: file.name };
}

export function attachmentTypeFor(file: File): "image" | "pdf" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  return null;
}
