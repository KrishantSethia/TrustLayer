"use client";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import Link from "next/link";
import { AlertTriangle, Clock, CheckCircle2, Zap, User } from "lucide-react";

interface AtRisk {
  milestone_id: string; milestone_title: string; project_id: string; project_title: string;
  freelancer: { id: string; name: string; pfi_score: number } | null;
  deadline: string; hours_overdue: number; hours_until_ghost: number; extension_requested: boolean;
}

function severityStyle(hours: number) {
  if (hours >= 72) return { border: "border-red-200",   bg: "bg-red-50/60",     badge: "bg-red-100 text-red-700 border-red-200",     label: "Critical" };
  if (hours >= 24) return { border: "border-orange-200",bg: "bg-orange-50/60",  badge: "bg-orange-100 text-orange-700 border-orange-200", label: "High Risk" };
  return              { border: "border-amber-200",  bg: "bg-amber-50/40",   badge: "bg-amber-100 text-amber-700 border-amber-200",  label: "Watch" };
}

export default function GhostProtocolPage() {
  const [atRisk, setAtRisk] = useState<AtRisk[]>([]);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [confirmProject, setConfirmProject] = useState<string | null>(null);

  const load = () => apiFetch<AtRisk[]>("/admin/ghost-at-risk").then(setAtRisk).catch(console.error);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const triggerGhost = async (projectId: string) => {
    setTriggering(projectId);
    try {
      await apiFetch(`/admin/projects/${projectId}/ghost`, { method: "POST" });
      setConfirmProject(null);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Ghost protocol failed");
    } finally {
      setTriggering(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Admin</div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ghost Protocol Monitor</h1>
        <p className="text-slate-500 text-sm mt-1">
          Milestones past deadline with no extension request. Auto-fires at 72h overdue.
        </p>
      </div>

      {atRisk.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <div className="text-slate-500 text-sm font-medium">No at-risk milestones right now.</div>
          <div className="text-slate-400 text-xs mt-1">Auto-refreshes every 30 seconds.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {atRisk.map(item => {
            const s = severityStyle(item.hours_overdue);
            return (
              <div key={item.milestone_id} className={`bg-white border ${s.border} rounded-2xl p-4 sm:p-5 ${s.bg}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.badge}`}>
                      <AlertTriangle className="w-3 h-3" />
                      {item.hours_overdue.toFixed(1)}h overdue · {s.label}
                    </span>
                    {item.hours_until_ghost === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 animate-pulse">
                        <Zap className="w-3 h-3" /> Ghost Imminent
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.hours_until_ghost.toFixed(1)}h until ghost
                      </span>
                    )}
                    {item.extension_requested && (
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                        Extension pending
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-slate-900">{item.project_title}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{item.milestone_title}</div>
                  {item.freelancer && (
                    <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {item.freelancer.name} · PFI {item.freelancer.pfi_score}
                    </div>
                  )}
                </div>
                <div className="flex sm:flex-col gap-2 flex-shrink-0">
                  <Link href={`/admin/projects/${item.project_id}`}
                    className="text-xs text-blue-600 hover:underline font-medium text-center">
                    View Project
                  </Link>
                  <button onClick={() => setConfirmProject(item.project_id)}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-2 rounded-xl font-medium transition-colors flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Trigger Ghost
                  </button>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm modal */}
      {confirmProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Trigger Ghost Protocol?</h3>
            <p className="text-slate-500 text-sm mb-5 leading-relaxed">
              This will refund the employer, set the freelancer PFI to 300, cancel remaining milestones, and auto-relist the work.
            </p>
            <div className="flex gap-3">
              <button onClick={() => triggerGhost(confirmProject)} disabled={!!triggering}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors">
                {triggering ? "Processing..." : "Confirm"}
              </button>
              <button onClick={() => setConfirmProject(null)}
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
