# ClearPath Compliance Review Portal

A take-home submission for a product engineering role at PromptArmor, for a
fictional client, ClearPath Financial. This README details the following: the
problem as I read it, what I assumed, how the solution addresses it, what I'd do
next, and how to test it. For the tech stack, the screen-by-screen user flow, and the
data model, see [`docs/PRD.md`](docs/PRD.md).

## The bottleneck, as interpreted

ClearPath's compliance marketing review runs on Excel and email. I interpreted that as
two compounding failures, not one:

1. **No shared visibility** — status lives in someone's inbox or a spreadsheet
   row, not anywhere both sides can see it. Submitters can't tell if anyone's
   looked yet, and nothing stops two reviewers duplicating the same work.
2. **No closed feedback loop** — reviewer feedback sent over email isn't attached
   to anything durable. On a second pass, the context of what was wrong gets
   reconstructed from a thread instead of living with the submission.

This solution's scope is fixing those two failures — the checklist, claim mechanism, and
version history all follow from that.

## Assumptions Made

- One account can be a marketer, a reviewer, or both (chosen at signup) — no
  separate admin/compliance-manager role. This assumes the marketing team can
  review their peers' marketing submission for compliance gaps.
- Affiliates submit but never review, enforced at signup, not left to the honor
  system.
- One reviewer per submission, first-click claim — no multi-approver sign-off.
- A resubmission routes back to the *same* reviewer, not the general pool — I
  weighed context continuity against load balancing and bet on continuity at this
  team's likely scale.
- Single organization, single queue — no multi-tenant separation between
  affiliate programs.
- The eight compliance criteria are illustrative of what a consumer-finance
  compliance team checks, not a definitive legal checklist — we're not lawyers.
  In a real-world application, I would discuss the specific criteria with the
  company's compliance officers before building.
- Standard cloud infra (Vercel + hosted Postgres via Supabase) was fair game

## The Solution At a High Level
I created a marketing compliance review interface. An affiliate or a marketer at ClearPath
can create a submission which includes the text for the marketing ad and optionally a pdf or image.
Once they submit, the submission is added to a list where a compliance reviewer can claim it for review.
Once claimed, the reviewer simply fills out the review form, going through different compliance-related
questions and marking them as pass fail or n/a and optionally leaving a note. The reviewer submits this, either
approving, rejecting, or requesting changes to the submission. The submitter can view the status of their submission
on their end, see the reviewer's feedback, and resubmit if necessary. 

## How the solution addresses the bottleneck

**No shared visibility →** submitters get a dashboard of their submissions and
status; reviewers get a queue with real status and an atomically-enforced claim
mechanism, so ownership is always visible and never duplicated.

**No closed feedback loop →** review decisions are structured (pass/fail/N/A per
criterion, notes, required overall feedback) and shown to the submitter in-platform
before they touch the resubmit form. `review_decisions` is append-only, so every
decision on every version is preserved — a real audit trail the old process
couldn't guarantee.

**Context loss on revision →** a resubmission is an explicit new version linked to
its parent, routed straight back to the same reviewer, so nobody re-reviews from
scratch.


## What I'd build next

- AI-assisted pre-screening against the checklist (advisory only, never
  auto-decides)
  - Decided against this as a main feature because although this could be helpful,
    over-reliance on this feature could be dangerous since failing compliance can
    put the company is serious legal trouble. I felt it was more important to solve
    the bottlenecks addressed above concretely than spend time implementing a
    feature that could do more harm than good.
- Email when submission is reviewed
  - This is basically already implemented, I planned to implement with Resend API but
    did not because I was not able to set it up with the vercel domain and it seemed out
    of scope to create a whole domain and email address for this assessment. Easy next step
    were I to actually deploy this project as an actual product, the email message is already
    logged when a submission is reviewed, would just need to connect to Resend API
    in order to send the actual email.
- Native video submission support
  - While video marketing has gotten increasing popular in the last few years, especially short form,
    it is not as common for banks therefore I decided to leave it as a feature to implement
    in the future if need rises.
- Tutorial for Use + Excel Upload
  - Tutorial would help onboard employees to this new software, Excel upload would ensure a seamless
    transition from previous Excel system to this tool so the website could act as a single source of
    truth throughout the transition process
- Reviewer workload balancing instead of a flat first-click queue
- Broader automated test coverage — there are two Playwright scripts covering the
  core loop and the self-review guard, not full unit/edge-case coverage.
- An admin UI for the checklist criteria (currently seeded via SQL).
  - Would allow compliance experts to directly update criteria based on changing laws 
- Audit-trail export/reporting
  - Would be helpful for analytics, for example determining the quality of work provided
    by an affiliate company
- Multi-organization support, if ClearPath ever needed genuinely separate queues.
  - Other areas of the company besides marketing could need compliance reviews, this version
    is a strong foundation for a system that could support multiple compliance review types.

## How to test this

Create two accounts to exercise every role: one **ClearPath employee** with the
**Compliance reviewer** box checked, and one **affiliate partner**. (An account can
be both marketer and reviewer, but testing with two separate accounts is the only
way to see the self-review guard and the full two-sided flow.)

1. **Sign up as the affiliate** → you land on an empty dashboard. Click **+ New
   submission**, fill in a title, product type, and body text, and submit.
   You're taken to its status page, and it now shows in **Your submissions**.
3. **Sign out, sign up as the reviewer employee** → the dashboard shows a
   **Compliance review queue** card instead. Open it; the affiliate's submission
   is listed as unclaimed. Click **Claim**, which opens the checklist. Mark the
   guaranteed-approval criterion **Fail** with a note, everything else **Pass**,
   add overall feedback, and click **Request changes**.
   - I also left a submission in the queue from my testing so you can view that as
     well and claim it.
5. **Sign out, sign back in as the affiliate** → open the submission from your
   dashboard. You'll see the per-criterion result, the reviewer's note on the
   failed one, and their overall feedback, formatted for reading — this is the
   closed feedback loop. Edit the body text and click **Submit revision**.
6. **Sign back in as the reviewer** → open **My queue**; the resubmission is
   there, still assigned to you (not the general pool). Open it, mark everything
   **Pass**, and click **Approve**.
7. **Sign back in as the affiliate** → the status page now shows **Approved**,
   with both versions and the full decision history still visible.

To see the self-review guard specifically: sign up a third account as a ClearPath
employee with *both* **In-house marketer** and **Compliance reviewer** checked,
submit something, then go to the review queue — that row shows "Not reviewable by
you" instead of a Claim button, because the same account submitted it.
