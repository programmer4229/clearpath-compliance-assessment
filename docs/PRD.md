# ClearPath Compliance Review Portal — Product Requirements Document

What we built and how it works, from the product's perspective — requirements, user
flows, screens, and UI design — with a technical reference at the end. For why we
built it this way, see [`README.md`](../README.md).

## Overview

A structured submission-and-review portal for ClearPath's compliance marketing
team, replacing an Excel-and-email process. Two kinds of people use it: **marketers**
(in-house or affiliate) who submit marketing content for approval, and **compliance
reviewers** who check it against regulatory criteria and decide whether it can go
out. One account can be both.

## Roles & accounts

Everyone signs up for one account (`/signup`). Signup asks first whether the person
is a **ClearPath employee** or an **affiliate partner**:

- **Employees** then choose at least one of **In-house marketer** (submits content)
  or **Compliance reviewer** (reviews it) — both can be checked on one account.
- **Affiliate partners** skip that choice — they're always submitters, never
  reviewers, and can optionally name their company.

Identity for both submitting and reviewing comes entirely from the logged-in
session afterward — nobody types a name, email, or picks a reviewer from a
dropdown anywhere in the product.

## Product requirements

**Submission**
- A submitter provides a title, a product type, body text, and/or image/PDF
  attachments (multiple files allowed, 25MB each, `.jpg/.png/.gif/.webp/.pdf`
  only).
- Product type is one of **Personal Loan**, **Credit Card**, **Mortgage
  Prequalification**, or **General Marketing**.
- A submission starts as **New** and is immediately visible on the submitter's
  dashboard.

**Review**
- Reviewers work from a shared queue of every submission, or a filtered view of
  just what they've claimed.
- Claiming is first-click: once claimed, a submission is **In Review** and locked
  to that reviewer until they decide.
- A reviewer can never claim or review their own submission, even if their account
  also has marketer rights — the queue shows "Not reviewable by you" instead of a
  Claim button for those rows.
- A decision requires a Pass/Fail/N-A call (with an optional note) on every one of
  the eight compliance criteria, plus overall feedback (required unless approving),
  before **Approve**, **Request Changes**, or **Reject** can be submitted.

**Feedback & revision**
- Approve and Reject are terminal. Request Changes returns the submission to the
  submitter as **Changes Requested**, with the full checklist result and feedback
  visible to them in-platform.
- A submitter can edit and resubmit; the revision is tracked as a new version
  linked to the original and routes directly back to the same reviewer as
  **Resubmitted** — not the general queue.

**Visibility & notifications**
- A submitter's dashboard lists all their submissions with live status; each links
  to a detail page with the full version history.
- A decision fires an email notification (or logs one, if no email provider key is
  configured) as a secondary channel — the in-product status page is the source of
  truth.

**Access & security**
- The whole app sits behind login; every page and Server Action independently
  verifies the session (not just the route-level redirect).
- Attachments are stored privately and served through an authenticated proxy —
  never a directly-browsable URL.
- A submitter's status page 404s (not "forbidden") for anyone but the owning
  submitter, so a guessed URL doesn't even confirm a submission exists.

## User flows

**Marketer / affiliate**
1. Sign up, choosing employee (marketer role) or affiliate.
2. Land on the dashboard — a table of their submissions (empty state on first
   visit) with a **+ New submission** button.
3. Fill out the submission form and submit; land on that submission's status page
   with a confirmation banner.
4. If a reviewer requests changes, the status page shows the reviewer's
   per-criterion checklist results and overall feedback, plus a **Submit a revised
   version** form pre-filled with the current content.
5. Resubmitting routes back to the same reviewer; the submitter watches status
   update (`Resubmitted` → `In Review` → a terminal decision) from the same page.

**Reviewer**
1. Sign up with the Compliance reviewer role checked (alone or alongside
   marketer).
2. Land on the dashboard — a card into the **Compliance review queue** instead of
   (or alongside) a submissions table.
3. Open the queue: every submission with status, product type, submitter, and
   current reviewer; toggle to **My queue** for just their claimed items.
4. Claim an unclaimed item, which opens the split-screen review detail: submitted
   content on the left, the checklist form on the right.
5. Score every criterion, add notes and overall feedback, and submit a decision;
   land back on the queue.
6. A resubmission from that same submitter appears in **My queue** automatically,
   with the prior decision history still visible above the (now-editable) form.

## Screens & UI

| Screen | Route | What's on it |
|---|---|---|
| Sign up | `/signup` | Employee/affiliate choice, role checkboxes, name/email/password, a live password-strength meter (5-segment bar + all 5 requirements listed, met/unmet). |
| Log in | `/login` | Email + password. |
| Dashboard | `/` | Marketers: submissions table (title, version, status badge, View link) + New submission button. Reviewers: a review-queue card. Both sections show if the account has both roles. |
| Submit | `/submit` | Identity strip ("Submitting as…", with an affiliate badge if applicable), title, product type dropdown, body text, multi-file attachment picker with per-file remove. |
| Review queue | `/review` | All/My-queue pill toggle, a table (title+version, product, submitter with affiliate/"you" tags, status, reviewer, action), Claim/Review/View per row. |
| Review detail | `/review/[id]` | Left: submitted text + inline image preview / embedded PDF viewer + prior decision history. Right: the 8-criterion checklist (title, description, regulation reference, Pass/Fail/N-A, note field) and the decision form. Read-only with an explanatory note when not assigned to the viewer. |
| Status detail | `/status/[id]` | Every version of the submission as its own card: body text, inline attachment preview, a "Compliance checklist notes" section (per-criterion result badge + note) and a "Reviewer feedback" card (color-coded by decision), and the resubmit form when eligible. |

