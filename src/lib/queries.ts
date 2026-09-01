import { db, ChecklistResult, DecisionType, ProductType } from "./db";
import { sql } from "kysely";

export function getChecklistCriteria() {
  return db.selectFrom("checklist_criteria").selectAll().orderBy("sort_order").execute();
}

export async function createSubmission(input: {
  title: string;
  productType: ProductType;
  bodyText: string | null;
  submitterId: string;
  attachments: { type: "image" | "pdf"; url: string; filename: string }[];
}) {
  return db.transaction().execute(async (trx) => {
    const submission = await trx
      .insertInto("submissions")
      .values({
        title: input.title,
        product_type: input.productType,
        body_text: input.bodyText,
        submitter_id: input.submitterId,
        status: "new",
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    if (input.attachments.length > 0) {
      await trx
        .insertInto("attachments")
        .values(
          input.attachments.map((a) => ({
            submission_id: submission.id,
            type: a.type,
            storage_url: a.url,
            filename: a.filename,
          }))
        )
        .execute();
    }
    return submission;
  });
}

// Queue listing: latest version of each submission "lineage" (a resubmission
// supersedes its parent in the queue — reviewers work the newest version).
// Includes s.submitter_id (unselected fields like this used to be implicit
// via the join) so the review queue can tell a reviewer apart from their
// own submissions and hide the Claim button — see src/app/review/page.tsx.
export function getQueue() {
  return db
    .selectFrom("submissions as s")
    .leftJoin("users as sub", "sub.id", "s.submitter_id")
    .leftJoin("users as r", "r.id", "s.assigned_reviewer_id")
    .select([
      "s.id",
      "s.title",
      "s.product_type",
      "s.status",
      "s.version",
      "s.created_at",
      "s.updated_at",
      "s.submitter_id",
      "s.assigned_reviewer_id",
      "sub.name as submitter_name",
      "sub.account_type as submitter_account_type",
      "r.name as reviewer_name",
    ])
    .where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom("submissions as child")
            .select("child.id")
            .whereRef("child.parent_submission_id", "=", "s.id")
        )
      )
    )
    .orderBy("s.updated_at", "desc")
    .execute();
}

export async function getSubmissionDetail(id: string) {
  const submission = await db
    .selectFrom("submissions as s")
    .leftJoin("users as sub", "sub.id", "s.submitter_id")
    .leftJoin("users as r", "r.id", "s.assigned_reviewer_id")
    .select([
      "s.id",
      "s.title",
      "s.product_type",
      "s.body_text",
      "s.status",
      "s.version",
      "s.parent_submission_id",
      "s.submitter_id",
      "s.assigned_reviewer_id",
      "s.created_at",
      "s.updated_at",
      "sub.name as submitter_name",
      "sub.email as submitter_email",
      "sub.account_type as submitter_account_type",
      "sub.affiliate_company as affiliate_company",
      "r.name as reviewer_name",
    ])
    .where("s.id", "=", id)
    .executeTakeFirst();
  if (!submission) return null;

  const [attachments, checklistResponses, decisions] = await Promise.all([
    db.selectFrom("attachments").selectAll().where("submission_id", "=", id).execute(),
    db
      .selectFrom("checklist_responses as cr")
      .innerJoin("checklist_criteria as cc", "cc.id", "cr.criterion_id")
      .select([
        "cr.criterion_id",
        "cr.result",
        "cr.note",
        "cc.title",
        "cc.description",
        "cc.regulation_reference",
        "cc.sort_order",
      ])
      .where("cr.submission_id", "=", id)
      .orderBy("cc.sort_order")
      .execute(),
    db
      .selectFrom("review_decisions as d")
      .innerJoin("users as r", "r.id", "d.reviewer_id")
      .select(["d.decision", "d.feedback", "d.created_at", "r.name as reviewer_name"])
      .where("d.submission_id", "=", id)
      .orderBy("d.created_at", "asc")
      .execute(),
  ]);

  return { submission, attachments, checklistResponses, decisions };
}

// Full lineage (original + every resubmission), oldest first — used on the
// submitter status page so they can see their whole history for one thread.
export async function getSubmissionLineage(id: string) {
  const root = await sql<{ id: string }>`
    with recursive up as (
      select id, parent_submission_id from submissions where id = ${id}
      union all
      select s.id, s.parent_submission_id
      from submissions s
      join up on s.id = up.parent_submission_id
    )
    select id from up where parent_submission_id is null
  `.execute(db);
  const rootId = root.rows[0]?.id ?? id;

  const lineage = await sql<{ id: string }>`
    with recursive down as (
      select id, parent_submission_id, version from submissions where id = ${rootId}
      union all
      select s.id, s.parent_submission_id, s.version
      from submissions s
      join down on s.parent_submission_id = down.id
    )
    select id from down order by version asc
  `.execute(db);

  return Promise.all(lineage.rows.map((r) => getSubmissionDetail(r.id)));
}

