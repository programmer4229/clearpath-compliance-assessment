// Shared between the client-side uploader (src/components/AttachmentPicker.tsx),
// the Blob token-exchange route (src/app/api/blob-upload/route.ts), and the
// server actions that parse the uploaded-attachment list back out of form
// submissions (src/app/actions.ts).

export const ALLOWED_ATTACHMENT_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

// Vercel Blob itself supports files far larger than this; this cap just
// keeps the review UI (which renders images inline) reasonable. Raise it if
// compliance content genuinely needs bigger files.
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB per file

export type AttachmentKind = "image" | "pdf";

export function attachmentTypeFor(contentType: string): AttachmentKind | null {
  if (contentType.startsWith("image/")) return "image";
  if (contentType === "application/pdf") return "pdf";
  return null;
}

export interface UploadedAttachment {
  type: AttachmentKind;
  url: string;
  filename: string;
}
