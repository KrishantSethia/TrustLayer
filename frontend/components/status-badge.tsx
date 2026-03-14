import { STATUS_COLORS } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  LOCKED: "Locked",
  IN_PROGRESS: "In Progress",
  AI_EVALUATING: "AI Evaluating",
  AI_APPROVED_PENDING: "AI Approved",
  COMPLETED_PAID: "Paid",
  DISPUTE_ACTIVE: "Disputed",
  AI_REJECTED: "AI Rejected",
  AI_REJECTED_FINAL: "Final Rejection",
  REFUNDED_PENALIZED: "Refunded",
  DRAFT: "Draft",
  OPEN: "Open",
  FUNDED: "Funded",
  IN_PROGRESS_PROJECT: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
