"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "@/app/actions";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  // Controlled so a failed attempt doesn't also wipe the email the person
  // typed — see the comment in SignupForm.tsx for why React does this.
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state.message && <div className="banner-warning">{state.message}</div>}

      <label className="field-label">
        Email
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="input"
        />
      </label>

      <label className="field-label">
        Password
        <input type="password" name="password" required className="input" />
      </label>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Logging in…" : "Log in"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Need an account?{" "}
        <Link href="/signup" className="font-medium text-teal-600 hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
