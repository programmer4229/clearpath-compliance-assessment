# ClearPath Compliance Review Portal

A take-home submission for a product engineering role. Replaces ClearPath Financial's
Excel-and-email marketing compliance review process with a structured submission and
review portal. Full product context, scope decisions, and what's explicitly deferred
are in [`docs/PRD.md`](docs/PRD.md).

## Stack

- **Next.js 16** (App Router, Server Actions) + TypeScript + Tailwind
- **Postgres** via `pg` + [Kysely](https://kysely.dev) (typed query builder) — not Prisma;
  see the note in `docs/PRD.md` / commit history for why
- **Vercel Blob** for file storage in production (falls back to local disk in dev)
- **Resend** for email notifications (falls back to server-log "sends" when no API key
  is set, so the full decision flow is demoable without one)
- Deployed on **Vercel**, database on **Supabase**

## Local development

1. `npm install`
2. Have a Postgres database reachable (local or hosted). Apply the schema:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   psql "$DATABASE_URL" -f db/seed.sql   # seeds two demo reviewers
   ```
3. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` (see comments in that
   file for what each variable does and which are optional locally).
4. `npm run dev` → http://localhost:3000

## End-to-end smoke test

`scripts/e2e-smoke.mjs` is a Playwright script that drives the full loop against a
running instance: submit (as an affiliate, with deliberately non-compliant copy) →
reviewer claims → checklist review fails a criterion → request changes → submitter sees
feedback in-platform → resubmits → confirms it routes back to the *same* reviewer's
queue rather than the general pool.

```bash
npm run dev            # in one terminal
node scripts/e2e-smoke.mjs   # in another; requires `playwright` (npm i -D playwright)
```

## Deploying

1. Push this repo to GitHub, import it into Vercel (Next.js is auto-detected).
2. In the Vercel project's **Storage** tab, create a Blob store and connect it to the
   project — this auto-populates `BLOB_READ_WRITE_TOKEN`.
3. Set `DATABASE_URL` in the project's Environment Variables to your Supabase
   **Transaction pooler** connection string (port 6543) — pooled, so serverless
   functions don't exhaust Postgres's connection limit.
4. Apply `db/schema.sql` and `db/seed.sql` to the Supabase database once, via its SQL
   Editor (or `psql` from a network that can reach it).
5. `RESEND_API_KEY` is optional — leave unset to keep the log-only fallback.
6. Deploy.

## What's deliberately out of scope for this MVP

See `docs/PRD.md` > Non-Goals: video submissions (planned as hosted links, not raw
upload), AI-assisted compliance pre-screening (advisory-only triage layer, next
logical step once this workflow backbone is solid), and real authentication (a
role-switcher stands in for both submitter and reviewer identity).
