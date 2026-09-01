import { Pool } from "pg";
import { Kysely, PostgresDialect, Generated } from "kysely";

export type ProductType =
  | "personal_loan"
  | "credit_card"
  | "mortgage_prequalification"
  | "general_marketing";
export type AccountType = "employee" | "affiliate";
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

// Authentication accounts — also the single identity source for both
// submitting and reviewing (submissions.submitter_id / assigned_reviewer_id
// and review_decisions.reviewer_id all reference this table; see
// db/schema.sql). Used to be two separate tables, submitters and reviewers,
// before login existed.
export interface UsersTable {
  id: Generated<string>;
  name: string;
  email: string;
  password_hash: string;
  account_type: AccountType;
  affiliate_company: string | null;
  is_marketer: boolean;
  is_reviewer: boolean;
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
  users: UsersTable;
  checklist_criteria: ChecklistCriteriaTable;
  submissions: SubmissionsTable;
  attachments: AttachmentsTable;
  checklist_responses: ChecklistResponsesTable;
  review_decisions: ReviewDecisionsTable;
}

declare global {
  var __db: Kysely<Database> | undefined;
}

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Check the environment variable is added in " +
        "Vercel (Project Settings > Environment Variables) for the environment " +
        "you're deploying to, then redeploy."
    );
  }
  const pool = new Pool({ connectionString, max: 5 });
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}

// Lazy singleton: the Pool/Kysely instance is only constructed on first
// actual query, not at module import time. Next.js's build step imports
// route modules (including this one, transitively) to collect page config
// even for fully dynamic routes with no static data — eagerly connecting
// here would make `next build` require a live DATABASE_URL, which it
// shouldn't need. Reused across hot reloads in dev via a global.
function getDb(): Kysely<Database> {
  if (!globalThis.__db) {
    globalThis.__db = createDb();
  }
  return globalThis.__db;
}

// Note: `receiver` must NOT be passed through to Reflect.get here. Kysely's
// query builders use private (#) class fields internally; if a method is
// invoked with `this` bound to this Proxy (which happens if receiver is the
// proxy itself), V8 throws "Cannot read private member from an object whose
// class did not declare it". Binding functions to the real instance avoids
// that entirely.
export const db = new Proxy({} as Kysely<Database>, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
