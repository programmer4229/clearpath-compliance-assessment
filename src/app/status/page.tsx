import Link from "next/link";
import { getSubmissionsBySubmitterEmail } from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";

export default async function StatusLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const submissions = email ? await getSubmissionsBySubmitterEmail(email.trim().toLowerCase()) : [];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Check your submission status</h1>
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
          className="input mt-0"
        />
        <button className="btn-primary shrink-0">Look up</button>
      </form>

      {email && (
        <div className="mt-8">
          {submissions.length === 0 ? (
            <p className="text-sm text-slate-500">No submissions found for {email}.</p>
          ) : (
            <ul className="card divide-y divide-slate-100">
              {submissions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/status/${s.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">{s.title}</div>
                      <div className="text-xs text-slate-500">v{s.version}</div>
                    </div>
                    <StatusBadge status={s.status} />
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
