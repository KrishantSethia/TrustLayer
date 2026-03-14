export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}

export const STATUS_COLORS: Record<string, string> = {
  LOCKED: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  AI_EVALUATING: "bg-yellow-100 text-yellow-700",
  AI_APPROVED_PENDING: "bg-green-100 text-green-700",
  COMPLETED_PAID: "bg-emerald-100 text-emerald-700",
  DISPUTE_ACTIVE: "bg-orange-100 text-orange-700",
  AI_REJECTED: "bg-red-100 text-red-700",
  AI_REJECTED_FINAL: "bg-red-200 text-red-800",
  REFUNDED_PENALIZED: "bg-red-100 text-red-700",
  DRAFT: "bg-gray-100 text-gray-600",
  OPEN: "bg-blue-100 text-blue-700",
  FUNDED: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export const PFI_TIERS = [
  { min: 300, max: 499, name: "High Risk", fee: 15, color: "#ef4444" },
  { min: 500, max: 649, name: "Standard", fee: 10, color: "#f59e0b" },
  { min: 650, max: 799, name: "Proven Pro", fee: 5, color: "#22c55e" },
  { min: 800, max: 850, name: "God-Tier", fee: 0, color: "#eab308" },
];

export function getTier(score: number) {
  return PFI_TIERS.find(t => score >= t.min && score <= t.max) || PFI_TIERS[0];
}
