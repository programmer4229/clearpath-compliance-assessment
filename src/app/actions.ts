"use server";

import { redirect } from "next/navigation";
import { ProductType, AccountType, ChecklistResult, DecisionType } from "@/lib/db";
import {
  createSubmission,
  claimSubmission,
  submitDecision,
  resubmitSubmission,
  getSubmissionDetail,
} from "@/lib/queries";
import { sendNotification, decisionEmailCopy } from "@/lib/notify";
import { findUserByEmail, createUser } from "@/lib/users";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createSession, deleteSession, verifySession } from "@/lib/session";
import type { UploadedAttachment } from "@/lib/attachments";

const VALID_PRODUCT_TYPES: ProductType[] = ["personal_loan", "credit_card", "mortgage_prequalification"];

// Attachments are no longer sent as raw file bytes through the Server
// Action — the browser uploads them directly to Vercel Blob (see
// AttachmentPicker + /api/blob-upload) to stay under Vercel's 4.5MB request
// body limit, and hands back a small JSON list of {type, url, filename}
// through a hidden field instead. This just validates and parses that list.
function parseAttachments(formData: FormData): UploadedAttachment[] {
  const raw = String(formData.get("attachmentsJson") ?? "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (a): a is UploadedAttachment =>
      !!a &&
      (a.type === "image" || a.type === "pdf") &&
      typeof a.url === "string" &&
      typeof a.filename === "string"
  );
}

export async function createSubmissionAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const productType = String(formData.get("productType") ?? "");
  const bodyText = String(formData.get("bodyText") ?? "").trim();
  const attachments = parseAttachments(formData);

  // Submitter identity now comes from the session, not the form — see
  // src/app/submit/page.tsx. Re-checked here (not just relied on via the
  // page being behind proxy.ts) per the Data Access Layer pattern: this
  // Server Function is reachable on its own regardless of what UI called it.
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!user.is_marketer) {
    throw new Error("Your account isn't set up to submit content for review.");
  }

  if (!title) throw new Error("Title is required.");
  if (!VALID_PRODUCT_TYPES.includes(productType as ProductType)) throw new Error("Invalid product type.");
  if (!bodyText && attachments.length === 0) {
    throw new Error("Include body text or at least one attachment.");
  }

  const submission = await createSubmission({
    title,
    productType: productType as ProductType,
    bodyText: bodyText || null,
    submitterId: user.id,
    attachments,
  });

  redirect(`/status/${submission.id}?submitted=1`);
}

export async function claimAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  if (!submissionId) throw new Error("Missing submission.");

  // Reviewer identity comes from the session — there's no reviewer-picker
  // to trust a form field from anymore (see src/app/review/page.tsx).
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!user.is_reviewer) {
    throw new Error("Your account isn't set up to review submissions.");
  }

  const claimed = await claimSubmission(submissionId, user.id);
  if (claimed) {
    redirect(`/review/${submissionId}`);
  }

  // claimSubmission's WHERE clause is what actually enforces "can't claim
  // your own submission" and "first click wins" — this just picks a more
  // specific message for the former so it doesn't read like a race
  // condition with another reviewer.
  const detail = await getSubmissionDetail(submissionId);
  if (detail?.submission.submitter_id === user.id) {
    redirect("/review?claim_failed=self");
  }
  redirect("/review?claim_failed=1");
}

const CRITERION_PREFIX = "criterion:";

