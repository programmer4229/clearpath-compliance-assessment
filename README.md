# ClearPath Compliance Review Portal

A take-home submission for a product engineering role at PromptArmor, for a
fictional client, ClearPath Financial. This is the reviewer-facing writeup: the
problem as we read it, what we assumed, how the solution addresses it, what we'd do
next, and how to test it. For the tech stack, the screen-by-screen user flow, the
data model, and local setup, see [`docs/PRD.md`](docs/PRD.md).

## The bottleneck, as we read it

ClearPath's compliance marketing review runs on Excel and email. We read that as
two compounding failures, not one:

1. **No shared visibility** — status lives in someone's inbox or a spreadsheet
   row, not anywhere both sides can see it. Submitters can't tell if anyone's
   looked yet, and nothing stops two reviewers duplicating the same work.
2. **No closed feedback loop** — reviewer feedback sent over email isn't attached
   to anything durable. On a second pass, the context of what was wrong gets
   reconstructed from a thread instead of living with the submission.

This MVP's scope is fixing those two failures — the checklist, claim mechanic, and
version history all follow from that, rather than from a feature list.

## Assumptions we made

- One account can be a marketer, a reviewer, or both (chosen at signup) — no
  separate admin/compliance-manager role.
- Affiliates submit but never review, enforced at signup, not left to the honor
  system.
- One reviewer per submission, first-click claim — no multi-approver sign-off.
- A resubmission routes back to the *same* reviewer, not the general pool — we
  weighed context continuity against load balancing and bet on continuity at this
  team's likely scale.
- Video is explicitly out of scope for this MVP (see Future Work).
- Single organization, single queue — no multi-tenant separation between
  affiliate programs.
- The eight compliance criteria are illustrative of what a consumer-finance
  compliance team checks, not a definitive legal checklist — we're not lawyers.
- Standard cloud infra (Vercel + hosted Postgres) was fair game; nothing implied
  an on-prem constraint.

## How the solution addresses the bottleneck

**No shared visibility →** submitters get a dashboard of their submissions and
status; reviewers get a queue with real status and an atomically-enforced claim
mechanic, so ownership is always visible and never duplicated.

**No closed feedback loop →** review decisions are structured (pass/fail/N/A per
criterion, notes, required overall feedback) and shown to the submitter in-platform
before they touch the resubmit form. `review_decisions` is append-only, so every
decision on every version is preserved — a real audit trail the old process
couldn't guarantee.

**Context loss on revision →** a resubmission is an explicit new version linked to
its parent, routed straight back to the same reviewer, so nobody re-reviews from
scratch.

## Decisions worth flagging

- **Kysely instead of Prisma** — Prisma's engine download failed repeatedly in
  this sandbox (native-binary fetch issue). Kysely is a typed query builder with
  nothing native to fetch.
- **Hand-built session auth**, not a third-party provider — signed httpOnly-cookie
  JWTs, re-verified against the DB on every request, following Next.js's
  documented pattern. Keeps the auth model fully inspectable for this assessment,
  at the cost of not getting OAuth/password-reset for free.
- **Self-review guard lives in the claim query itself** (`UPDATE ... WHERE
  submitter_id != reviewerId`), not just the UI, so a marketer+reviewer account
  can't claim its own submission even via a direct API call. Proven by
  `scripts/e2e-self-review.mjs`, which runs that exact SQL directly against
  Postgres, bypassing the app entirely.
- **Attachments upload straight from the browser to Vercel Blob**, not through the
  server — Vercel functions silently cap request bodies at 4.5MB, which a
  compliance PDF or phone photo can exceed.
- **Password hashing uses Node's built-in `scrypt`**, not bcrypt/argon2, for the
  same native-binary reason as the Prisma decision.

## What we'd build next

- AI-assisted pre-screening against the checklist (advisory only, never
  auto-decides).
- Native video submission support (currently out of scope).
- Reviewer workload balancing instead of a flat first-click queue.
- Broader automated test coverage — we have two Playwright scripts covering the
  core loop and the self-review guard, not full unit/edge-case coverage.
- An admin UI for the checklist criteria (currently seeded via SQL).
- Audit-trail export/reporting.
- Multi-organization support, if ClearPath ever needed genuinely separate queues.

## How to test this

Create two accounts to exercise every role: one **ClearPath employee** with the
**Compliance reviewer** box checked, and one **affiliate partner**. (An account can
be both marketer and reviewer, but testing with two separate accounts is the only
way to see the self-review guard and the full two-sided flow.)

1. **Sign up as the affiliate** → you land on an empty dashboard. Click **+ New
   submission**, fill in a title, product type, and body text (try something like
   *"Get approved instantly with no credit check!"* to trigger a real compliance
   flag later), and submit. You're taken to its status page, and it now shows in
   **Your submissions**.
2. **Sign out, sign up as the reviewer employee** → the dashboard shows a
   **Compliance review queue** card instead. Open it; the affiliate's submission
   is listed as unclaimed. Click **Claim**, which opens the checklist. Mark the
   guaranteed-approval criterion **Fail** with a note, everything else **Pass**,
   add overall feedback, and click **Request changes**.
3. **Sign out, sign back in as the affiliate** → open the submission from your
   dashboard. You'll see the per-criterion result, the reviewer's note on the
   failed one, and their overall feedback, formatted for reading — this is the
   closed feedback loop. Edit the body text and click **Submit revision**.
4. **Sign back in as the reviewer** → open **My queue**; the resubmission is
   there, still assigned to you (not the general pool). Open it, mark everything
   **Pass**, and click **Approve**.
5. **Sign back in as the affiliate** → the status page now shows **Approved**,
   with both versions and the full decision history still visible.

To see the self-review guard specifically: sign up a third account as a ClearPath
employee with *both* **In-house marketer** and **Compliance reviewer** checked,
submit something, then go to the review queue — that row shows "Not reviewable by
you" instead of a Claim button, because the same account submitted it.
