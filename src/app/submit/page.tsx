import { redirect } from "next/navigation";
import { createSubmissionAction } from "@/app/actions";
import { AttachmentsAndSubmit } from "@/components/AttachmentsAndSubmit";
import { verifySession } from "@/lib/session";

const PRODUCT_TYPES = [
  { value: "personal_loan", label: "Personal Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "mortgage_prequalification", label: "Mortgage Prequalification" },
];

export default async function SubmitPage() {
  const user = await verifySession();
  if (!user) redirect("/login");
  // Reviewer-only accounts have nothing to submit — send them to the
  // dashboard instead of a form they can't use.
  if (!user.is_marketer) redirect("/");

  return (
    <div className="max-w-2xl animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-slate-900">Submit marketing content</h1>
      <p className="mt-1 text-sm text-slate-600">
        Attach the text, image, or PDF version of the content. Video isn&apos;t supported yet.
      </p>

      <form action={createSubmissionAction} className="mt-8 space-y-6">
        <div className="card flex items-center justify-between gap-3 p-4 text-sm">
          <span className="text-slate-500">
            Submitting as{" "}
            <span className="font-medium text-slate-900">
              {user.name} ({user.email})
            </span>
            {user.account_type === "affiliate" && (
              <span className="ml-1.5 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                affiliate{user.affiliate_company ? ` — ${user.affiliate_company}` : ""}
              </span>
            )}
          </span>
        </div>

        <fieldset className="card space-y-4 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-900">Content</legend>
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
              {PRODUCT_TYPES.map((p) => (
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
        </fieldset>

        <AttachmentsAndSubmit
          fieldName="attachmentsJson"
          label="Attachments (image or PDF)"
          submitLabel="Submit for review"
        />
      </form>
    </div>
  );
}
