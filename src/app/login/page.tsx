import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md animate-fade-in-up">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-600">Welcome back to the ClearPath Compliance Review Portal.</p>
        <LoginForm />
      </div>
    </div>
  );
}
