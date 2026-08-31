import Link from "next/link";

const cards = [
  {
    href: "/submit",
    title: "Submit marketing content",
    audience: "In-house marketers & affiliates",
    body: "Send text, image, or PDF marketing content for compliance review before it goes live.",
  },
  {
    href: "/status",
    title: "Check submission status",
    audience: "Submitters",
    body: "Look up your submissions by email to see status, reviewer feedback, and history.",
  },
  {
    href: "/review",
    title: "Compliance review queue",
    audience: "Compliance team",
    body: "Claim submissions, review against marketing-compliance criteria, and issue decisions.",
  },
];

export default function Home() {
  return (
    <div>
      <div className="mb-10 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Compliance Review Portal</h1>
        <p className="mt-2 text-slate-600">
          Replaces the Excel-and-email review process with a structured queue, a real audit
          trail, and compliance-specific review criteria.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="block rounded-xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              {c.audience}
            </div>
            <div className="mt-2 text-lg font-semibold">{c.title}</div>
            <p className="mt-2 text-sm text-slate-600">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
