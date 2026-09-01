# ClearPath Compliance Review Portal — Product & Technical Spec

The product and technical reference: stack, screens, data model, and how to run
this. For why we built it this way, see [`README.md`](../README.md).

## Tech stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + TypeScript + Tailwind
  v4, with **Inter** self-hosted via `@fontsource-variable/inter`.
- **Auth** — signed, httpOnly-cookie JWT sessions (`jose`), verified against the
  database on every request via a cached `verifySession()` (`src/lib/session.ts`).
  Passwords hashed with Node's built-in `scrypt` (`src/lib/auth.ts`). Route
  protection in `src/proxy.ts` redirects logged-out visitors to `/login`; every
  Server Action/route also checks the session itself.
- **Postgres** via `pg` + [Kysely](https://kysely.dev) (typed query builder, no
  ORM).
- **Vercel Blob** for file storage — uploaded directly from the browser
  (`@vercel/blob/client`) using short-lived signed tokens minted by
  `/api/blob-upload`, to stay under Vercel's 4.5MB function request-body cap.
  Stored in a private store; attachments render through the authenticated
  `/api/file` proxy, never a public URL.
- **Resend** for decision-notification emails, with a log-only fallback when no
  API key is set.
- Deployed on **Vercel**, database on **Supabase**.

## Roles

Every person signs up for one account. Signup asks first whether they're a
**ClearPath employee** or an **affiliate partner**; employees then choose at least
one of **In-house marketer** (submits content) or **Compliance reviewer** (reviews
it) — an account can hold both. Affiliates are always marketer-only. A
marketer+reviewer account can never claim or review its own submission — enforced
atomically in `claimSubmission()`'s query (`src/lib/queries.ts`), not just the UI.

## User flow / screens

| Screen | Route | Purpose |
|---|---|---|
| Sign up | `/signup` | Choose employee/affiliate, roles, create account. |
| Log in | `/login` | Email + password → session cookie. |
| Dashboard | `/` | Marketers see their submissions + status; reviewers see a card into the queue. Both, if applicable. |
| Submit | `/submit` | Title, product type, body text, image/PDF attachments. Identity comes from the session, not re-entered. |
| Review queue | `/review` | All submissions (or "My queue") with status, product, submitter, and reviewer. Claim an unclaimed item; a reviewer's own submissions show "Not reviewable by you" instead of Claim. |
| Review detail | `/review/[id]` | Split view: submitted content (with inline image/PDF preview) on the left, the compliance checklist and decision form on the right. Approve / Request changes / Reject. |
| Status detail | `/status/[id]` | The submitter's view of one submission: full version history, each version's checklist results, reviewer feedback, and attachments (same inline preview as the review screen). Resubmit form appears when changes were requested. Visible only to the owning submitter. |

`/status` (no id) is a legacy stub that redirects to `/`.

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

## Local development

1. `npm install`
2. Apply the schema to a reachable Postgres database:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   psql "$DATABASE_URL" -f db/seed.sql   # four demo accounts, password `password123`:
   #   marketer@clearpath.example, reviewer@clearpath.example,
   #   both@clearpath.example, affiliate@partner.example
   ```
3. Copy `.env.example` to `.env.local`, fill in `DATABASE_URL` and
   `SESSION_SECRET` (`openssl rand -base64 32`). Set `BLOB_READ_WRITE_TOKEN` to
   test attachments locally.
4. `npm run dev` → http://localhost:3000.

## Tests

```bash
npm run dev                        # in one terminal
node scripts/e2e-smoke.mjs         # requires `playwright` (npm i -D playwright)
node scripts/e2e-self-review.mjs   # requires DATABASE_URL
```

`e2e-smoke.mjs` drives the full loop end to end (submit → claim → review →
request changes → resubmit → back to the same reviewer) and checks the
self-review guard's UI. `e2e-self-review.mjs` calls `claimSubmission()`'s exact
SQL directly against Postgres with `reviewerId === submitterId`, bypassing the
app entirely, to prove the guard holds at the database level.

## Deploying

1. Push to GitHub, import into Vercel.
2. Create a Blob store in the Vercel project's Storage tab and connect it
   (auto-populates `BLOB_STORE_ID` / `BLOB_WEBHOOK_PUBLIC_KEY`).
3. Set `DATABASE_URL` to Supabase's **Transaction pooler** string (port 6543).
4. Set `SESSION_SECRET`.
5. Apply `db/schema.sql` and `db/seed.sql` to the Supabase database via its SQL
   Editor (see git history / migration notes if bringing an existing deployment
   forward rather than starting fresh).
6. `RESEND_API_KEY` is optional — omit to keep the log-only fallback.
7. Deploy.
