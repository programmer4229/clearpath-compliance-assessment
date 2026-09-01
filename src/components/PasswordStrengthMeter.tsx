// Live client-side password strength feedback for the signup form. Purely
// advisory — it doesn't gate submission (the actual minimum, 8 characters,
// is still enforced by the field's minLength and re-checked server-side in
// signupAction) — but nudging people toward a stronger password at the
// point of account creation is one of the cheapest, highest-leverage
// account-security wins available.
const CRITERIA: { label: string; test: (pw: string) => boolean }[] = [
  { label: "at least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "12 or more characters", test: (pw) => pw.length >= 12 },
  { label: "upper & lower case", test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { label: "a number", test: (pw) => /\d/.test(pw) },
  { label: "a symbol", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

// Indexed by score (0..CRITERIA.length, inclusive) — one more entry than
// there are criteria, since "meets every criterion" is its own score.
const LEVELS = [
  { label: "Very weak", barClassName: "bg-rose-500", textClassName: "text-rose-600" },
  { label: "Weak", barClassName: "bg-rose-500", textClassName: "text-rose-600" },
  { label: "Fair", barClassName: "bg-amber-500", textClassName: "text-amber-600" },
  { label: "Good", barClassName: "bg-teal-500", textClassName: "text-teal-600" },
  { label: "Strong", barClassName: "bg-emerald-500", textClassName: "text-emerald-600" },
  { label: "Very strong", barClassName: "bg-emerald-600", textClassName: "text-emerald-700" },
];

export function scorePassword(password: string) {
  return CRITERIA.reduce((score, c) => score + (c.test(password) ? 1 : 0), 0);
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const score = scorePassword(password);
  const level = LEVELS[score] ?? LEVELS[LEVELS.length - 1]!;

  return (
    <div className="mt-2 animate-fade-in-up">
      <div className="flex gap-1">
        {CRITERIA.map((_, i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${level.barClassName}`}
              style={{ width: i < score ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>
      <div className={`mt-1.5 text-xs font-medium transition-colors duration-200 ${level.textClassName}`}>
        {level.label}
      </div>
      {/* Every criterion, always listed in full (never truncated) — wraps
          onto as many lines as it needs rather than being clipped. */}
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {CRITERIA.map((c) => {
          const met = c.test(password);
          return (
            <li
              key={c.label}
              className={`flex items-center gap-1 text-xs transition-colors duration-200 ${
                met ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              <span aria-hidden="true">{met ? "✓" : "○"}</span>
              {c.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
