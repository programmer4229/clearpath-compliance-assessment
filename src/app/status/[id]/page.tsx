import { notFound } from "next/navigation";
import { getSubmissionDetail, getSubmissionLineage } from "@/lib/queries";
import { resubmitAction } from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { PRODUCT_LABEL, STATUS_META } from "@/lib/labels";
import { AttachmentsAndSubmit } from "@/components/AttachmentsAndSubmit";
import { fileUrl } from "@/lib/attachments";

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
        <div className="banner-success mb-6">
          Submitted for review. Save this page&apos;s URL, or look it up later by email on the
          Check Status page.
        </div>
      )}
      {resubmitted && (
        <div className="banner-success mb-6">
          Revised version submitted — it will go back to the same reviewer.
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">{latest.submission.title}</h1>
        <StatusBadge status={latest.submission.status} />
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {PRODUCT_LABEL[latest.submission.product_type]} · submitted by{" "}
        {latest.submission.submitter_name}
        {latest.submission.submitter_type === "affiliate" ? " (affiliate)" : " (in-house)"}
      </p>

      <div className="mt-8 space-y-6">
        {lineage.map((v, idx) => (
          <div key={v!.submission.id} className="card p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Version {idx + 1}
              {idx === lineage.length - 1 && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600">
                  current
                </span>
              )}
            </div>

            {v!.submission.body_text && (
              <p className="whitespace-pre-wrap text-sm text-slate-800">{v!.submission.body_text}</p>
            )}

            {v!.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {v!.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={fileUrl(a.storage_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-indigo-600 hover:underline"
                  >
                    {a.filename}
                  </a>
                ))}
              </div>
            )}

            {v!.decisions.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                {v!.decisions.map((d, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-slate-900">{d.reviewer_name}</span>{" "}
                    <span className="text-slate-500">
                      — {STATUS_META[d.decision]?.label ?? d.decision}
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
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
          <h2 className="text-sm font-semibold text-amber-900">Submit a revised version</h2>
          <p className="mt-1 text-xs text-amber-800">
            This goes back to the same reviewer who requested changes, not the general queue.
          </p>
          <form action={resubmitAction} className="mt-4 space-y-4">
            <input type="hidden" name="parentId" value={latest.submission.id} />
            <label className="field-label">
              Title
              <input
                name="title"
                defaultValue={latest.submission.title}
                required
                className="input"
              />
            </label>
            <label className="field-label">
              Product type
              <select
                name="productType"
                defaultValue={latest.submission.product_type}
                required
                className="input"
              >
                <option value="personal_loan">Personal Loan</option>
                <option value="credit_card">Credit Card</option>
                <option value="mortgage_prequalification">Mortgage Prequalification</option>
              </select>
            </label>
            <label className="field-label">
              Revised body text
              <textarea
                name="bodyText"
                rows={5}
                defaultValue={latest.submission.body_text ?? ""}
                className="input"
              />
            </label>
            <AttachmentsAndSubmit
              fieldName="attachmentsJson"
              label="Updated attachments (optional — replaces previous)"
              submitLabel="Submit revision"
            />
          </form>
        </div>
      )}
    </div>
  );
}
