"use client";

// Route-segment error boundary (node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md)
// — this version's convention passes `retry`, not the `reset` name older
// Next.js docs use, so check that file before "fixing" this signature.
//
// Every Server Action in src/app/actions.ts throws a plain Error for
// expected validation failures (missing content, wrong product type, a
// decision made on a submission that isn't yours, etc.) rather than
// returning field-scoped state — see the comment on AuthFormState for why
// signup/login are the exception. Without this boundary, any of those
// throws — including ones a normal user can trigger just by leaving a
// required field empty in an unusual combination — hit Next's bare default
// error UI instead of something that looks like the rest of this app.
//
// error.message is NOT safe to render here in production: Next strips
// thrown Server Action/Component error messages before they reach the
// client (by design — see the Next docs' "Handling expected errors"
// section, which is exactly why signup/login use useActionState instead of
// throwing), so in a real deployment this would otherwise show something
// like "Minified React error #441" instead of anything a user could act
// on. Dev mode doesn't strip it, so showing it there is still useful for
// debugging. A more thorough fix would move these four actions onto the
// same useActionState/field-error pattern signup/login already use, so the
// real validation message reaches the client safely in production too —
// worth doing if this app keeps growing past this assessment.
import Link from "next/link";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const detail =
    process.env.NODE_ENV !== "production"
      ? error.message
      : "Double-check the form — every required field needs a value (for a submission, that " +
        "includes body text or at least one attachment) — then try again.";

  return (
    <div className="mx-auto mt-16 max-w-md animate-fade-in-up text-center">
      <div className="card p-6">
        <div className="text-2xl">⚠️</div>
        <h1 className="mt-3 text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">{detail}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={() => retry()} className="btn-primary px-4 py-2 text-sm">
            Try again
          </button>
          <Link href="/" className="btn-secondary px-4 py-2 text-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
