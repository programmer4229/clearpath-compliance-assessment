"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductType, SubmitterType, ChecklistResult, DecisionType } from "@/lib/db";
import {
  findOrCreateSubmitter,
  createSubmission,
  claimSubmission,
  submitDecision,
  resubmitSubmission,
  getSubmissionDetail,
} from "@/lib/queries";
import { saveUpload, attachmentTypeFor } from "@/lib/storage";
import { sendNotification, decisionEmailCopy } from "@/lib/notify";
import { REVIEWER_COOKIE } from "@/lib/reviewers";

const VALID_PRODUCT_TYPES: ProductType[] = ["personal_loan", "credit_card", "mortgage_prequalification"];
const VALID_SUBMITTER_TYPES: SubmitterType[] = ["in_house", "affiliate"];

async function collectAttachments(formData: FormData) {
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  const attachments: { type: "image" | "pdf"; url: string; filename: string }[] = [];
  for (const file of files) {
    const type = attachmentTypeFor(file);
    if (!type) continue; // silently skip unsupported types (e.g. video, out of scope for this MVP)
    const saved = await saveUpload(file);
    attachments.push({ type, url: saved.url, filename: saved.filename });
  }
  return attachments;
}

export async function createSubmissionAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const productType = String(formData.get("productType") ?? "");
  const bodyText = String(formData.get("bodyText") ?? "").trim();
  const submitterType = String(formData.get("submitterType") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const affiliateCompany = String(formData.get("affiliateCompany") ?? "").trim();

  if (!title || !name || !email) throw new Error("Title, name, and email are required.");
  if (!VALID_PRODUCT_TYPES.includes(productType as ProductType)) throw new Error("Invalid product type.");
  if (!VALID_SUBMITTER_TYPES.includes(submitterType as SubmitterType)) throw new Error("Invalid submitter type.");
  if (!bodyText && !(formData.getAll("attachments").some((f) => f instanceof File && f.size > 0))) {
    throw new Error("Include body text or at least one attachment.");
  }

  const submitter = await findOrCreateSubmitter({
    name,
    email,
    type: submitterType as SubmitterType,
    affiliateCompany: submitterType === "affiliate" ? affiliateCompany || null : null,
  });

  const attachments = await collectAttachments(formData);

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

  const attachments = await collectAttachments(formData);

  const next = await resubmitSubmission({
    parentId,
    title,
    productType: productType as ProductType,
    bodyText: bodyText || null,
    attachments,
  });

  redirect(`/status/${next.id}?resubmitted=1`);
}
