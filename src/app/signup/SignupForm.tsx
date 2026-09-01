"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupAction, type AuthFormState } from "@/app/actions";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

const initialState: AuthFormState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  // These fields are controlled (rather than plain uncontrolled inputs)
  // because React resets a <form>'s fields after any action bound to it
  // completes — including a failed one. Without this, a validation error
  // (e.g. a role not selected) would silently wipe the name/email/password
  // the person already typed, forcing them to redo the whole form. Password
  // fields are the one deliberate exception: those are left uncontrolled so
  // they clear on error, which is the normal, expected pattern.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<"employee" | "affiliate" | "">("");
  const [affiliateCompany, setAffiliateCompany] = useState("");
  const [isMarketer, setIsMarketer] = useState(false);
  const [isReviewer, setIsReviewer] = useState(false);
  // Not the actual field value (the password input stays uncontrolled on
  // purpose — see the comment above) — just a mirror for the strength
  // meter. Reset it whenever the action produces a new state object (i.e.
  // right after a failed submit resets the form fields), so the meter
  // doesn't keep showing a score for a field that's visually empty again.
  // Adjusted during render (not an effect) — this is React's documented
  // pattern for resetting state in response to a prop/value change.
  const [password, setPassword] = useState("");
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setPassword("");
  }

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state.message && <div className="banner-warning">{state.message}</div>}

      <fieldset className="space-y-2">
        <legend className="field-label">I&apos;m signing up as a…</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={
              "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm " +
              (accountType === "employee"
                ? "border-teal-300 bg-teal-50 text-teal-800"
                : "border-slate-300 text-slate-700 hover:bg-slate-50")
            }
          >
            <input
              type="radio"
              name="accountType"
              value="employee"
              checked={accountType === "employee"}
              onChange={() => setAccountType("employee")}
              className="accent-teal-600"
            />
            ClearPath employee
          </label>
          <label
            className={
              "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm " +
              (accountType === "affiliate"
                ? "border-teal-300 bg-teal-50 text-teal-800"
                : "border-slate-300 text-slate-700 hover:bg-slate-50")
            }
          >
            <input
              type="radio"
              name="accountType"
              value="affiliate"
              checked={accountType === "affiliate"}
              onChange={() => setAccountType("affiliate")}
              className="accent-teal-600"
            />
            Affiliate partner
          </label>
        </div>
        {state.errors?.accountType && <p className="text-xs text-rose-600">{state.errors.accountType}</p>}
      </fieldset>

      {accountType === "employee" && (
        <fieldset className="space-y-2 rounded-md bg-slate-50 p-3">
          <legend className="field-label px-1">Your role (select at least one)</legend>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isMarketer"
              checked={isMarketer}
              onChange={(e) => setIsMarketer(e.target.checked)}
              className="accent-teal-600"
            />
            In-house marketer — I submit content for review
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="isReviewer"
              checked={isReviewer}
              onChange={(e) => setIsReviewer(e.target.checked)}
              className="accent-teal-600"
            />
            Compliance reviewer — I review submitted content
          </label>
          <p className="text-xs text-slate-500">
            You won&apos;t be able to review your own submissions, even if you hold both roles.
          </p>
          {state.errors?.role && <p className="text-xs text-rose-600">{state.errors.role}</p>}
        </fieldset>
      )}

      {accountType === "affiliate" && (
        <label className="field-label">
          Company (optional)
          <input
            name="affiliateCompany"
            value={affiliateCompany}
            onChange={(e) => setAffiliateCompany(e.target.value)}
            className="input"
            placeholder="e.g. Partner Lending Co."
          />
        </label>
      )}

      <label className="field-label">
        Full name
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="input"
        />
        {state.errors?.name && <p className="mt-1 text-xs text-rose-600">{state.errors.name}</p>}
      </label>

      <label className="field-label">
        Email
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input"
        />
        {state.errors?.email && <p className="mt-1 text-xs text-rose-600">{state.errors.email}</p>}
      </label>

      <label className="field-label">
        Password
        <input
          type="password"
          name="password"
          required
          minLength={8}
          className="input"
          onChange={(e) => setPassword(e.target.value)}
        />
        {state.errors?.password && <p className="mt-1 text-xs text-rose-600">{state.errors.password}</p>}
      </label>
      <PasswordStrengthMeter password={password} />

      <label className="field-label">
        Confirm password
        <input type="password" name="confirmPassword" required minLength={8} className="input" />
        {state.errors?.confirmPassword && (
          <p className="mt-1 text-xs text-rose-600">{state.errors.confirmPassword}</p>
        )}
      </label>

      <button type="submit" disabled={pending || !accountType} className="btn-primary w-full">
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-teal-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
