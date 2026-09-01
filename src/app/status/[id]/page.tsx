import { notFound, redirect } from "next/navigation";
import { getSubmissionDetail, getSubmissionLineage } from "@/lib/queries";
import { resubmitAction } from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { CHECKLIST_RESULT_META, PRODUCT_LABEL, STATUS_META } from "@/lib/labels";
import { AttachmentsAndSubmit } from "@/components/AttachmentsAndSubmit";
import { fileUrl } from "@/lib/attachments";
import { verifySession } from "@/lib/session";

export default async function StatusDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string; resubmitted?: string }>;
}) {
  const { id } = await params;
  const { submitted, resubmitted } = await searchParams;

  const user = await verifySession();
  if (!user) redirect("/login");

  const detail = await getSubmissionDetail(id);
  if (!detail) notFound();
  // Only the submitter who owns this submission can see its status page —
  // now that submissions are tied to real accounts, there's no reason to
  // keep the old "anyone with the URL" model. 404 rather than a "forbidden"
  // message, so this doesn't confirm to a stranger that the ID is valid.
  if (detail.submission.submitter_id !== user.id) notFound();

  const lineage = await getSubmissionLineage(id);
  const latest = lineage[lineage.length - 1]!;
  const canResubmit = latest.submission.status === "changes_requested";

  return (
    <div className="max-w-3xl animate-fade-in-up">
      {submitted && (
        <div className="banner-success mb-6">
          Submitted for review — you&apos;ll find it on your home page any time you&apos;re signed in.
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
        {latest.submission.submitter_account_type === "affiliate" ? " (affiliate)" : " (in-house)"}
      </p>

      <div className="mt-8 space-y-6">
        {lineage.map((v, idx) => (
          <div
            key={v!.submission.id}
            className={`card animate-fade-in-up stagger-${Math.min(idx + 1, 5)} p-5`}
          >
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Version {idx + 1}
              {idx === lineage.length - 1 && (
                <span className="animate-pop-in rounded-full bg-teal-50 px-2 py-0.5 text-teal-600">
                  current
                </span>
              )}
            </div>

            {v!.submission.body_text && (
              <p className="whitespace-pre-wrap text-sm text-slate-800">{v!.submission.body_text}</p>
            )}

            {v!.attachments.length > 0 && (
              <div className="mt-3 space-y-3">
                {v!.attachments.map((a) =>
                  a.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={a.id}
                      src={fileUrl(a.storage_url)}
                      alt={a.filename}
                      className="max-h-96 rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div key={a.id} className="overflow-hidden rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="truncate text-xs font-medium text-slate-600">📄 {a.filename}</span>
                        <a
                          href={fileUrl(a.storage_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-xs text-teal-600 hover:underline"
                        >
                          Open in new tab
                        </a>
                      </div>
                      {/* Some mobile browsers (notably iOS Safari) don't render
                          PDFs inline in an iframe — the header link above is
                          the fallback for those. */}
                      <iframe src={fileUrl(a.storage_url)} title={a.filename} className="h-[600px] w-full" />
                    </div>
                  )
                )}
              </div>
            )}

            {v!.checklistResponses.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Compliance checklist notes
                </h3>
                <div className="mt-2 divide-y divide-slate-100">
                  {v!.checklistResponses.map((r, i) => {
                    const meta = CHECKLIST_RESULT_META[r.result];
                    return (
                      <div
                        key={r.criterion_id}
                        className={`animate-fade-in-up stagger-${Math.min(i + 1, 5)} py-2.5 first:pt-0`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{r.title}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{r.description}</div>
                          </div>
                          <span
                            className={`animate-pop-in shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        {r.note && (
                          <p className="mt-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                            {r.note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {v!.decisions.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Reviewer feedback
                </h3>
                {v!.decisions.map((d, i) => {
                  const meta = STATUS_META[d.decision] ?? { label: d.decision, className: "bg-slate-100 text-slate-700" };
                  const borderClass =
                    d.decision === "approved"
                      ? "border-emerald-200 bg-emerald-50/50"
                      : d.decision === "rejected"
                        ? "border-rose-200 bg-rose-50/50"
                        : "border-amber-200 bg-amber-50/50";
                  return (
                    <div key={i} className={`rounded-lg border p-3 ${borderClass}`}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-900">{d.reviewer_name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      {d.feedback && <p className="mt-1.5 text-sm text-slate-700">{d.feedback}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {canResubmit && (
        <div className="animate-fade-in-up mt-8 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
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
                {Object.entries(PRODUCT_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
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
              hint="JPG, PNG, GIF, WEBP, or PDF — up to 25MB each"
              submitLabel="Submit revision"
            />
          </form>
        </div>
      )}
    </div>
  );
}
