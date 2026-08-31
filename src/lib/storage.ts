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
  // TODO (pre-deploy): when BLOB_READ_WRITE_TOKEN is set, swap this branch to
  // `@vercel/blob`'s put() instead of writing to local disk. Signature below
  // stays the same either way, so nothing calling saveUpload() has to change.
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
