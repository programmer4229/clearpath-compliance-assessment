# ClearPath Compliance Review Portal — MVP PRD

## Problem

ClearPath's compliance marketing team reviews and approves marketing content (from in-house marketing and affiliate partners) via Excel + email, which bottlenecks growth. This MVP replaces that with a structured submission-and-review portal to fix the two root failures of the current process: no visibility/status tracking, and no closed feedback loop.

## Goals (this MVP)

- Give submitters a structured way to submit text and image/PDF marketing content, with enough identity to know who they are and how to reach them.
- Give compliance reviewers a queue with real status, a claim mechanic (no duplicate work), and a focused review UI.
- Make review decisions structured, auditable, and tied to real marketing-compliance criteria — not generic content checks.
- Close the loop: submitters see their status and feedback in-platform, not only by email.
- Revisions return to the same reviewer, preserving context and avoiding re-review from scratch.

## Non-Goals (explicitly out of scope for this MVP)

- **Video submissions.** Deferred — raw video upload/storage/playback is a disproportionate engineering cost for the weakest part of the throughput story. Noted as future work.
- **AI-assisted review/pre-screening.** Deferred until the submission/review workflow itself is solid. Noted as the next lever once this backbone exists (speeds up per-item review time, not just coordination).

## Roles

Every person signs up for one account (see `src/lib/session.ts`, `src/app/actions.ts` —
`signupAction`/`loginAction`). Signup asks first whether the person is a **ClearPath
employee** or an **affiliate partner**; employees then choose at least one of:

| Role | Description |
|---|---|
| **In-house marketer** | Submits content for approval. (Affiliate partners are always this role — they submit on behalf of their company and never review.) |
| **Compliance Reviewer** | Reviews queued submissions, completes a checklist, and issues a decision. |

An employee can hold both roles on one account. **A marketer+reviewer account can never
review its own submissions** — enforced server-side, atomically, in
`claimSubmission()`'s WHERE clause (`src/lib/queries.ts`), not just hidden in the UI;
see `scripts/e2e-self-review.mjs` for the regression test that calls that query directly
and confirms it. Submitter and reviewer identity throughout the submit/review flows
comes from the logged-in session (`verifySession()`) — there's no manual name/email
entry or cookie-picked reviewer left anywhere in the app.

## Core Flows

### 0. Home
Landing page after login, adapted to the account's roles: a marketer or affiliate sees a table of their own submissions and status with a button to start a new one; a reviewer additionally (or only) sees a card into the review queue. See `src/app/page.tsx`.

### 1. Submission
Submitter fills a form: title, product type (personal loan / credit card / mortgage prequalification), body text and/or image or PDF attachment(s) — identity (name, email, account type, affiliate company) comes from the signed-in account, not re-entered. On submit, status = **New**. Submitter is shown a confirmation and their submission appears on their home dashboard.

### 2. Review Queue
Reviewers land on a list of all submissions with status, product type, submitter type, and age. A separate "My Queue" view shows submissions they've claimed. Reviewers claim an unclaimed submission (first-click wins) to begin review; this prevents two reviewers duplicating work. A reviewer's own submissions are visibly excluded from claiming (see Roles, above).

### 3. Review
Clicking a submission opens a split view: submission content (text/images/PDF) on the left, a review form on the right. The form is a checklist of marketing-compliance criteria (below), each with Pass / Fail / N/A and a note field, plus an overall feedback field. The reviewer submits one of three decisions:

- **Approve** — terminal, submitter notified.
- **Request Changes** — submission returns to submitter with the checklist feedback; stays assigned to the same reviewer.
- **Reject** — terminal, submitter notified with reasoning.

### 4. Revision
If changes are requested, the submitter edits and resubmits from their status page. The resubmission is linked to the original submission (version history), status becomes **Resubmitted**, and it routes directly back to the same reviewer's queue — not the general pool — so it's picked up with full context rather than re-read from scratch.

### 5. Status Visibility
A submitter's own submissions are always visible on their home dashboard; each links to a detail page with live status, the reviewer's checklist feedback (on changes-requested/reject), and version history. That detail page is restricted to the owning submitter — not the pre-login "anyone with the URL" model. Email notifications fire on every decision as a secondary channel, not the only one.

## Status Taxonomy

`New` (unclaimed) → `In Review` (claimed) → **Approve** → `Approved` *(terminal)*
`In Review` → **Request Changes** → `Changes Requested` (submitter's turn) → submitter resubmits → `Resubmitted` (back to same reviewer) → `In Review`
`In Review` → **Reject** → `Rejected` *(terminal)*

## Compliance Checklist Criteria (v1)

Replaces generic "confidential / harmful" checks with criteria specific to consumer-finance marketing review:

1. **Rate/APR Disclosure (Reg Z / TILA)** — If a rate or payment is advertised, is the APR disclosed with required prominence and proximity?
2. **No Guaranteed-Approval Claims (UDAAP)** — Does the content avoid implying guaranteed approval, "no credit check," or otherwise overstating approval certainty?
3. **Prequalification Disclaimer** — If referencing prequalification/preapproval, is there a clear "not a commitment to lend" disclaimer distinguishing it from final approval?
4. **Non-Discriminatory Language (ECOA)** — Is the content free of language or targeting that could be construed as discriminatory on a prohibited basis?
5. **Required Licensing Disclosures** — For mortgage content, are the NMLS ID and Equal Housing Lender disclosure present?
6. **Affiliate Endorsement Disclosure (FTC)** — If submitted by an affiliate, is the material connection/compensation relationship clearly disclosed?
7. **Accurate Product Representation** — Are stated rates, fees, terms, or benefits accurate and consistent with current approved product terms?
8. **No Confidential/Proprietary Information** — Does the content avoid unreleased terms, internal data, or proprietary information?

## Data Model (high level)

- **User** — name, email, password hash, account type (employee/affiliate), affiliate company, is_marketer, is_reviewer — the one identity source for both submitting and reviewing
- **Submission** — title, product type, body text, status, submitter (a User), assigned reviewer (a User), parent submission (for revisions), version number, timestamps
- **Attachment** — submission id, file type (image/PDF), storage URL
- **ChecklistResponse** — submission id, criterion id, result (pass/fail/n-a), note
- **ReviewDecision** — submission id, reviewer, decision, feedback text, timestamp *(append-only — doubles as the audit trail)*

## Success Signal (how this claims to increase throughput)

- Time from submission to final decision (should trend down as coordination overhead drops).
- Revisions resolved by the original reviewer without reassignment (context preserved = faster re-review).
- Queue depth and per-reviewer claimed load, visible instead of hidden in inboxes.

## Future Work (explicitly not in this MVP)

- AI-assisted pre-screening: flag likely-risky passages against the checklist criteria above before human review, to cut per-item review time — advisory only, never auto-decides.
- Video submissions (initially as hosted links, e.g. unlisted YouTube/TikTok, rather than raw upload).
- Reviewer workload balancing / auto-assignment.
