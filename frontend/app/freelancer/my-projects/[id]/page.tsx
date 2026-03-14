"use client";
import { useEffect, useState, useCallback } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPaise, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/status-badge";
import DecayTicker from "@/components/decay-ticker";
import CountdownTimer from "@/components/countdown-timer";
import { CheckCircle2, XCircle, CalendarClock, Bot, ChevronDown, Zap, FileText, PenLine, ShieldAlert } from "lucide-react";

interface Milestone {
  id: string; sequence_number: number; title: string; description: string;
  ai_success_criteria: string; status: string; payout_amount: number;
  final_payout?: number; deadline: string; auto_release_at?: string;
  deliverable_text?: string; ai_evaluation_json?: any;
  extension_requested?: boolean; extension_reason?: string;
  submission_count?: number;
}

interface Project {
  id: string; title: string; category: string; status: string;
  raw_requirement: string; project_summary?: string; source_text?: string;
  success_fee?: number; total_budget?: number;
  "users!projects_employer_id_fkey"?: { name: string } | null;
  milestones: Milestone[];
}

export default function WorkTerminal() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeMs, setActiveMs] = useState<Milestone | null>(null);
  const [deliverable, setDeliverable] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [showExtForm, setShowExtForm] = useState(false);
  const [extReason, setExtReason] = useState("");
  const [extDeadline, setExtDeadline] = useState("");
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalating, setEscalating] = useState(false);

  const load = useCallback(async () => {
    const p = await apiFetch<Project>(`/projects/${id}`);
    const ms = p.milestones || [];
    setProject(p);
    setMilestones(ms);
    const active = ms.find(m => ["IN_PROGRESS", "AI_EVALUATING", "AI_REJECTED", "AI_REJECTED_FINAL", "AI_APPROVED_PENDING", "DISPUTE_ACTIVE"].includes(m.status));
    setActiveMs(active || null);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const submitWork = async () => {
    if (!activeMs || deliverable.split(/\s+/).length < 10) return;
    setSubmitting(true);
    setError("");
    setSubmitResult(null);
    try {
      const result = await apiFetch<any>(`/milestones/${activeMs.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ deliverable_text: deliverable }),
      });
      setSubmitResult(result);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const requestExtension = async () => {
    if (!activeMs || extReason.length < 20 || !extDeadline) return;
    try {
      await apiFetch(`/milestones/${activeMs.id}/request-extension`, {
        method: "POST",
        body: JSON.stringify({ reason: extReason, new_deadline: extDeadline }),
      });
      setShowExtForm(false);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed");
    }
  };

  const escalate = async () => {
    if (!activeMs) return;
    setEscalating(true);
    try {
      await apiFetch(`/milestones/${activeMs.id}/escalate`, { method: "POST" });
      setShowEscalateModal(false);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Escalation failed");
    } finally {
      setEscalating(false);
    }
  };

  const wordCount = deliverable.trim().split(/\s+/).filter(Boolean).length;
  const isOverdue = activeMs && new Date(activeMs.deadline) < new Date();
  const evaluation = submitResult?.ai_evaluation_json || activeMs?.ai_evaluation_json;
  const isApproved = activeMs?.status === "AI_APPROVED_PENDING";
  const isRejected = activeMs?.status === "AI_REJECTED" || activeMs?.status === "AI_REJECTED_FINAL";
  const isDisputed = activeMs?.status === "DISPUTE_ACTIVE";

  if (!project) return <div className="text-slate-400 text-sm">Loading project...</div>;

  const employerName = project["users!projects_employer_id_fkey"]?.name ?? "Unknown";
  const frozenEarnings = milestones.filter(m => m.status === "COMPLETED_PAID").reduce((s, m) => s + (m.final_payout || m.payout_amount || 0), 0);
  const potentialEarnings = milestones.filter(m => m.status !== "COMPLETED_PAID" && m.status !== "REFUNDED_PENALIZED").reduce((s, m) => s + (m.payout_amount || 0), 0) + (project.success_fee || 0);

  const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 text-sm transition-colors";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left: milestone stepper */}
      <div className="md:col-span-1">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-6">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{project.title}</div>
          <div className="text-xs text-slate-400 mb-4">by {employerName}</div>
          <div className="space-y-2">
            {milestones.map(ms => (
              <div key={ms.id}
                onClick={() => setActiveMs(ms)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  activeMs?.id === ms.id
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-slate-50 border border-slate-100 hover:border-slate-200"
                }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  ms.status === "COMPLETED_PAID" ? "bg-emerald-500 text-white" :
                  ms.status === "DISPUTE_ACTIVE" ? "bg-orange-500 text-white" :
                  ["IN_PROGRESS", "AI_EVALUATING", "AI_REJECTED", "AI_APPROVED_PENDING"].includes(ms.status) ? "bg-emerald-600 text-white" :
                  "bg-slate-200 text-slate-500"
                }`}>
                  {ms.status === "COMPLETED_PAID" ? "✓" : ms.sequence_number}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-slate-700 font-medium truncate">{ms.title}</div>
                  <StatusBadge status={ms.status} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Frozen</span>
              <span className="text-amber-600 font-semibold font-mono">{formatPaise(frozenEarnings)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Potential</span>
              <span className="text-emerald-600 font-semibold font-mono">{formatPaise(potentialEarnings)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: work area */}
      <div className="md:col-span-2 space-y-4">
        {/* Full project brief */}
        <details className="bg-white border border-slate-200 rounded-2xl group">
          <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900 list-none flex items-center justify-between transition-colors">
            <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Full Project Brief</span>
            <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
            {project.project_summary && (
              <p className="text-sm text-blue-600 font-medium">{project.project_summary}</p>
            )}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
              {project.raw_requirement}
            </div>
            {project.source_text && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Source Text</div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {project.source_text}
                </div>
              </div>
            )}
          </div>
        </details>

        {activeMs ? (
          <>
            {/* Criteria card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{activeMs.title}</h2>
                  <div className="text-xs text-slate-400 mt-1">
                    Due: <span className="font-medium">{formatDate(activeMs.deadline)}</span>
                    <span className="mx-2">·</span>
                    Payout: <span className="font-mono font-medium">{formatPaise(activeMs.payout_amount)}</span>
                  </div>
                </div>
                <StatusBadge status={activeMs.status} />
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">AI Success Criteria</div>
                <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{activeMs.ai_success_criteria}</div>
              </div>
              {isOverdue && <div className="mt-3"><DecayTicker milestoneId={activeMs.id} /></div>}
              {isOverdue && !isDisputed && !activeMs.extension_requested && activeMs.status === "IN_PROGRESS" && (
                <button onClick={() => setShowExtForm(true)}
                  className="mt-3 flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors">
                  <CalendarClock className="w-3.5 h-3.5" />
                  Request deadline extension →
                </button>
              )}
              {activeMs.extension_requested && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  Extension requested — waiting for employer response
                </div>
              )}
            </div>

            {/* Extension form */}
            {showExtForm && (
              <div className="bg-white border border-amber-200 rounded-2xl p-5">
                <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-amber-600" />
                  Request Deadline Extension
                </h3>
                <div className="space-y-3">
                  <textarea value={extReason} onChange={e => setExtReason(e.target.value)}
                    rows={3} placeholder="Explain why you need more time (min 20 chars)..."
                    className={`${inputClass} resize-none`} />
                  <input type="datetime-local" value={extDeadline} onChange={e => setExtDeadline(e.target.value)}
                    className={inputClass} />
                  <p className="text-xs text-slate-400">Payment decay continues until employer approves</p>
                  <div className="flex gap-3">
                    <button onClick={requestExtension} disabled={extReason.length < 20 || !extDeadline}
                      className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors">
                      Send Request to Employer
                    </button>
                    <button onClick={() => setShowExtForm(false)}
                      className="text-slate-400 text-sm hover:text-slate-700 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Approved */}
            {isApproved && activeMs.auto_release_at && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                  AI Approved — FULLY MET
                </div>
                {evaluation && (
                  <>
                    <div className="text-sm text-slate-600 mb-3">Score: <span className="font-mono font-bold">{evaluation.score}/100</span></div>
                    {evaluation.checklist?.map((c: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm mb-1">
                        <span className={c.met ? "text-emerald-600" : "text-red-500"}>{c.met ? "✓" : "✗"}</span>
                        <span className={c.met ? "text-slate-700" : "text-red-600"}>{c.criterion}</span>
                        {c.note && <span className="text-slate-400">— {c.note}</span>}
                      </div>
                    ))}
                    <p className="text-slate-500 text-sm mt-3">{evaluation.summary}</p>
                  </>
                )}
                <div className="mt-3 text-sm text-slate-500">
                  Employer has <CountdownTimer targetIso={activeMs.auto_release_at} onExpire={load} /> to review before auto-pay
                </div>
              </div>
            )}

            {/* Dispute Active */}
            {isDisputed && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-orange-700 font-bold text-lg mb-3">
                  <ShieldAlert className="w-5 h-5" />
                  Employer Dispute — Under Admin Review
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  The employer has contested the AI approval. An admin is reviewing the submission against the success criteria.
                </p>
                {evaluation && (
                  <div className="bg-white border border-orange-100 rounded-xl p-3 mb-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">AI Evaluation on File</div>
                    <div className="text-sm text-slate-600 mb-1">Score: <span className="font-mono font-bold">{evaluation.score}/100</span></div>
                    {evaluation.checklist?.map((c: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm mb-1">
                        <span className={c.met ? "text-emerald-600" : "text-red-500"}>{c.met ? "✓" : "✗"}</span>
                        <span className={c.met ? "text-slate-700" : "text-red-600"}>{c.criterion}</span>
                        {c.note && <span className="text-slate-400">— {c.note}</span>}
                      </div>
                    ))}
                    {evaluation.summary && <p className="text-slate-500 text-xs mt-2 italic">{evaluation.summary}</p>}
                  </div>
                )}
                <p className="text-xs text-slate-400">You will be notified when the admin rules. If you win, you get paid. If employer wins, you can revise and resubmit.</p>
              </div>
            )}

            {/* AI Rejected */}
            {isRejected && evaluation && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-red-600 font-bold text-lg mb-3">
                  <XCircle className="w-5 h-5" />
                  Not Approved — {evaluation.status}
                </div>
                <div className="text-sm text-slate-600 mb-3">Score: <span className="font-mono font-bold">{evaluation.score}/100</span></div>
                {evaluation.checklist?.map((c: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm mb-1">
                    <span className={c.met ? "text-emerald-600" : "text-red-500"}>{c.met ? "✓" : "✗"}</span>
                    <span className={c.met ? "text-slate-700" : "text-red-600"}>{c.criterion}</span>
                    {c.note && <span className="text-slate-400">— {c.note}</span>}
                  </div>
                ))}
                {evaluation.feedback_for_freelancer && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-3 text-sm text-amber-700">
                    <div className="text-xs font-semibold text-amber-600 mb-1 uppercase tracking-wide">Feedback</div>
                    {evaluation.feedback_for_freelancer}
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={() => { setDeliverable(activeMs.deliverable_text || ""); setSubmitResult(null); }}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors">
                    <PenLine className="w-3.5 h-3.5" /> Revise & Resubmit
                  </button>
                  {activeMs.status !== "AI_REJECTED_FINAL" && (
                    <button onClick={() => setShowEscalateModal(true)}
                      className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-xl font-medium transition-colors">
                      <Zap className="w-3.5 h-3.5" />
                      Escalate AI Decision
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Submission terminal */}
            {!isDisputed && (activeMs.status === "IN_PROGRESS" || (isRejected && activeMs.status !== "AI_EVALUATING")) && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Submit for AI Review</h3>
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm mb-3">{error}</div>
                )}
                <textarea
                  value={deliverable} onChange={e => setDeliverable(e.target.value)}
                  rows={12} placeholder="Paste your full deliverable here..."
                  disabled={submitting}
                  className={`${inputClass} resize-none disabled:opacity-50`}
                />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3">
                  <div className="text-xs text-slate-400">
                    Word count: <span className={wordCount >= 50 ? "text-emerald-600 font-semibold" : "text-slate-400"}>{wordCount}</span> words
                  </div>
                  <button onClick={submitWork} disabled={wordCount < 50 || submitting}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm w-full sm:w-auto justify-center">
                    <Bot className="w-4 h-4" />
                    {submitting ? "AI evaluating..." : "Submit for AI Review"}
                  </button>
                </div>
                {submitting && (
                  <div className="text-center text-slate-400 text-sm mt-3 animate-pulse">
                    AI is evaluating your work... (usually 10–20 seconds)
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <div className="text-slate-400 text-sm">All milestones completed or project not started yet.</div>
          </div>
        )}
      </div>

      {/* Escalate Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-sm w-full">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-900">Escalate to Admin Review</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600 mb-6">
              <p className="text-emerald-600 font-semibold">This is FREE to raise.</p>
              <p>An admin will review: the success criteria, your submitted work, and the AI's evaluation.</p>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-amber-700 font-semibold mb-1">If admin confirms AI was correct:</p>
                <p className="text-slate-500">• Your PFI drops by 10 points</p>
                <p className="text-slate-500">• Milestone stays rejected</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={escalate} disabled={escalating}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm">
                {escalating ? "Escalating..." : "Confirm Escalation"}
              </button>
              <button onClick={() => setShowEscalateModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-medium transition-colors text-sm">
                Cancel — I'll revise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
