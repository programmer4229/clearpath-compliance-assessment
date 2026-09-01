import Link from "next/link";
import { redirect } from "next/navigation";
import { getQueue } from "@/lib/queries";
import { claimAction } from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { PRODUCT_LABEL } from "@/lib/labels";
import { verifySession } from "@/lib/session";

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; claim_failed?: string; decided?: string }>;
}) {
  const user = await verifySession();
  if (!user) redirect("/login");
  // Marketer-only/affiliate accounts have nothing to review — send them to
  // the dashboard instead of an empty/inaccessible queue.
  if (!user.is_reviewer) redirect("/");

  const { view, claim_failed, decided } = await searchParams;

  const allQueue = await getQueue();
  const myQueue = allQueue.filter((s) => s.assigned_reviewer_id === user.id);
  const showMine = view === "mine";
  const rows = showMine ? myQueue : allQueue;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Compliance review queue</h1>
        <p className="mt-1 text-sm text-slate-600">
          Signed in as <span className="font-medium text-slate-900">{user.name}</span>
        </p>
      </div>

      {claim_failed === "self" && (
        <div className="banner-warning mt-4">You can&apos;t claim or review your own submission.</div>
      )}
      {claim_failed === "1" && (
        <div className="banner-warning mt-4">Someone else claimed that submission first.</div>
      )}
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
            {rows.map((s) => {
              const isOwnSubmission = s.submitter_id === user.id;
              return (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {s.title}
                    <span className="ml-2 text-xs font-normal text-slate-400">v{s.version}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{PRODUCT_LABEL[s.product_type]}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.submitter_name}
                    {s.submitter_account_type === "affiliate" && (
                      <span className="ml-1.5 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                        affiliate
                      </span>
                    )}
                    {isOwnSubmission && (
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.reviewer_name ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {isOwnSubmission ? (
                      <span className="text-xs text-slate-400" title="You can't review your own submission">
                        Not reviewable by you
                      </span>
                    ) : s.status === "new" ? (
                      <form action={claimAction}>
                        <input type="hidden" name="submissionId" value={s.id} />
                        <button className="btn-primary px-3 py-1.5 text-xs">Claim</button>
                      </form>
                    ) : s.assigned_reviewer_id === user.id &&
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
