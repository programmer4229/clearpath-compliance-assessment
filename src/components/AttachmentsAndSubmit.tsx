"use client";

import { useState } from "react";
import { AttachmentPicker } from "./AttachmentPicker";

// Groups the attachment uploader with the form's submit button so the button
// disables itself while any file is still uploading to Blob — otherwise a
// submit mid-upload would silently drop that attachment, since the hidden
// field it's carried in hasn't been populated yet.
export function AttachmentsAndSubmit({
  fieldName,
  label,
  hint,
  submitLabel,
}: {
  fieldName: string;
  label: string;
  hint?: string;
  submitLabel: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <>
      <AttachmentPicker name={fieldName} label={label} hint={hint} onPendingChange={setPending} />
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Uploading attachments…" : submitLabel}
      </button>
    </>
  );
}
