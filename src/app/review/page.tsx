import Link from "next/link";
import { getCurrentReviewer, listReviewers } from "@/lib/reviewers";
import { getQueue } from "@/lib/queries";
import { setReviewerAction, claimAction } from "@/app/actions";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_review: "In review",
  changes_requested: "Changes requested",
  resubmitted: "Resubmitted",
  approved: "Approved",
  rejected: "Rejected",
};

const PRODUCT_LABEL: Record<string, string> = {
  personal_loan: "Personal Loan",
  credit_card: "Credit Card",
  mortgage_prequalification: "Mortgage Prequalification",
};

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
        <h1 className="text-xl font-semibold">Compliance review</h1>
        <p className="mt-1 text-sm text-slate-600">
          No real auth for this MVP — pick a reviewer identity to continue (see PRD &gt; Non-Goals).
        </p>
        <form action={setReviewerAction} className="mt-6 flex gap-2">
          <select name="reviewerId" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select reviewer…</option>
            {reviewers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            Continue
          </button>
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
          <h1 className="text-xl font-semibold">Compliance review queue</h1>
          <p className="mt-1 text-sm text-slate-600">
            Signed in as <span className="font-medium">{reviewer.name}</span>
          </p>
        </div>
        <form action={setReviewerAction}>
          <input type="hidden" name="reviewerId" value="" />
          <button className="text-sm text-slate-500 hover:text-slate-800 hover:underline">
            Switch reviewer
          </button>
        </form>
      </div>

      {claim_failed && (
        <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Someone else claimed that submission first.
        </div>
      )}
      {decided && (
        <div className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Decision recorded and submitter notified.
        </div>
      )}

      <div className="mt-6 flex gap-2 text-sm">
        <Link
          href="/review"
          className={`rounded-full px-3 py-1 ${!showMine ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          All ({allQueue.length})
        </Link>
        <Link
          href="/review?view=mine"
          className={`rounded-full px-3 py-1 ${showMine ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          My queue ({myQueue.length})
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Submitter</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reviewer</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nothing here.
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium">
                  {s.title}
                  <span className="ml-2 text-xs font-normal text-slate-400">v{s.version}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{PRODUCT_LABEL[s.product_type]}</td>
                <td className="px-4 py-3 text-slate-600">
                  {s.submitter_name}
                  {s.submitter_type === "affiliate" && (
                    <span className="ml-1 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                      affiliate
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{s.reviewer_name ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {s.status === "new" ? (
                    <form action={claimAction}>
                      <input type="hidden" name="submissionId" value={s.id} />
                      <input type="hidden" name="reviewerId" value={reviewer.id} />
                      <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500">
                        Claim
                      </button>
                    </form>
                  ) : s.assigned_reviewer_id === reviewer.id &&
                    (s.status === "in_review" || s.status === "resubmitted") ? (
                    <Link href={`/review/${s.id}`} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                      Review
                    </Link>
                  ) : (
                    <Link href={`/review/${s.id}`} className="text-xs text-slate-500 hover:underline">
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