// The logged-in user's own submissions (latest version of each lineage) —
// powers the "my submissions" dashboard on the home page.
export function getMySubmissions(submitterId: string) {
  return db
    .selectFrom("submissions as s")
    .select(["s.id", "s.title", "s.status", "s.version", "s.parent_submission_id", "s.updated_at"])
    .where("s.submitter_id", "=", submitterId)
    .where("s.id", "not in", (eb) =>
      eb
        .selectFrom("submissions as child")
        .select("child.parent_submission_id")
        .where("child.parent_submission_id", "is not", null)
    )
    .orderBy("s.updated_at", "desc")
    .execute();
}

export async function claimSubmission(submissionId: string, reviewerId: string) {
  // First click wins: only claim if still unclaimed. The submitter_id !=
  // reviewerId condition is the actual enforcement of "can't review your
  // own submission" — done atomically here (not as a separate check before
  // this update) so there's no race between checking and claiming, and no
  // way to bypass it by calling claimSubmission directly instead of going
  // through the UI.
  const result = await db
    .updateTable("submissions")
    .set({ status: "in_review", assigned_reviewer_id: reviewerId, updated_at: new Date() })
    .where("id", "=", submissionId)
    .where("status", "=", "new")
    .where("submitter_id", "!=", reviewerId)
    .executeTakeFirst();
  return Number(result.numUpdatedRows) > 0;
}

export async function submitDecision(input: {
  submissionId: string;
  reviewerId: string;
  decision: DecisionType;
  feedback: string | null;
  checklist: { criterionId: string; result: ChecklistResult; note: string | null }[];
}) {
  return db.transaction().execute(async (trx) => {
    // Defense in depth alongside claimSubmission's atomic guard: a
    // submission should never be assigned to its own submitter, but this
    // makes sure a decision can't be recorded for one even if that
    // invariant were ever violated some other way.
    const submission = await trx
      .selectFrom("submissions")
      .select(["submitter_id"])
      .where("id", "=", input.submissionId)
      .executeTakeFirstOrThrow();
    if (submission.submitter_id === input.reviewerId) {
      throw new Error("You can't review your own submission.");
    }

    for (const item of input.checklist) {
      await trx
        .insertInto("checklist_responses")
        .values({
          submission_id: input.submissionId,
          criterion_id: item.criterionId,
          result: item.result,
          note: item.note,
        })
        .onConflict((oc) =>
          oc.columns(["submission_id", "criterion_id"]).doUpdateSet({
            result: item.result,
            note: item.note,
          })
        )
        .execute();
    }

    await trx
      .insertInto("review_decisions")
      .values({
        submission_id: input.submissionId,
        reviewer_id: input.reviewerId,
        decision: input.decision,
        feedback: input.feedback,
      })
      .execute();

    const newStatus =
      input.decision === "approved"
        ? "approved"
        : input.decision === "rejected"
          ? "rejected"
          : "changes_requested";

    return trx
      .updateTable("submissions")
      .set({ status: newStatus, updated_at: new Date() })
      .where("id", "=", input.submissionId)
      .returningAll()
      .executeTakeFirstOrThrow();
  });
}

// Revision: creates a new submission row linked to the parent, carries the
// same reviewer forward (continuity — see PRD), status = resubmitted.
export async function resubmitSubmission(input: {
  parentId: string;
  title: string;
  productType: ProductType;
  bodyText: string | null;
  attachments: { type: "image" | "pdf"; url: string; filename: string }[];
}) {
  const parent = await db
    .selectFrom("submissions")
    .selectAll()
    .where("id", "=", input.parentId)
    .executeTakeFirstOrThrow();

  return db.transaction().execute(async (trx) => {
    const next = await trx
      .insertInto("submissions")
      .values({
        title: input.title,
        product_type: input.productType,
        body_text: input.bodyText,
        submitter_id: parent.submitter_id,
        status: "resubmitted",
        assigned_reviewer_id: parent.assigned_reviewer_id,
        parent_submission_id: parent.id,
        version: parent.version + 1,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    if (input.attachments.length > 0) {
      await trx
        .insertInto("attachments")
        .values(
          input.attachments.map((a) => ({
            submission_id: next.id,
            type: a.type,
            storage_url: a.url,
            filename: a.filename,
          }))
        )
        .execute();
    }
    return next;
  });
}
