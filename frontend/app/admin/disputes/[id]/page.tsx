"use client";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPaise, formatDate } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, ShieldAlert, Gavel } from "lucide-react";

interface DisputeDetail {
  id: string; ruling: string; dispute_type: string; arbitration_fee: number;
  admin_notes?: string; created_at: string; raised_by: string;
  milestones: {
    id: string; title: string; status: string; payout_amount: number;
    deadline: string; deliverable_text?: string; ai_evaluation_json?: any;
    ai_success_criteria: string; submission_count?: number;
    projects: {
      id: string; title: string; employer_id: string; freelancer_id: string;
      employer?: { name: string; employer_trust_score: number };
      freelancer?: { name: string; pfi_score: number };
    };
  };
}

export default function DisputeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmRuling, setConfirmRuling] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { apiFetch<DisputeDetail>(`/disputes/${id}`).then(setDispute).catch(console.error); }, [id]);

  const submitRuling = async () => {
    if (!confirmRuling || notes.length < 20) return;
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`/disputes/${id}/rule`, {
        method: "POST",
        body: JSON.stringify({ ruling: confirmRuling, admin_notes: notes }),
      });
      router.push("/admin/disputes?ruled=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit ruling");
    } finally {
      setSubmitting(false);
      setConfirmRuling(null);
    }
  };

  if (!dispute) return <div className="text-slate-400 text-sm">Loading dispute...</div>;

  const ms = dispute.milestones;
  const proj = ms?.projects;
  const eval_ = ms?.ai_evaluation_json;
  const isVeto = dispute.dispute_type === "EMPLOYER_VETO";

  const consequences = {
    FREELANCER_WIN: isVeto
      ? `Employer loses ${formatPaise(dispute.arbitration_fee)} arb fee. Employer Trust Score -50. Milestone → COMPLETED_PAID.`
      : "Milestone reset to IN_PROGRESS. Freelancer gets another attempt.",
    EMPLOYER_WIN: isVeto
      ? `Freelancer PFI -75. Remaining escrow refunded to employer.`
      : "Freelancer PFI -10. Milestone stays AI_REJECTED_FINAL.",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/disputes"
          className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Disputes
        </Link>
        <div className="w-px h-5 bg-slate-200 hidden sm:block" />
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Admin</div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dispute Review</h1>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
          isVeto
            ? "bg-orange-50 text-orange-700 border-orange-200"
            : "bg-blue-50 text-blue-700 border-blue-200"
        }`}>
          {isVeto ? "Employer Veto" : "Freelancer Escalation"}
        </span>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Criteria */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">The Criteria</h2>
          <div className="text-slate-900 font-semibold mb-0.5">{proj?.title}</div>
          <div className="text-sm text-slate-500 mb-4">{ms?.title}</div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
            {ms?.ai_success_criteria}
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Deadline: {ms?.deadline ? formatDate(ms.deadline) : "—"}
          </div>
          <div className={`mt-4 text-xs px-3 py-2 rounded-lg border ${
            isVeto
              ? "bg-orange-50 border-orange-100 text-orange-700"
              : "bg-blue-50 border-blue-100 text-blue-700"
          }`}>
            {isVeto
              ? <>Employer paid <span className="font-bold">{formatPaise(dispute.arbitration_fee)}</span> arb fee</>
              : "Freelancer escalated — free to raise"}
          </div>
        </div>

        {/* Center: Evidence */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">The Evidence</h2>
          {eval_ && (
            <div className="mb-4">
              <div className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full mb-3 ${
                eval_.status === "FULLY_MET"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {eval_.status === "FULLY_MET"
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <XCircle className="w-3.5 h-3.5" />}
                {eval_.status} — {eval_.score}/100
              </div>
              <div className="space-y-1.5 mb-3">
                {eval_.checklist?.map((c: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 font-bold ${c.met ? "text-emerald-600" : "text-red-500"}`}>{c.met ? "✓" : "✗"}</span>
                    <span className={c.met ? "text-slate-700" : "text-red-600"}>{c.criterion}</span>
                    {c.note && <span className="text-slate-400">— {c.note}</span>}
                  </div>
                ))}
              </div>
              {eval_.summary && <p className="text-xs text-slate-500 italic bg-slate-50 rounded-lg p-2">{eval_.summary}</p>}
            </div>
          )}
          {ms?.deliverable_text && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Submitted Work</div>
              <textarea readOnly value={ms.deliverable_text} rows={10}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 text-xs resize-none focus:outline-none" />
            </div>
          )}
        </div>

        {/* Right: Context + Ruling */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Context & Ruling</h2>

          <div className="space-y-3 mb-5">
            {proj?.freelancer && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm">
                <div className="text-xs text-slate-400 font-medium mb-0.5">Freelancer</div>
                <div className="text-slate-900 font-semibold">{proj.freelancer.name}</div>
                <div className="text-xs text-blue-600 font-mono mt-0.5">PFI {proj.freelancer.pfi_score}</div>
              </div>
            )}
            {proj?.employer && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm">
                <div className="text-xs text-slate-400 font-medium mb-0.5">Employer</div>
                <div className="text-slate-900 font-semibold">{proj.employer.name}</div>
                <div className="text-xs text-violet-600 font-mono mt-0.5">Trust {proj.employer.employer_trust_score}</div>
              </div>
            )}
          </div>

          {dispute.ruling === "PENDING" ? (
            <>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Admin Notes <span className="text-slate-400 font-normal normal-case">(min 20 chars)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={4} placeholder="Document your reasoning..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300 resize-none transition-colors" />
                <div className="text-xs text-slate-400 mt-1">{notes.length} chars</div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setConfirmRuling("FREELANCER_WIN")}
                  disabled={notes.length < 20}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> Rule: Freelancer Wins
                </button>
                <button
                  onClick={() => setConfirmRuling("EMPLOYER_WIN")}
                  disabled={notes.length < 20}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                  <XCircle className="w-4 h-4" /> Rule: Employer Wins
                </button>
              </div>
              {notes.length < 20 && (
                <p className="text-xs text-slate-400 mt-2 text-center">Add notes before ruling</p>
              )}
            </>
          ) : (
            <div className={`flex items-center gap-2 p-4 rounded-xl text-sm font-semibold border ${
              dispute.ruling === "FREELANCER_WIN"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              <Gavel className="w-4 h-4" />
              Resolved: {dispute.ruling.replace("_WIN", " Won")}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmRuling && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-md w-full">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className={`w-5 h-5 ${confirmRuling === "FREELANCER_WIN" ? "text-emerald-600" : "text-red-600"}`} />
              <h3 className="text-lg font-bold text-slate-900">
                Confirm: {confirmRuling === "FREELANCER_WIN" ? "Freelancer Wins" : "Employer Wins"}
              </h3>
            </div>
            <div className={`rounded-xl p-4 mb-5 text-sm border ${
              confirmRuling === "FREELANCER_WIN"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
              {consequences[confirmRuling as keyof typeof consequences]}
            </div>
            <div className="flex gap-3">
              <button onClick={submitRuling} disabled={submitting}
                className={`flex-1 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm ${
                  confirmRuling === "FREELANCER_WIN"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}>
                {submitting ? "Processing..." : "Confirm Ruling"}
              </button>
              <button onClick={() => setConfirmRuling(null)}
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
