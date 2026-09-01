"use client";

import { useState } from "react";
import { AttachmentPicker } from "./AttachmentPicker";

// The "Content" card for the submission form: attachments first (per the
// product's request to lead with them), then title/product type/body text,
// all inside one bordered card with a plain in-box heading (a <fieldset>+
// <legend> here would visually straddle the card's border — see the
// review-detail page for the same plain div+h2 convention used elsewhere).
// The submit button stays a sibling *after* the card, sharing this
// component's `pending` state so it disables itself while an attachment is
// still uploading — same pattern AttachmentsAndSubmit used before this card
// was reorganized (that component is still used, unchanged, by the resubmit
// form on the status page).
export function SubmissionFields({
  productTypes,
  attachmentFieldName,
  attachmentLabel,
  attachmentHint,
  submitLabel,
}: {
  productTypes: { value: string; label: string }[];
  attachmentFieldName: string;
  attachmentLabel: string;
  attachmentHint?: string;
  submitLabel: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <>
      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Content</h2>
        <AttachmentPicker
          name={attachmentFieldName}
          label={attachmentLabel}
          hint={attachmentHint}
          onPendingChange={setPending}
        />
        <label className="field-label">
          Title
          <input
            name="title"
            required
            placeholder="e.g. Spring personal loan email campaign"
            className="input"
          />
        </label>
        <label className="field-label">
          Product type
          <select name="productType" required className="input" defaultValue="">
            <option value="" disabled>
              Select a product
            </option>
            {productTypes.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Body text (paragraph, article, ad copy, etc.)
          <textarea name="bodyText" rows={6} className="input" />
        </label>
      </div>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Uploading attachments…" : submitLabel}
      </button>
    </>
  );
}
