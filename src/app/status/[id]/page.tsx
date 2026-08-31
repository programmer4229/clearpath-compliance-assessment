import { notFound } from "next/navigation";
import { getSubmissionDetail, getSubmissionLineage } from "@/lib/queries";
import { resubmitAction } from "@/app/actions";

const STATUS_LABEL: Record<string, string> = {
  new: "Awaiting reviewer",
  in_review: "In review",
  changes_requested: "Changes requested",
  resubmitted: "Resubmitted — in review",
  approved: "Approved",
  rejected: "Rejected",
};

const PRODUCT_LABEL: Record<string, string> = {
  personal_loan: "Personal Loan",
  credit_card: "Credit Card",
  mortgage_prequalification: "Mortgage Prequalification",
};

export default async function StatusDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string; resubmitted?: string }>;
}) {
  const { id } = await params;
  const { submitted, resubmitted } = await searchParams;
  const detail = await getSubmissionDetail(id);
  if (!detail) notFound();

  const lineage = await getSubmissionLineage(id);
  const latest = lineage[lineage.length - 1]!;
  const canResubmit = latest.submission.status === "changes_requested";

  return (
    <div className="max-w-3xl">
      {submitted && (
        <div className="mb-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Submitted for review. Save this page's URL, or look it up later by email on the Check
          Status page.
        </div>
      )}
      {resubmitted && (
        <div className="mb-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Revised version submitted — it will go back to the same reviewer.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{latest.submission.title}</h1>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {STATUS_LABEL[latest.submission.status] ?? latest.submission.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {PRODUCT_LABEL[latest.submission.product_type]} · submitted by {latest.submission.submitter_name}
        {latest.submission.submitter_type === "affiliate" ? " (affiliate)" : " (in-house)"}
      </p>

      <div className="mt-8 space-y-8">
        {lineage.map((v, idx) => (
          <div key={v!.submission.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Version {idx + 1} {idx === lineage.length - 1 ? "(current)" : ""}
            </div>

            {v!.submission.body_text && (
              <p className="whitespace-pre-wrap text-sm text-slate-800">{v!.submission.body_text}</p>
            )}

            {v!.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {v!.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.storage_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-indigo-600 hover:underline"
                  >
                    {a.filename}
                  </a>
                ))}
              </div>
            )}

            {v!.decisions.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {v!.decisions.map((d, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">
                      {d.reviewer_name} — {STATUS_LABEL[d.decision] ?? d.decision}
                    </span>
                    {d.feedback && <p className="mt-1 text-slate-600">{d.feedback}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {canResubmit && (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-900">Submit a revised version</h2>
          <p className="mt-1 text-xs text-amber-800">
            This goes back to the same reviewer who requested changes, not the general queue.
          </p>
          <form action={resubmitAction} className="mt-4 space-y-3">
            <input type="hidden" name="parentId" value={latest.submission.id} />
            <label className="block text-sm">
              Title
              <input name="title" defaultValue={latest.submission.title} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Product type
              <select name="productType" defaultValue={latest.submission.product_type} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="personal_loan">Personal Loan</option>
                <option value="credit_card">Credit Card</option>
                <option value="mortgage_prequalification">Mortgage Prequalification</option>
              </select>
            </label>
            <label className="block text-sm">
              Revised body text
              <textarea name="bodyText" rows={5} defaultValue={latest.submission.body_text ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Updated attachments (optional — replaces previous)
              <input type="file" name="attachments" accept="image/*,application/pdf" multiple className="mt-1 w-full text-sm" />
            </label>
            <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
              Submit revision
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
