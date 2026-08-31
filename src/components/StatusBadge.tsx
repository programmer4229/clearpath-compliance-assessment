import { SubmissionStatus } from "@/lib/db";
import { STATUS_META } from "@/lib/labels";

export function StatusBadge({ status }: { status: SubmissionStatus | string }) {
  const meta = STATUS_META[status as SubmissionStatus] ?? {
    label: status,
    className: "bg-slate-100 text-slate-700",
  };
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}
