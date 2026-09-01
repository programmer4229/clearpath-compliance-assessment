import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySession } from "@/lib/session";
import { getMySubmissions } from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";

export default async function Home() {
  const user = await verifySession();
  if (!user) redirect("/login");

  const mySubmissions = user.is_marketer ? await getMySubmissions(user.id) : [];

  return (
    <div>
      <div className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-slate-600">
          Replaces the Excel-and-email review process with a structured queue, a real audit
          trail, and compliance-specific review criteria.
        </p>
      </div>

      {user.is_marketer && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Your submissions</h2>
            <Link href="/submit" className="btn-primary px-3 py-1.5 text-sm">
              + New submission
            </Link>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mySubmissions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                      No submissions yet — create one to get started.
                    </td>
                  </tr>
                )}
                {mySubmissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {s.title}
                      <span className="ml-2 text-xs font-normal text-slate-400">v{s.version}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/status/${s.id}`} className="text-xs text-indigo-600 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {user.is_reviewer && (
        <Link
          href="/review"
          className="card group block max-w-md p-6 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
        >
          <div className="text-2xl">✅</div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Compliance team
          </div>
          <div className="mt-1.5 text-lg font-semibold text-slate-900">Compliance review queue</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Claim submissions, review against marketing-compliance criteria, and issue decisions.
          </p>
          <div className="mt-4 text-sm font-medium text-indigo-600 group-hover:underline">Go →</div>
        </Link>
      )}
    </div>
  );
}
