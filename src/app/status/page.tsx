import Link from "next/link";
import { getSubmissionsBySubmitterEmail } from "@/lib/queries";

const STATUS_LABEL: Record<string, string> = {
  new: "Awaiting reviewer",
  in_review: "In review",
  changes_requested: "Changes requested",
  resubmitted: "Resubmitted — in review",
  approved: "Approved",
  rejected: "Rejected",
};

export default async function StatusLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const submissions = email ? await getSubmissionsBySubmitterEmail(email.trim().toLowerCase()) : [];

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold">Check your submission status</h1>
      <p className="mt-1 text-sm text-slate-600">
        Look up submissions by the email address you used to submit.
      </p>

      <form method="GET" className="mt-6 flex gap-2">
        <input
          type="email"
          name="email"
          required
          defaultValue={email}
          placeholder="you@company.com"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
          Look up
        </button>
      </form>

      {email && (
        <div className="mt-8">
          {submissions.length === 0 ? (
            <p className="text-sm text-slate-500">No submissions found for {email}.</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {submissions.map((s) => (
                <li key={s.id}>
                  <Link href={`/status/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                    <div>
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-slate-500">v{s.version}</div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
