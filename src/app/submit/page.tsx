import { createSubmissionAction } from "@/app/actions";

const PRODUCT_TYPES = [
  { value: "personal_loan", label: "Personal Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "mortgage_prequalification", label: "Mortgage Prequalification" },
];

export default function SubmitPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Submit marketing content</h1>
      <p className="mt-1 text-sm text-slate-600">
        Text, image, and PDF are supported for this MVP. Video submissions are not yet supported —
        see the PRD for the planned link-based approach.
      </p>

      <form action={createSubmissionAction} className="mt-8 space-y-6">
        <fieldset className="card space-y-4 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-900">Who&apos;s submitting</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">
              Your name
              <input name="name" required className="input" />
            </label>
            <label className="field-label">
              Your email
              <input type="email" name="email" required className="input" />
            </label>
            <label className="field-label">
              Submitter type
              <select name="submitterType" required className="input" defaultValue="in_house">
                <option value="in_house">In-house marketer</option>
                <option value="affiliate">Affiliate partner</option>
              </select>
            </label>
            <label className="field-label">
              Affiliate company (if applicable)
              <input name="affiliateCompany" className="input" />
            </label>
          </div>
        </fieldset>

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
          <label className="field-label">
            Attachments (image or PDF)
            <input
              type="file"
              name="attachments"
              accept="image/*,application/pdf"
              multiple
              className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </label>
        </fieldset>

        <button type="submit" className="btn-primary">
          Submit for review
        </button>
      </form>
    </div>
  );
}