export async function decisionAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const decision = String(formData.get("decision") ?? "") as DecisionType;
  const feedback = String(formData.get("feedback") ?? "").trim() || null;

  if (!submissionId) throw new Error("Missing submission.");
  if (!["approved", "changes_requested", "rejected"].includes(decision)) {
    throw new Error("Invalid decision.");
  }
  if (decision !== "approved" && !feedback) {
    throw new Error("Feedback is required when requesting changes or rejecting.");
  }

  const user = await verifySession();
  if (!user) redirect("/login");
  if (!user.is_reviewer) {
    throw new Error("Your account isn't set up to review submissions.");
  }

  // The review page only renders the decision buttons when this submission
  // is assigned to the signed-in user, but that's a UI restriction, not a
  // security one — re-checked here since a Server Action is directly
  // callable regardless of which page rendered the form that called it.
  const existing = await getSubmissionDetail(submissionId);
  if (!existing || existing.submission.assigned_reviewer_id !== user.id) {
    throw new Error("This submission isn't assigned to you.");
  }

  const checklist: { criterionId: string; result: ChecklistResult; note: string | null }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(CRITERION_PREFIX) || key.endsWith(":note")) continue;
    const criterionId = key.slice(CRITERION_PREFIX.length);
    const note = String(formData.get(`${key}:note`) ?? "").trim() || null;
    checklist.push({ criterionId, result: value as ChecklistResult, note });
  }

  const updated = await submitDecision({
    submissionId,
    reviewerId: user.id,
    decision,
    feedback,
    checklist,
  });

  const detail = await getSubmissionDetail(submissionId);
  if (detail) {
    const { subject, body } = decisionEmailCopy({
      decision,
      submissionTitle: updated.title,
      feedback,
      statusUrl: `/status/${submissionId}`,
    });
    await sendNotification({ to: detail.submission.submitter_email!, subject, body });
  }

  redirect("/review?decided=1");
}

export async function resubmitAction(formData: FormData) {
  const parentId = String(formData.get("parentId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const productType = String(formData.get("productType") ?? "");
  const bodyText = String(formData.get("bodyText") ?? "").trim();

  if (!parentId || !title) throw new Error("Missing required fields.");
  if (!VALID_PRODUCT_TYPES.includes(productType as ProductType)) throw new Error("Invalid product type.");

  const attachments = parseAttachments(formData);

  const user = await verifySession();
  if (!user) redirect("/login");

  const parent = await getSubmissionDetail(parentId);
  if (!parent || parent.submission.submitter_id !== user.id) {
    throw new Error("You can only resubmit your own submissions.");
  }

  const next = await resubmitSubmission({
    parentId,
    title,
    productType: productType as ProductType,
    bodyText: bodyText || null,
    attachments,
  });

  redirect(`/status/${next.id}?resubmitted=1`);
}

// --- Authentication ----------------------------------------------------
// Shape returned by signupAction/loginAction for useActionState — errors
// are field-scoped so the form can show them next to the relevant input,
// per Next.js's authentication guide (avoids throwing for expected
// validation failures, which would otherwise hit this app's generic
// error boundary instead of a usable inline message).
export interface AuthFormState {
  errors?: Record<string, string>;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ACCOUNT_TYPES: AccountType[] = ["employee", "affiliate"];

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const accountType = String(formData.get("accountType") ?? "");
  const affiliateCompany = String(formData.get("affiliateCompany") ?? "").trim();
  const isMarketer = formData.get("isMarketer") === "on";
  const isReviewer = formData.get("isReviewer") === "on";

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Name is required.";
  if (!email || !EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (password && password !== confirmPassword) errors.confirmPassword = "Passwords don't match.";
  if (!VALID_ACCOUNT_TYPES.includes(accountType as AccountType)) {
    errors.accountType = "Select whether you're a ClearPath employee or an affiliate.";
  }
  if (accountType === "employee" && !isMarketer && !isReviewer) {
    errors.role = "Select at least one: in-house marketer, compliance reviewer, or both.";
  }

  if (Object.keys(errors).length === 0) {
    const existing = await findUserByEmail(email);
    if (existing) errors.email = "An account with this email already exists.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, message: "Fix the errors below and try again." };
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({
    name,
    email,
    passwordHash,
    accountType: accountType as AccountType,
    // Affiliates aren't asked the marketer/reviewer question — they submit
    // content on behalf of their company and never review it.
    affiliateCompany: accountType === "affiliate" ? affiliateCompany || null : null,
    isMarketer: accountType === "affiliate" ? true : isMarketer,
    isReviewer: accountType === "affiliate" ? false : isReviewer,
  });

  await createSession(user.id);
  redirect("/");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { message: "Enter your email and password." };
  }

  const user = await findUserByEmail(email);
  const valid = user ? await verifyPassword(password, user.password_hash) : false;
  // Deliberately the same message either way — confirming which emails have
  // an account is its own small information leak.
  if (!user || !valid) {
    return { message: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
