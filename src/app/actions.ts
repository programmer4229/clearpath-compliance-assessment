"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductType, SubmitterType, AccountType, ChecklistResult, DecisionType } from "@/lib/db";
import {
  findOrCreateSubmitter,
  createSubmission,
  claimSubmission,
  submitDecision,
  resubmitSubmission,
  getSubmissionDetail,
} from "@/lib/queries";
import { sendNotification, decisionEmailCopy } from "@/lib/notify";
import { REVIEWER_COOKIE } from "@/lib/reviewers";
import { findUserByEmail, createUser } from "@/lib/users";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";
import type { UploadedAttachment } from "@/lib/attachments";

const VALID_PRODUCT_TYPES: ProductType[] = ["personal_loan", "credit_card", "mortgage_prequalification"];
const VALID_SUBMITTER_TYPES: SubmitterType[] = ["in_house", "affiliate"];

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
  const submitterType = String(formData.get("submitterType") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const affiliateCompany = String(formData.get("affiliateCompany") ?? "").trim();

  const attachments = parseAttachments(formData);

  if (!title || !name || !email) throw new Error("Title, name, and email are required.");
  if (!VALID_PRODUCT_TYPES.includes(productType as ProductType)) throw new Error("Invalid product type.");
  if (!VALID_SUBMITTER_TYPES.includes(submitterType as SubmitterType)) throw new Error("Invalid submitter type.");
  if (!bodyText && attachments.length === 0) {
    throw new Error("Include body text or at least one attachment.");
  }

  const submitter = await findOrCreateSubmitter({
    name,
    email,
    type: submitterType as SubmitterType,
    affiliateCompany: submitterType === "affiliate" ? affiliateCompany || null : null,
  });

  const submission = await createSubmission({
    title,
    productType: productType as ProductType,
    bodyText: bodyText || null,
    submitterId: submitter.id,
    attachments,
  });

  redirect(`/status/${submission.id}?submitted=1`);
}

export async function setReviewerAction(formData: FormData) {
  const reviewerId = String(formData.get("reviewerId") ?? "");
  const store = await cookies();
  if (reviewerId) {
    store.set(REVIEWER_COOKIE, reviewerId, { path: "/", httpOnly: false });
  } else {
    store.delete(REVIEWER_COOKIE);
  }
  redirect("/review");
}

export async function claimAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const reviewerId = String(formData.get("reviewerId") ?? "");
  if (!submissionId || !reviewerId) throw new Error("Missing submission or reviewer.");

  const claimed = await claimSubmission(submissionId, reviewerId);
  if (claimed) {
    redirect(`/review/${submissionId}`);
  }
  redirect("/review?claim_failed=1");
}

const CRITERION_PREFIX = "criterion:";

export async function decisionAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "");
  const reviewerId = String(formData.get("reviewerId") ?? "");
  const decision = String(formData.get("decision") ?? "") as DecisionType;
  const feedback = String(formData.get("feedback") ?? "").trim() || null;

  if (!submissionId || !reviewerId) throw new Error("Missing submission or reviewer.");
  if (!["approved", "changes_requested", "rejected"].includes(decision)) {
    throw new Error("Invalid decision.");
  }
  if (decision !== "approved" && !feedback) {
    throw new Error("Feedback is required when requesting changes or rejecting.");
  }

  const checklist: { criterionId: string; result: ChecklistResult; note: string | null }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(CRITERION_PREFIX) || key.endsWith(":note")) continue;
    const criterionId = key.slice(CRITERION_PREFIX.length);
    const note = String(formData.get(`${key}:note`) ?? "").trim() || null;
    checklist.push({ criterionId, result: value as ChecklistResult, note });
  }

  const updated = await submitDecision({ submissionId, reviewerId, decision, feedback, checklist });

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
