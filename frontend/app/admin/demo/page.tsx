"use client";
import { useEffect, useState, useCallback } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPaise } from "@/lib/utils";
import StatusBadge from "@/components/status-badge";
import {
  RefreshCw, CheckSquare, Zap, Clock, Scale, Skull,
  FastForward, CheckCircle2, XCircle,
  AlertTriangle, Gavel, ChevronDown,
} from "lucide-react";

interface Milestone {
  id: string; title: string; status: string; sequence_number: number;
  payout_amount: number; deadline: string; auto_release_at?: string;
  project_id: string;
}

interface Project {
  id: string; title: string; status: string; escrow_held: number;
  total_budget: number; freelancer_id?: string;
  milestones: Milestone[];
  "users!projects_employer_id_fkey"?: { name: string } | null;
  "users!projects_freelancer_id_fkey"?: { name: string; pfi_score: number } | null;
}

interface UserInfo {
  id: string; name: string; role: string; pfi_score?: number;
}

type ResultMap = Record<string, { ok?: string; err?: string; loading?: boolean }>;

export default function DemoPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [results, setResults] = useState<ResultMap>({});
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // PFI controls
  const [pfiUserId, setPfiUserId] = useState("");
  const [pfiScore, setPfiScore] = useState(795);

  const load = useCallback(async () => {
    try {
      const [p, u] = await Promise.all([
        apiFetch<Project[]>("/admin/projects"),
        apiFetch<UserInfo[]>("/admin/users?role=ALL"),
      ]);
      setProjects(p);
      setUsers(u);
    } catch {}
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const run = async (key: string, fn: () => Promise<any>) => {
    setResults(r => ({ ...r, [key]: { loading: true } }));
    try {
      const res = await fn();
      setResults(r => ({ ...r, [key]: { ok: JSON.stringify(res).slice(0, 120) } }));
      load();
    } catch (err) {
      setResults(r => ({ ...r, [key]: { err: err instanceof ApiError ? err.message : String(err) } }));
    }
  };

  const Result = ({ k }: { k: string }) => {
    const r = results[k];
    if (!r) return null;
    if (r.loading) return <div className="text-xs text-blue-500 mt-1 animate-pulse">Processing...</div>;
    if (r.ok) return <div className="text-xs text-emerald-600 mt-1 font-medium truncate max-w-md">{r.ok}</div>;
    if (r.err) return <div className="text-xs text-red-500 mt-1 font-medium">{r.err}</div>;
    return null;
  };

  const freelancers = users.filter(u => u.role === "FREELANCER");

  const btnPrimary = "bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap";
  const btnDanger = "bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap";
  const btnWarn = "bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-xs px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap";
  const btnSuccess = "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap";
  const btnGhost = "bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Admin</div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Demo Control Panel</h1>
            <span className="text-xs bg-violet-100 text-violet-700 border border-violet-200 font-semibold px-2.5 py-1 rounded-full">
              HACKATHON MODE
            </span>
          </div>
        </div>
        <button onClick={load} className={btnGhost + " flex items-center gap-1.5"}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Section 1: Seed / Reset */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Demo Data</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <button onClick={() => run("seed", () => apiFetch("/admin/demo/seed", { method: "POST" }))}
              className={btnSuccess + " w-full py-2.5 text-sm"}>
              Seed Full Demo Data
            </button>
            <Result k="seed" />
          </div>
          <div>
            <button onClick={() => { if (confirm("Delete all demo projects, milestones, bids, disputes?")) run("reset", () => apiFetch("/admin/demo/reset", { method: "POST" })); }}
              className={btnDanger + " w-full py-2.5 text-sm"}>
              Reset All Demo Data
            </button>
            <Result k="reset" />
          </div>
        </div>
      </div>

      {/* Section 2: Live project + milestone state with inline actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Projects & Milestones</h2>
          <span className="text-xs text-slate-400 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Auto 5s</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Click a project to expand milestones and actions.</p>

        {projects.length === 0 ? (
          <div className="text-slate-400 text-sm text-center py-10">No projects. Create demo data first.</div>
        ) : (
          <div className="space-y-2">
            {projects.map(p => {
              const isExpanded = expandedProject === p.id;
              const employer = p["users!projects_employer_id_fkey"];
              const freelancer = p["users!projects_freelancer_id_fkey"];
              const ms = p.milestones || [];

              return (
                <div key={p.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Project header */}
                  <button
                    onClick={() => setExpandedProject(isExpanded ? null : p.id)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{p.title}</div>
                        <div className="text-xs text-slate-400">
                          {employer?.name || "No employer"} {freelancer ? ` \u2192 ${freelancer.name} (PFI ${freelancer.pfi_score})` : " \u2192 Unassigned"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-mono text-slate-500">{formatPaise(p.escrow_held || 0)} escrow</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </button>

                  {/* Expanded: milestones + actions */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 p-4 space-y-3 bg-white">
                      {/* Project-level actions */}
                      {p.status === "IN_PROGRESS" && (
                        <div>
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => { if (confirm("Trigger Ghost Protocol? This nukes the project.")) run(`ghost_${p.id}`, () => apiFetch(`/admin/projects/${p.id}/ghost`, { method: "POST" })); }}
                              className={btnDanger + " flex items-center gap-1"}>
                              <Skull className="w-3 h-3" /> Ghost Protocol
                            </button>
                          </div>
                          <Result k={`ghost_${p.id}`} />
                        </div>
                      )}

                      {/* Milestones */}
                      {ms.length === 0 ? (
                        <div className="text-xs text-slate-400 py-2">No milestones yet.</div>
                      ) : (
                        <div className="space-y-2">
                          {ms.map(m => {
                            const isOverdue = m.deadline && new Date(m.deadline) < new Date();
                            return (
                              <div key={m.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    <span className="text-xs font-mono text-slate-400 flex-shrink-0">#{m.sequence_number}</span>
                                    <span className="text-sm font-medium text-slate-800 truncate">{m.title}</span>
                                    <StatusBadge status={m.status} />
                                    {isOverdue && m.status === "IN_PROGRESS" && (
                                      <span className="text-xs text-red-500 flex items-center gap-0.5">
                                        <AlertTriangle className="w-3 h-3" /> Overdue
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-mono text-slate-400 flex-shrink-0 ml-2">{formatPaise(m.payout_amount || 0)}</span>
                                </div>

                                {/* Milestone actions based on status */}
                                <div className="flex gap-2 flex-wrap items-center">
                                  {/* IN_PROGRESS / AI_REJECTED actions */}
                                  {(m.status === "IN_PROGRESS" || m.status === "AI_REJECTED") && (
                                    <>
                                      <button onClick={() => run(`ffApprove_${m.id}`, () => apiFetch(`/admin/demo/fast-forward-approval?milestone_id=${m.id}`, { method: "POST" }))}
                                        className={btnSuccess + " flex items-center gap-1"}>
                                        <FastForward className="w-3 h-3" /> AI Approve
                                      </button>
                                      <button onClick={() => run(`ffDeadline_${m.id}`, () => apiFetch(`/admin/demo/fast-forward-deadline?milestone_id=${m.id}`, { method: "POST" }))}
                                        className={btnWarn + " flex items-center gap-1"}>
                                        <Clock className="w-3 h-3" /> Make Overdue
                                      </button>
                                      <button onClick={() => run(`forceComplete_${m.id}`, () => apiFetch(`/admin/milestones/${m.id}/force-complete?reason=Demo`, { method: "POST" }))}
                                        className={btnPrimary + " flex items-center gap-1"}>
                                        <CheckCircle2 className="w-3 h-3" /> Force Complete
                                      </button>
                                    </>
                                  )}

                                  {/* AI_REJECTED: can also create escalation dispute */}
                                  {m.status === "AI_REJECTED" && (
                                    <button onClick={() => run(`dispute_${m.id}`, () => apiFetch(`/admin/demo/create-dispute?milestone_id=${m.id}&dispute_type=FREELANCER_ESCALATION`, { method: "POST" }))}
                                      className={btnWarn + " flex items-center gap-1"}>
                                      <Scale className="w-3 h-3" /> Create Escalation
                                    </button>
                                  )}

                                  {/* AI_APPROVED_PENDING actions */}
                                  {m.status === "AI_APPROVED_PENDING" && (
                                    <>
                                      <button onClick={() => run(`ffTimer_${m.id}`, () => apiFetch(`/admin/demo/fast-forward-timer?milestone_id=${m.id}`, { method: "POST" }))}
                                        className={btnSuccess + " flex items-center gap-1"}>
                                        <FastForward className="w-3 h-3" /> Release Now
                                      </button>
                                      <button onClick={() => run(`dispute_${m.id}`, () => apiFetch(`/admin/demo/create-dispute?milestone_id=${m.id}&dispute_type=EMPLOYER_VETO`, { method: "POST" }))}
                                        className={btnDanger + " flex items-center gap-1"}>
                                        <Gavel className="w-3 h-3" /> Employer Veto
                                      </button>
                                      {m.auto_release_at && (
                                        <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                                          <Clock className="w-3 h-3" />
                                          Auto-release: {new Date(m.auto_release_at).toLocaleTimeString()}
                                        </span>
                                      )}
                                    </>
                                  )}

                                  {/* DISPUTE_ACTIVE: link to ruling page */}
                                  {m.status === "DISPUTE_ACTIVE" && (
                                    <a href="/admin/disputes"
                                      className={btnWarn + " flex items-center gap-1"}>
                                      <Gavel className="w-3 h-3" /> Go to Disputes
                                    </a>
                                  )}

                                  {/* COMPLETED_PAID */}
                                  {m.status === "COMPLETED_PAID" && (
                                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Paid
                                    </span>
                                  )}

                                  {/* REFUNDED_PENALIZED */}
                                  {m.status === "REFUNDED_PENALIZED" && (
                                    <span className="text-xs text-red-500 flex items-center gap-1">
                                      <XCircle className="w-3 h-3" /> Refunded
                                    </span>
                                  )}

                                  {/* LOCKED */}
                                  {m.status === "LOCKED" && (
                                    <span className="text-xs text-slate-400">Waiting for previous milestone</span>
                                  )}
                                </div>
                                <Result k={`ffApprove_${m.id}`} />
                                <Result k={`ffTimer_${m.id}`} />
                                <Result k={`ffDeadline_${m.id}`} />
                                <Result k={`forceComplete_${m.id}`} />
                                <Result k={`dispute_${m.id}`} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: PFI Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">PFI Score Controls</h2>
        <div className="flex gap-3 flex-wrap mb-3">
          <select value={pfiUserId} onChange={e => setPfiUserId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300">
            <option value="">Select freelancer...</option>
            {freelancers.map(u => (
              <option key={u.id} value={u.id}>{u.name} -- PFI {u.pfi_score || 500}</option>
            ))}
          </select>
          <input type="number" value={pfiScore} onChange={e => setPfiScore(parseInt(e.target.value) || 300)}
            min={300} max={850}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300 font-mono" />
          <button onClick={() => pfiUserId && run("setPfi", () => apiFetch(`/admin/demo/set-pfi?user_id=${pfiUserId}&score=${pfiScore}`, { method: "POST" }))}
            disabled={!pfiUserId}
            className={btnPrimary}>
            Set PFI
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { score: 795, label: "795 -- near God-Tier" },
            { score: 650, label: "650 -- Proven Pro" },
            { score: 500, label: "500 -- Standard" },
            { score: 305, label: "305 -- near ghost" },
          ].map(({ score, label }) => (
            <button key={score} onClick={() => setPfiScore(score)}
              className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors font-mono">
              {label}
            </button>
          ))}
        </div>
        <Result k="setPfi" />
      </div>

      {/* Section 4: Demo Script */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Demo Script</h2>
        </div>
        <div className="space-y-2.5">
          {[
            { step: "1", text: "Reset + Seed full demo data (7 users, 4 completed projects, 1 in-progress, 3 open)" },
            { step: "2", text: "Show admin dashboard — revenue, GMV, users, completed projects" },
            { step: "3", text: "Login as Priya (priya@trustlayer.demo / demo1234) — show wallet with past earnings" },
            { step: "4", text: "Show in-progress project 'SaaS Landing Page' — MS1 done, MS2 active" },
            { step: "5", text: "Submit work on MS2, watch AI evaluate in real-time" },
            { step: "6", text: "Login as employer, browse marketplace — 3 open projects with bids" },
            { step: "7", text: "Create new project, accept a bid, fund via Razorpay" },
            { step: "8", text: "Demo: Employer Veto → Dispute → Admin rules (from demo panel)" },
            { step: "9", text: "Show PFI score changes, decay ticker, ghost protocol trigger" },
          ].map(({ step, text }) => (
            <label key={step} className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 accent-violet-500 rounded mt-0.5 flex-shrink-0" />
              <span className="group-has-[:checked]:line-through group-has-[:checked]:text-slate-400 transition-colors">
                <span className="font-mono text-violet-500 font-bold mr-1.5">{step}.</span>{text}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
