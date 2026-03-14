"use client";
import { useEffect, useState, useCallback } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPaise, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/status-badge";
import CountdownTimer from "@/components/countdown-timer";
import DecayTicker from "@/components/decay-ticker";
import { ShieldAlert, CalendarClock, Lock, Wallet, TrendingDown, CheckCircle2, ChevronDown, FileText } from "lucide-react";

interface Milestone {
  id: string; sequence_number: number; title: string; description: string;
  status: string; payout_amount: number; deadline: string;
  auto_release_at?: string; ai_evaluation_json?: any; deliverable_text?: string;
  ai_success_criteria: string; extension_requested: boolean;
  extension_reason?: string; extension_new_deadline?: string;
}

interface Project {
  id: string; title: string; status: string; total_budget: number;
  escrow_held: number; freelancer_id?: string; success_fee?: number;
  "users!projects_employer_id_fkey"?: { name: string; email: string } | null;
  milestones?: Milestone[];
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [vetoModal, setVetoModal] = useState<Milestone | null>(null);
  const [ruling, setRuling] = useState(false);

  const load = useCallback(async () => {
    const p = await apiFetch<Project>(`/projects/${id}`);
    setProject(p);
    setMilestones(p.milestones ?? []);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const handleExtension = async (msId: string, approve: boolean) => {
    await apiFetch(`/milestones/${msId}/${approve ? "approve" : "deny"}-extension`, { method: "POST" });
    load();
  };

  const handleVeto = async () => {
    if (!vetoModal) return;
    setRuling(true);
    try {
      const order = await apiFetch<{
        razorpay_order_id?: string; razorpay_key_id?: string;
        amount?: number; currency?: string; step?: string;
        dispute_id?: string; milestone_status?: string;
      }>(`/milestones/${vetoModal.id}/veto`, { method: "POST" });

      if (order.step !== "payment_required") {
        setVetoModal(null);
        load();
        setRuling(false);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);
      script.onload = () => {
        const rzp = new (window as any).Razorpay({
          key: order.razorpay_key_id,
          amount: order.amount,
          currency: order.currency || "INR",
          order_id: order.razorpay_order_id,
          name: "TrustLayer",
          description: `Arbitration Fee — ${vetoModal.title}`,
          theme: { color: "#DC2626" },
          handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string }) => {
            try {
              await apiFetch(`/milestones/${vetoModal.id}/veto-confirm`, {
                method: "POST",
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                }),
              });
              setVetoModal(null);
              load();
            } catch (err) {
              alert(err instanceof ApiError ? err.message : "Veto confirmation failed");
            } finally {
              setRuling(false);
            }
          },
          modal: { ondismiss: () => setRuling(false) },
        });
        rzp.open();
      };
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Veto failed");
      setRuling(false);
    }
  };

  if (!project) return <div className="text-slate-400 text-sm">Loading project...</div>;

  const successFee = project.success_fee || project.total_budget * 0.5;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Employer / Project</div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{project.title}</h1>
            <StatusBadge status={project.status} />
          </div>
          {project.freelancer_id ? (
            <div className="text-slate-500 text-sm">Freelancer assigned</div>
          ) : (
            <div className="text-amber-600 text-sm font-medium">Waiting for freelancer bids</div>
          )}
        </div>
        {["OPEN", "FUNDED"].includes(project.status) && (
          <Link href={`/employer/projects/${id}/bids`}
            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-xl font-medium transition-colors">
            View Bids
          </Link>
        )}
      </div>

      {/* Escrow summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Escrow Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: "Total Budget",     value: formatPaise(project.total_budget),                      icon: Wallet,     color: "text-slate-900" },
            { label: "Success Fee",       value: formatPaise(successFee),                                icon: Lock,       color: "text-amber-600" },
            { label: "Remaining Escrow", value: formatPaise(project.escrow_held),                       icon: Lock,       color: "text-blue-600" },
            { label: "Paid Out",         value: formatPaise(project.total_budget - project.escrow_held), icon: TrendingDown, color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Milestones</h2>
        {milestones.map(ms => (
          <div key={ms.id} className={`bg-white border rounded-2xl p-5 ${
            ms.status === "AI_APPROVED_PENDING" ? "border-emerald-200" :
            ms.status === "DISPUTE_ACTIVE"      ? "border-orange-200" :
            ms.status.includes("REJECTED")      ? "border-red-200"    : "border-slate-200"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-slate-400 text-sm font-mono font-semibold">M{ms.sequence_number}</span>
                <h3 className="text-slate-900 font-semibold">{ms.title}</h3>
                <StatusBadge status={ms.status} />
              </div>
              <div className="sm:text-right shrink-0">
                <div className="text-slate-900 font-bold font-mono">{formatPaise(ms.payout_amount)}</div>
                <div className="text-xs text-slate-400">Due {formatDate(ms.deadline)}</div>
              </div>
            </div>

            {/* AI Approved */}
            {ms.status === "AI_APPROVED_PENDING" && ms.auto_release_at && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      AI Approved — Auto-releasing in:
                    </div>
                    <div className="text-2xl font-mono text-emerald-800">
                      <CountdownTimer targetIso={ms.auto_release_at} onExpire={load} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Silent = approved. Review the submission if you have concerns.</div>
                  </div>
                  <button onClick={() => setVetoModal(ms)}
                    className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl font-medium transition-colors">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Veto & Dispute
                  </button>
                </div>
                {ms.ai_evaluation_json && (
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <div className="text-xs text-slate-500 mb-2 font-medium">AI Evaluation — Score: <span className="font-mono">{ms.ai_evaluation_json.score}/100</span></div>
                    {ms.ai_evaluation_json.checklist?.map((c: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs mb-1">
                        <span className={c.met ? "text-emerald-600" : "text-red-500"}>{c.met ? "✓" : "✗"}</span>
                        <span className={c.met ? "text-slate-700" : "text-red-500"}>{c.criterion}</span>
                        {c.note && <span className="text-slate-400">— {c.note}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Extension request */}
            {ms.extension_requested && ms.status === "IN_PROGRESS" && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-3">
                <div className="flex items-center gap-1.5 text-orange-700 font-semibold text-sm mb-2">
                  <CalendarClock className="w-4 h-4" />
                  Extension Request
                </div>
                <p className="text-slate-600 text-sm mb-2">{ms.extension_reason}</p>
                {ms.extension_new_deadline && (
                  <p className="text-xs text-slate-500 mb-3">Proposed new deadline: <span className="font-medium">{formatDate(ms.extension_new_deadline)}</span></p>
                )}
                <DecayTicker milestoneId={ms.id} />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleExtension(ms.id, true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-1.5 rounded-xl font-medium transition-colors">
                    ✓ Approve Extension
                  </button>
                  <button onClick={() => handleExtension(ms.id, false)}
                    className="bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm px-4 py-1.5 rounded-xl font-medium transition-colors">
                    ✗ Deny
                  </button>
                </div>
              </div>
            )}

            {/* Decay ticker */}
            {ms.status === "IN_PROGRESS" && !ms.extension_requested && (
              <DecayTicker milestoneId={ms.id} />
            )}

            {/* Submitted work */}
            {ms.deliverable_text && ["AI_APPROVED_PENDING", "COMPLETED_PAID", "DISPUTE_ACTIVE", "AI_REJECTED"].includes(ms.status) && (
              <details className="mt-3 bg-slate-50 border border-slate-100 rounded-xl group">
                <summary className="px-4 py-3 cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 list-none flex items-center justify-between transition-colors">
                  <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> View Submitted Work</span>
                  <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {ms.deliverable_text}
                  </pre>
                </div>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Veto Modal */}
      {vetoModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-md w-full">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-bold text-slate-900">Override AI Approval</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600 mb-6">
              <p>This requires a <span className="text-slate-900 font-bold">5% Arbitration Fee: {formatPaise(Math.floor(vetoModal.payout_amount * 0.05))}</span></p>
              <p>If the admin rules the freelancer's work is good:</p>
              <ul className="list-disc list-inside text-slate-500 space-y-1 ml-2">
                <li>You lose your fee (non-refundable)</li>
                <li>Your Employer Trust Score drops by 50 points</li>
              </ul>
              <p className="text-amber-600 text-xs bg-amber-50 border border-amber-100 rounded-lg p-3">
                Only proceed if you genuinely believe the AI missed something important.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleVeto} disabled={ruling}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm">
                {ruling ? "Processing..." : `Confirm Veto & Pay ${formatPaise(Math.floor(vetoModal.payout_amount * 0.05))}`}
              </button>
              <button onClick={() => setVetoModal(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-medium transition-colors text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
