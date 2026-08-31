import { notFound } from "next/navigation";
import { getCurrentReviewer } from "@/lib/reviewers";
import { getSubmissionDetail, getChecklistCriteria } from "@/lib/queries";
import { decisionAction } from "@/app/actions";

const PRODUCT_LABEL: Record<string, string> = {
  personal_loan: "Personal Loan",
  credit_card: "Credit Card",
  mortgage_prequalification: "Mortgage Prequalification",
};

const RESULT_OPTIONS: { value: string; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "not_applicable", label: "N/A" },
];

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [reviewer, detail, criteria] = await Promise.all([
    getCurrentReviewer(),
    getSubmissionDetail(id),
    getChecklistCriteria(),
  ]);
  if (!detail) notFound();

  const { submission, attachments, checklistResponses, decisions } = detail;
  const responseByCriterion = new Map(checklistResponses.map((r) => [r.criterion_id, r]));

  const isEditable =
    !!reviewer &&
    submission.assigned_reviewer_id === reviewer.id &&
    (submission.status === "in_review" || submission.status === "resubmitted");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{submission.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {PRODUCT_LABEL[submission.product_type]} · v{submission.version} · submitted by{" "}
          {submission.submitter_name} ({submission.submitter_type === "affiliate" ? "affiliate" : "in-house"})
          {submission.affiliate_company ? ` — ${submission.affiliate_company}` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: submitted content */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">Submitted content</h2>
          {submission.body_text && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{submission.body_text}</p>
          )}
          {attachments.length > 0 && (
            <div className="mt-4 space-y-3">
              {attachments.map((a) =>
                a.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={a.id} src={a.storage_url} alt={a.filename} className="max-h-96 rounded-md border border-slate-200" />
                ) : (
                  <a
                    key={a.id}
                    href={a.storage_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border border-slate-200 px-3 py-2 text-sm text-indigo-600 hover:underline"
                  >
                    📄 {a.filename}
                  </a>
                )
              )}
            </div>
          )}

          {decisions.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Decision history
              </h3>
              <div className="mt-2 space-y-2">
                {decisions.map((d, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">{d.reviewer_name}</span> — {d.decision}
                    {d.feedback && <p className="text-slate-600">{d.feedback}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: checklist + decision */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">Compliance checklist</h2>
          {!isEditable && (
            <p className="mt-1 text-xs text-amber-700">
              Read-only — {reviewer ? "not assigned to you, or already decided." : "sign in as a reviewer to edit."}
            </p>
          )}

          <form action={decisionAction} className="mt-4 space-y-5">
            <input type="hidden" name="submissionId" value={submission.id} />
            <input type="hidden" name="reviewerId" value={reviewer?.id ?? ""} />

            <div className="space-y-4">
              {criteria.map((c) => {
                const existing = responseByCriterion.get(c.id);
                return (
                  <div key={c.id} className="border-b border-slate-100 pb-4 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{c.title}</div>
                        <div className="text-xs text-slate-500">{c.description}</div>
                        {c.regulation_reference && (
                          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-500">
                            {c.regulation_reference}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {RESULT_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1 text-xs">
                            <input
                              type="radio"
                              name={`criterion:${c.id}`}
                              value={opt.value}
                              defaultChecked={existing?.result === opt.value}
                              disabled={!isEditable}
                              required
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      name={`criterion:${c.id}:note`}
                      defaultValue={existing?.note ?? ""}
                      disabled={!isEditable}
                      placeholder="Note (optional)"
                      className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-50"
                    />
                  </div>
                );
              })}
            </div>

            <label className="block text-sm">
              Overall feedback to submitter (required unless approving)
              <textarea
                name="feedback"
                rows={3}
                disabled={!isEditable}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </label>

            {isEditable && (
              <div className="flex flex-wrap gap-2">
                <button
                  name="decision"
                  value="approved"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Approve
                </button>
                <button
                  name="decision"
                  value="changes_requested"
                  className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400"
                >
                  Request changes
                </button>
                <button
                  name="decision"
                  value="rejected"
                  className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
                >
                  Reject
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
