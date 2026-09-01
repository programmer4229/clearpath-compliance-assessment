# ClearPath Compliance Review Portal

A take-home submission for a product engineering role. Replaces ClearPath Financial's
Excel-and-email marketing compliance review process with a structured submission and
review portal. Full product context, scope decisions, and what's explicitly deferred
are in [`docs/PRD.md`](docs/PRD.md).

## Stack

- **Next.js 16** (App Router, Server Actions, Proxy) + TypeScript + Tailwind
- **Auth**: stateless sessions — a signed, httpOnly cookie (see `src/lib/session.ts`),
  passwords hashed with Node's built-in `scrypt` (see `src/lib/auth.ts`), route protection
  via `src/proxy.ts`. Everyone signs up as either a ClearPath employee (choosing in-house
  marketer / compliance reviewer / both) or an affiliate partner, and submitter/reviewer
  identity throughout the app comes from that account — no manual entry, no picking a
  reviewer from a dropdown. An account with both roles can't claim or review its own
  submissions; see `claimSubmission()` in `src/lib/queries.ts`.
- **Postgres** via `pg` + [Kysely](https://kysely.dev) (typed query builder) — not Prisma;
  see the note in `docs/PRD.md` / commit history for why
- **Vercel Blob** for file storage — uploaded directly from the browser (`@vercel/blob/client`),
  not proxied through a Server Action. Vercel Functions hard-cap request bodies at 4.5MB at
  the platform level (before app code runs, so it fails silently — no application log line),
  which a compliance PDF or a phone photo blows past easily. `/api/blob-upload` only brokers
  short-lived upload tokens; see the comment at the top of that route for details.
- **Resend** for email notifications (falls back to server-log "sends" when no API key
  is set, so the full decision flow is demoable without one)
- Deployed on **Vercel**, database on **Supabase**

## Local development

1. `npm install`
2. Have a Postgres database reachable (local or hosted). Apply the schema:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   psql "$DATABASE_URL" -f db/seed.sql   # seeds four demo login accounts
   ```
3. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` and `SESSION_SECRET`
   (generate the latter with `openssl rand -base64 32` — see comments in that file for
   what each variable does and which are optional locally). To test file attachments
   locally, also set `BLOB_READ_WRITE_TOKEN` — attachments upload straight to Blob from
   the browser, so a token is needed even in dev; without one, the form still works for
   text-only submissions and shows a clear inline error if you try to attach a file.
4. `npm run dev` → http://localhost:3000. The whole app sits behind login — sign up, or
   use one of the seed accounts (password `password123` for all of them):
   `marketer@clearpath.example` (in-house marketer), `reviewer@clearpath.example`
   (compliance reviewer), `both@clearpath.example` (both roles),
   `affiliate@partner.example` (affiliate partner).

## End-to-end smoke test

`scripts/e2e-smoke.mjs` is a Playwright script that drives the full loop against a
running instance, logging in/out as different seed accounts along the way: submit (as
the affiliate account, with deliberately non-compliant copy) → reviewer claims →
checklist review fails a criterion → request changes → submitter sees feedback
in-platform → resubmits → confirms it routes back to the *same* reviewer's queue rather
than the general pool → confirms a marketer+reviewer account can't claim its own
submission.

`scripts/e2e-self-review.mjs` tests that last part again, more rigorously: it calls
`claimSubmission()`'s exact SQL directly against Postgres with `reviewerId ===
submitterId`, bypassing the app and its UI entirely, and confirms it's rejected. Needs
`DATABASE_URL` set.

```bash
npm run dev                        # in one terminal
node scripts/e2e-smoke.mjs         # in another; requires `playwright` (npm i -D playwright)
node scripts/e2e-self-review.mjs
```

## Deploying

1. Push this repo to GitHub, import it into Vercel (Next.js is auto-detected).
2. In the Vercel project's **Storage** tab, create a Blob store and connect it to the
   project — this auto-populates `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY`.
3. Set `DATABASE_URL` in the project's Environment Variables to your Supabase
   **Transaction pooler** connection string (port 6543) — pooled, so serverless
   functions don't exhaust Postgres's connection limit.
4. Set `SESSION_SECRET` (generate with `openssl rand -base64 32`) — required, sessions
   can't be created or verified without it.
5. Apply `db/schema.sql` and `db/seed.sql` to the Supabase database once, via its SQL
   Editor (or `psql` from a network that can reach it). This schema evolved in a few
   passes as auth was added — see git history and, if you're bringing an existing
   deployment forward instead of starting fresh, the migration notes sent alongside each
   pass rather than trying to replay `schema.sql` from scratch against a live database.
6. `RESEND_API_KEY` is optional — leave unset to keep the log-only fallback.
7. Deploy.

## What's deliberately out of scope for this MVP

See `docs/PRD.md` > Non-Goals: video submissions (planned as hosted links, not raw
upload), and AI-assisted compliance pre-screening (advisory-only triage layer, next
logical step once this workflow backbone is solid).
