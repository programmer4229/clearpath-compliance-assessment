// Email is a secondary channel — the platform itself always shows status
// (see PRD). Falls back to a server-log "send" when RESEND_API_KEY is unset,
// so the whole decision flow is fully demoable without a live key.
interface NotifyArgs {
  to: string;
  subject: string;
  body: string;
}

export async function sendNotification({ to, subject, body }: NotifyArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email:mock] to=${to} subject="${subject}"\n${body}\n`);
    return { sent: false, mocked: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "ClearPath Compliance <compliance@clearpath.example>",
      to,
      subject,
      text: body,
    }),
  });

  if (!res.ok) {
    console.error(`[email:error] to=${to} subject="${subject}" status=${res.status}`);
    return { sent: false, mocked: false };
  }
  return { sent: true, mocked: false };
}

export function decisionEmailCopy(params: {
  decision: "approved" | "changes_requested" | "rejected";
  submissionTitle: string;
  feedback: string | null;
  statusUrl: string;
}) {
  const { decision, submissionTitle, feedback, statusUrl } = params;
  const headline =
    decision === "approved"
      ? "has been approved"
      : decision === "rejected"
        ? "was rejected"
        : "needs changes before it can be approved";

  const lines = [
    `Your submission "${submissionTitle}" ${headline}.`,
    feedback ? `\nReviewer feedback:\n${feedback}` : "",
    `\nView full details and history: ${statusUrl}`,
  ];
  return { subject: `Submission update: ${submissionTitle}`, body: lines.join("\n") };
}