`/status` (no id) is a legacy stub that redirects to `/`.

### Visual design

- **Palette** — a teal accent (gradient from `#14b8a6` to `#0f766e`) on a
  near-white/slate ground, with semantic color reserved for meaning, not
  decoration: emerald for pass/approved, rose for fail/rejected, amber for
  changes-requested/warnings, blue for in-progress states, purple for the
  affiliate tag.
- **Typography** — Inter (self-hosted, not a live Google Fonts request), used
  throughout in place of the OS default system font.
- **Layout** — a sticky, blurred nav bar (picks up a hairline shadow on scroll) with
  the ClearPath mark, role-aware links (Dashboard always, Submit/Review
  conditionally), and the signed-in user's name; a centered max-width content
  column; white bordered "card" surfaces for grouped content throughout.
- **Components** — buttons lift and gain shadow on hover, press down on click;
  status and checklist-result badges use consistent color-coded pills across every
  screen they appear on; the logo mark (gradient teal square, "CP") is reused as
  the site's favicon.
- **Motion** — restrained: page/section content fades and lifts in on load, table
  rows and checklist criteria cascade in with a short stagger, result badges pop
  in — all automatically disabled under `prefers-reduced-motion`.

## Status taxonomy

`New` (unclaimed) → `In Review` (claimed) → **Approve** → `Approved` *(terminal)*
`In Review` → **Request Changes** → `Changes Requested` → submitter resubmits →
`Resubmitted` (back to the same reviewer) → `In Review`
`In Review` → **Reject** → `Rejected` *(terminal)*

## Compliance checklist criteria (v1)

1. **Rate/APR Disclosure** (Reg Z / TILA)
2. **No Guaranteed-Approval Claims** (UDAAP)
3. **Prequalification Disclaimer** (Reg B / UDAAP)
4. **Non-Discriminatory Language** (ECOA)
5. **Required Licensing Disclosures** (SAFE Act / Fair Housing)
6. **Affiliate Endorsement Disclosure** (FTC)
7. **Accurate Product Representation**
8. **No Confidential/Proprietary Information**

Seeded in `db/schema.sql`; each has a title, description, and optional regulation
reference shown to the reviewer.

## Data model

- **User** — name, email, password hash, account type (employee/affiliate),
  affiliate company, `is_marketer`, `is_reviewer`.
- **Submission** — title, product type, body text, status, submitter, assigned
  reviewer, parent submission (for revisions), version, timestamps.
- **Attachment** — submission id, type (image/pdf), storage URL, filename.
- **ChecklistResponse** — submission id, criterion id, result (pass/fail/n-a),
  note. One row per (submission, criterion); upserted on decision.
- **ReviewDecision** — submission id, reviewer, decision, feedback, timestamp.
  Append-only — the audit trail.

See `db/schema.sql` for the full DDL.

## Technical reference

**Stack** — Next.js 16 (App Router, Server Actions, Turbopack) + TypeScript +
Tailwind v4. Auth is hand-rolled: signed httpOnly-cookie JWT sessions (`jose`),
re-verified against Postgres on every request via a cached `verifySession()`;
passwords hashed with Node's built-in `scrypt`. Data access via `pg` + Kysely (a
typed query builder, not an ORM). File storage is Vercel Blob, uploaded directly
from the browser with short-lived signed tokens (to stay under Vercel's 4.5MB
function request-body cap) and served back through an authenticated proxy route.
Email via Resend, with a log-only fallback when no API key is set. Deployed on
Vercel, database on Supabase.

**Local development**
```bash
npm install
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql   # four demo accounts, password `password123`:
#   marketer@clearpath.example, reviewer@clearpath.example,
#   both@clearpath.example, affiliate@partner.example
```
Copy `.env.example` to `.env.local`, fill in `DATABASE_URL` and `SESSION_SECRET`
(`openssl rand -base64 32`); set `BLOB_READ_WRITE_TOKEN` to test attachments
locally. Then `npm run dev` → http://localhost:3000.

**Tests**
```bash
node scripts/e2e-smoke.mjs         # full loop: submit -> claim -> review -> resubmit
node scripts/e2e-self-review.mjs   # proves the self-review guard at the DB level
```

**Deploying** — push to GitHub, import into Vercel, connect a Blob store, set
`DATABASE_URL` (Supabase transaction pooler, port 6543) and `SESSION_SECRET`,
apply `db/schema.sql`/`db/seed.sql` to Supabase via its SQL editor (or the
relevant migration file if bringing an existing deployment forward), and deploy.
`RESEND_API_KEY` is optional.
