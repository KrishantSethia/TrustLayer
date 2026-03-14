"use client";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPaise, formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/status-badge";
import { ArrowLeft, Zap } from "lucide-react";

interface Project {
  id: string; title: string; status: string; total_budget: number; escrow_held: number;
  raw_requirement: string; created_at: string;
  users: { name: string; email: string } | null;
  freelancer?: { name: string; pfi_score: number } | null;
  milestones?: Array<{
    id: string; sequence_number: number; title: string; status: string;
    payout_amount: number; deadline: string; ai_success_criteria: string;
    deliverable_text?: string; ai_evaluation_json?: any; auto_release_at?: string;
  }>;
}

export default function AdminProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [ghostConfirm, setGhostConfirm] = useState(false);
  const [acting, setActing] = useState(false);

  const load = () => apiFetch<Project>(`/admin/projects/${id}`).then(setProject).catch(console.error);
  useEffect(() => { load(); }, [id]);

  const triggerGhost = async () => {
    setActing(true);
    try {
      await apiFetch(`/admin/projects/${id}/ghost`, { method: "POST" });
      setGhostConfirm(false);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setActing(false);
    }
  };

  if (!project) return <div className="text-slate-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/projects" className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Projects
        </Link>
        <div className="w-px h-5 bg-slate-200 hidden sm:block" />
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Admin</div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{project.title}</h1>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          {/* Project info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Project Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-400">Employer: </span><span className="text-slate-900 font-medium">{project.users?.name}</span></div>
              <div><span className="text-slate-400">Freelancer: </span><span className="text-slate-900 font-medium">{project.freelancer?.name || "Unassigned"}</span></div>
              <div><span className="text-slate-400">Budget: </span><span className="text-slate-900 font-medium font-mono">{formatPaise(project.total_budget)}</span></div>
              <div><span className="text-slate-400">Escrow held: </span><span className="text-slate-900 font-medium font-mono">{formatPaise(project.escrow_held)}</span></div>
              <div><span className="text-slate-400">Created: </span><span className="text-slate-900 font-medium">{formatDate(project.created_at)}</span></div>
            </div>
          </div>

          {/* Milestones */}
          {project.milestones && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Milestones</h2>
              {project.milestones.map(ms => (
                <div key={ms.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-slate-400 text-sm font-mono font-semibold">M{ms.sequence_number}</span>
                      <span className="text-slate-900 font-medium">{ms.title}</span>
                      <StatusBadge status={ms.status} />
                    </div>
                    <span className="sm:ml-auto text-sm text-slate-500 font-mono">{formatPaise(ms.payout_amount)}</span>
                  </div>
                  <div className="text-xs text-slate-400">Due: {formatDate(ms.deadline)}</div>
                  {ms.ai_evaluation_json && (
                    <div className="mt-2 text-xs text-slate-500">AI: {ms.ai_evaluation_json.status} ({ms.ai_evaluation_json.score}/100)</div>
                  )}
                  {ms.deliverable_text && (
                    <details className="mt-3 bg-slate-50 border border-slate-100 rounded-xl group">
                      <summary className="px-4 py-3 cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 list-none flex items-center justify-between transition-colors">
                        <span>View Submission</span>
                      </summary>
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                        <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{ms.deliverable_text}</pre>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin actions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 h-fit">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Admin Actions</h2>
          <div className="space-y-2">
            <button onClick={() => setGhostConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm py-2.5 rounded-xl font-medium transition-colors">
              <Zap className="w-3.5 h-3.5" /> Trigger Ghost Protocol
            </button>
            <Link href={`/admin/disputes?project=${id}`}
              className="block text-center text-sm text-orange-600 bg-orange-50 border border-orange-200 py-2.5 rounded-xl font-medium hover:bg-orange-100 transition-colors">
              View Disputes
            </Link>
          </div>
        </div>
      </div>

      {ghostConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Trigger Ghost Protocol?</h3>
            <p className="text-slate-500 text-sm mb-5 leading-relaxed">Refunds employer, sets freelancer PFI to 300, cancels remaining milestones.</p>
            <div className="flex gap-3">
              <button onClick={triggerGhost} disabled={acting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors">
                {acting ? "Processing..." : "Confirm"}
              </button>
              <button onClick={() => setGhostConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
