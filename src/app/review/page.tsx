import Link from "next/link";
import { getCurrentReviewer, listReviewers } from "@/lib/reviewers";
import { getQueue } from "@/lib/queries";
import { setReviewerAction, claimAction } from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { PRODUCT_LABEL } from "@/lib/labels";

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; claim_failed?: string; decided?: string }>;
}) {
  const reviewer = await getCurrentReviewer();
  const reviewers = await listReviewers();
  const { view, claim_failed, decided } = await searchParams;

  if (!reviewer) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold text-slate-900">Compliance review</h1>
        <p className="mt-1 text-sm text-slate-600">
          No real auth for this MVP — pick a reviewer identity to continue (see PRD &gt; Non-Goals).
        </p>
        <form action={setReviewerAction} className="card mt-6 flex gap-2 p-4">
          <select name="reviewerId" required className="input mt-0" defaultValue="">
            <option value="" disabled>
              Select reviewer…
            </option>
            {reviewers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button className="btn-primary shrink-0">Continue</button>
        </form>
      </div>
    );
  }

  const allQueue = await getQueue();
  const myQueue = allQueue.filter((s) => s.assigned_reviewer_id === reviewer.id);
  const showMine = view === "mine";
  const rows = showMine ? myQueue : allQueue;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Compliance review queue</h1>
          <p className="mt-1 text-sm text-slate-600">
            Signed in as <span className="font-medium text-slate-900">{reviewer.name}</span>
          </p>
        </div>
        <form action={setReviewerAction}>
          <input type="hidden" name="reviewerId" value="" />
          <button className="text-sm text-slate-500 hover:text-slate-800 hover:underline">
            Switch reviewer
          </button>
        </form>
      </div>

      {claim_failed && <div className="banner-warning mt-4">Someone else claimed that submission first.</div>}
      {decided && <div className="banner-success mt-4">Decision recorded and submitter notified.</div>}

      <div className="mt-6 flex gap-2 text-sm">
        <Link
          href="/review"
          className={
            !showMine
              ? "rounded-full bg-slate-900 px-3 py-1 text-white"
              : "rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }
        >
          All ({allQueue.length})
        </Link>
        <Link
          href="/review?view=mine"
          className={
            showMine
              ? "rounded-full bg-slate-900 px-3 py-1 text-white"
              : "rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }
        >
          My queue ({myQueue.length})
        </Link>
      </div>

      <div className="card mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Submitter</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Reviewer</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Nothing here.
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {s.title}
                  <span className="ml-2 text-xs font-normal text-slate-400">v{s.version}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{PRODUCT_LABEL[s.product_type]}</td>
                <td className="px-4 py-3 text-slate-600">
                  {s.submitter_name}
                  {s.submitter_type === "affiliate" && (
                    <span className="ml-1.5 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                      affiliate
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">{s.reviewer_name ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {s.status === "new" ? (
                    <form action={claimAction}>
                      <input type="hidden" name="submissionId" value={s.id} />
                      <input type="hidden" name="reviewerId" value={reviewer.id} />
                      <button className="btn-primary px-3 py-1.5 text-xs">Claim</button>
                    </form>
                  ) : s.assigned_reviewer_id === reviewer.id &&
                    (s.status === "in_review" || s.status === "resubmitted") ? (
                    <Link href={`/review/${s.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                      Review
                    </Link>
                  ) : (
                    <Link href={`/review/${s.id}`} className="text-xs text-indigo-600 hover:underline">
                      View
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
