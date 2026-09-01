import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md animate-fade-in-up">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sign up to submit marketing content for compliance review, review submissions, or both.
        </p>
        <SignupForm />
      </div>
    </div>
  );
}
