import { Pool } from "pg";
import { Kysely, PostgresDialect, Generated } from "kysely";

export type SubmitterType = "in_house" | "affiliate";
export type ProductType = "personal_loan" | "credit_card" | "mortgage_prequalification";
export type SubmissionStatus =
  | "new"
  | "in_review"
  | "changes_requested"
  | "resubmitted"
  | "approved"
  | "rejected";
export type ChecklistResult = "pass" | "fail" | "not_applicable";
export type DecisionType = "approved" | "changes_requested" | "rejected";
export type AttachmentType = "image" | "pdf";

export interface SubmittersTable {
  id: Generated<string>;
  name: string;
  email: string;
  type: SubmitterType;
  affiliate_company: string | null;
  created_at: Generated<Date>;
}

export interface ReviewersTable {
  id: Generated<string>;
  name: string;
  email: string;
  created_at: Generated<Date>;
}

export interface ChecklistCriteriaTable {
  id: string;
  sort_order: number;
  title: string;
  description: string;
  regulation_reference: string | null;
}

export interface SubmissionsTable {
  id: Generated<string>;
  title: string;
  product_type: ProductType;
  body_text: string | null;
  submitter_id: string;
  status: Generated<SubmissionStatus>;
  assigned_reviewer_id: string | null;
  parent_submission_id: string | null;
  version: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface AttachmentsTable {
  id: Generated<string>;
  submission_id: string;
  type: AttachmentType;
  storage_url: string;
  filename: string;
  created_at: Generated<Date>;
}

export interface ChecklistResponsesTable {
  id: Generated<string>;
  submission_id: string;
  criterion_id: string;
  result: ChecklistResult;
  note: string | null;
  created_at: Generated<Date>;
}

export interface ReviewDecisionsTable {
  id: Generated<string>;
  submission_id: string;
  reviewer_id: string;
  decision: DecisionType;
  feedback: string | null;
  created_at: Generated<Date>;
}

export interface Database {
  submitters: SubmittersTable;
  reviewers: ReviewersTable;
  checklist_criteria: ChecklistCriteriaTable;
  submissions: SubmissionsTable;
  attachments: AttachmentsTable;
  checklist_responses: ChecklistResponsesTable;
  review_decisions: ReviewDecisionsTable;
}

declare global {
  // eslint-disable-next-line no-var
  var __db: Kysely<Database> | undefined;
}

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString, max: 5 });
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}

// Reuse a single pool across hot reloads in dev.
export const db = globalThis.__db ?? createDb();
if (process.env.NODE_ENV !== "production") {
  globalThis.__db = db;
}
