import { redirect } from "next/navigation";
import { createSubmissionAction } from "@/app/actions";
import { SubmissionFields } from "@/components/SubmissionFields";
import { verifySession } from "@/lib/session";

const PRODUCT_TYPES = [
  { value: "personal_loan", label: "Personal Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "mortgage_prequalification", label: "Mortgage Prequalification" },
  { value: "general_marketing", label: "General Marketing" },
];

export default async function SubmitPage() {
  const user = await verifySession();
  if (!user) redirect("/login");
  // Reviewer-only accounts have nothing to submit — send them to the
  // dashboard instead of a form they can't use.
  if (!user.is_marketer) redirect("/");

  return (
    <div className="max-w-2xl animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-slate-900">Submit marketing content</h1>
      <p className="mt-1 text-sm text-slate-600">
        Attach the text, image, or PDF version of the content. Video isn&apos;t supported yet.
      </p>

      <form action={createSubmissionAction} className="mt-8 space-y-6">
        <div className="card flex items-center justify-between gap-3 p-4 text-sm">
          <span className="text-slate-500">
            Submitting as{" "}
            <span className="font-medium text-slate-900">
              {user.name} ({user.email})
            </span>
            {user.account_type === "affiliate" && (
              <span className="ml-1.5 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                affiliate{user.affiliate_company ? ` — ${user.affiliate_company}` : ""}
              </span>
            )}
          </span>
        </div>

        <SubmissionFields
          productTypes={PRODUCT_TYPES}
          attachmentFieldName="attachmentsJson"
          attachmentLabel="Attachments"
          attachmentHint="JPG, PNG, GIF, WEBP, or PDF — up to 25MB each"
          submitLabel="Submit for review"
        />
      </form>
    </div>
  );
}
