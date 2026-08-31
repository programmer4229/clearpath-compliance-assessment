import Link from "next/link";

const cards = [
  {
    href: "/submit",
    title: "Submit marketing content",
    audience: "In-house marketers & affiliates",
    body: "Send text, image, or PDF marketing content for compliance review before it goes live.",
    icon: "📤",
  },
  {
    href: "/status",
    title: "Check submission status",
    audience: "Submitters",
    body: "Look up your submissions by email to see status, reviewer feedback, and history.",
    icon: "🔍",
  },
  {
    href: "/review",
    title: "Compliance review queue",
    audience: "Compliance team",
    body: "Claim submissions, review against marketing-compliance criteria, and issue decisions.",
    icon: "✅",
  },
];

export default function Home() {
  return (
    <div>
      <div className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Compliance Review Portal
        </h1>
        <p className="mt-3 text-slate-600">
          Replaces the Excel-and-email review process with a structured queue, a real audit
          trail, and compliance-specific review criteria.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="card group block p-6 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {c.audience}
            </div>
            <div className="mt-1.5 text-lg font-semibold text-slate-900">{c.title}</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.body}</p>
            <div className="mt-4 text-sm font-medium text-indigo-600 group-hover:underline">
              Go →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
