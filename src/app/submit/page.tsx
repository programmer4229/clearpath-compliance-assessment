import { createSubmissionAction } from "@/app/actions";

const PRODUCT_TYPES = [
  { value: "personal_loan", label: "Personal Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "mortgage_prequalification", label: "Mortgage Prequalification" },
];

export default function SubmitPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">Submit marketing content</h1>
      <p className="mt-1 text-sm text-slate-600">
        Text, image, and PDF are supported for this MVP. Video submissions are not yet supported —
        see the PRD for the planned link-based approach.
      </p>

      <form action={createSubmissionAction} className="mt-8 space-y-6">
        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium text-slate-700">Who's submitting</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Your name
              <input name="name" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Your email
              <input type="email" name="email" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Submitter type
              <select name="submitterType" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" defaultValue="in_house">
                <option value="in_house">In-house marketer</option>
                <option value="affiliate">Affiliate partner</option>
              </select>
            </label>
            <label className="block text-sm">
              Affiliate company (if applicable)
              <input name="affiliateCompany" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium text-slate-700">Content</legend>
          <div className="space-y-4">
            <label className="block text-sm">
              Title
              <input name="title" required placeholder="e.g. Spring personal loan email campaign" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Product type
              <select name="productType" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" defaultValue="">
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
            <label className="block text-sm">
              Body text (paragraph, article, ad copy, etc.)
              <textarea name="bodyText" rows={6} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Attachments (image or PDF)
              <input type="file" name="attachments" accept="image/*,application/pdf" multiple className="mt-1 w-full text-sm" />
            </label>
          </div>
        </fieldset>

        <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
          Submit for review
        </button>
      </form>
    </div>
  );
}
