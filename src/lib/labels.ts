import { ChecklistResult, ProductType, SubmissionStatus } from "./db";

export const STATUS_META: Record<SubmissionStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-slate-100 text-slate-700" },
  in_review: { label: "In review", className: "bg-blue-50 text-blue-700" },
  changes_requested: { label: "Changes requested", className: "bg-amber-50 text-amber-700" },
  resubmitted: { label: "Resubmitted", className: "bg-blue-50 text-blue-700" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-rose-50 text-rose-700" },
};

export const PRODUCT_LABEL: Record<ProductType, string> = {
  personal_loan: "Personal Loan",
  credit_card: "Credit Card",
  mortgage_prequalification: "Mortgage Prequalification",
};

// Shared with the submitter-facing status page, which renders the same
// per-criterion checklist results the reviewer sees on /review/[id] (read-only).
export const CHECKLIST_RESULT_META: Record<ChecklistResult, { label: string; className: string }> = {
  pass: { label: "Pass", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  fail: { label: "Fail", className: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  not_applicable: { label: "N/A", className: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};
