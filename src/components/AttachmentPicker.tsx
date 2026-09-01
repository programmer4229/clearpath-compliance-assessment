"use client";

import { useId, useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";
import { attachmentTypeFor, type UploadedAttachment } from "@/lib/attachments";

// Uploads files directly from the browser to Vercel Blob (via the presigned-
// URL exchange at /api/blob-upload) instead of sending the raw bytes through
// a Server Action. See the comment in that route for why: Vercel Functions
// hard-cap request bodies at 4.5MB, and that limit is enforced before app
// code runs, so a large attachment sent the "normal" way fails silently.
//
// Uses uploadPresigned() (OIDC-based), not upload() — this project's Blob
// store connection only provisions BLOB_STORE_ID + BLOB_WEBHOOK_PUBLIC_KEY,
// not a static BLOB_READ_WRITE_TOKEN, so the older handleUpload()/upload()
// pair fails with "Failed to retrieve the client token" every time.
//
// Uploaded with access: "private" to match this app's Blob store, which
// means the returned URL isn't directly browsable — see src/lib/attachments.ts
// (fileUrl helper) and src/app/api/file/route.ts for how it's read back.
//
// The uploaded file list is serialized into a hidden `name` field as JSON so
// the surrounding <form action={someServerAction}> still submits it like any
// other field — see src/lib/attachments.ts for the shape, and
// src/app/actions.ts for where it's parsed back out.
export function AttachmentPicker({
  name,
  label,
  hint,
  onPendingChange,
}: {
  name: string;
  label: string;
  hint?: string;
  onPendingChange?: (pending: boolean) => void;
}) {
  const inputId = useId();
  const [files, setFiles] = useState<UploadedAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = ""; // let the same file be re-picked later if removed
    if (selected.length === 0) return;

    setError(null);
    onPendingChange?.(true);
    try {
      const uploaded: UploadedAttachment[] = [];
      for (const file of selected) {
        const type = attachmentTypeFor(file.type);
        if (!type) continue; // e.g. video — out of scope for this MVP, see PRD
        const blob = await uploadPresigned(file.name, file, {
          access: "private",
          handleUploadUrl: "/api/blob-upload",
        });
        uploaded.push({ type, url: blob.url, filename: file.name });
      }
      setFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — try again.");
    } finally {
      onPendingChange?.(false);
    }
  }

  function remove(url: string) {
    setFiles((prev) => prev.filter((f) => f.url !== url));
  }

  return (
    <div>
      <span className="field-label">{label}</span>
      {/*
        The native file input's own "No file chosen" text can't be styled or
        removed while the input itself stays visible — and since selected
        files are tracked in our own `files` list below (not the input's
        value, which gets cleared after each pick so the same file can be
        re-selected), that native text would always read "No file chosen"
        even with files attached. Hide the native input and drive it from a
        styled label instead; the list below is the single source of truth
        for what's actually attached.
      */}
      <label
        htmlFor={inputId}
        className="mt-1 inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
      >
        Choose files
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleChange}
        className="sr-only"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f) => (
            <li
              key={f.url}
              className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
            >
              <span className="truncate">{f.filename}</span>
              <button
                type="button"
                onClick={() => remove(f.url)}
                className="ml-2 shrink-0 text-slate-400 hover:text-rose-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <input type="hidden" name={name} value={JSON.stringify(files)} />
    </div>
  );
}
