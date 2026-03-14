"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPaise, timeAgo } from "@/lib/utils";
import Link from "next/link";
import StatusBadge from "@/components/status-badge";
import CountdownTimer from "@/components/countdown-timer";
import { FolderOpen, Clock, CalendarClock, Lock, Plus, ArrowRight, CheckCircle2 } from "lucide-react";

interface BackendDash {
  user: { id: string; name: string; employer_trust_score: number; available_balance: number };
  projects: Array<{ id: string; title: string; status: string; freelancer_id?: string; escrow_held: number; created_at: string }>;
  pending_approval: Array<{ id: string; title: string; project_id: string; status: string; auto_release_at?: string; payout_amount: number }>;
  extension_requests: Array<{ id: string; title: string; project_id: string; deadline: string; extension_new_deadline?: string; extension_reason?: string }>;
}

export default function EmployerDashboard() {
  const [data, setData] = useState<BackendDash | null>(null);

  useEffect(() => {
    apiFetch<BackendDash>("/employer/dashboard").then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="text-slate-400 text-sm">Loading dashboard...</div>;

  const activeProjects = data.projects.filter(p => ["IN_PROGRESS", "FUNDED", "OPEN"].includes(p.status));
  const totalLocked = data.projects.reduce((sum, p) => sum + (p.escrow_held || 0), 0);

  const stats = [
    { label: "Active Projects",    value: activeProjects.length,              icon: FolderOpen,   color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "Awaiting Approval",  value: data.pending_approval.length,       icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", urgent: data.pending_approval.length > 0 },
    { label: "Extension Requests", value: data.extension_requests.length,     icon: CalendarClock, color: "text-orange-600", bg: "bg-orange-50", urgent: data.extension_requests.length > 0 },
    { label: "Total Locked",       value: formatPaise(totalLocked),           icon: Lock,         color: "text-amber-600",  bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Employer</div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        </div>
        <div className="text-sm text-slate-500">
          Trust Score: <span className="text-slate-900 font-bold font-mono">{data.user.employer_trust_score}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, urgent }) => (
          <div key={label} className={`bg-white border rounded-2xl p-5 ${urgent ? "border-orange-200" : "border-slate-200"}`}>
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
            <div className="text-sm text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Pending Approvals */}
      {data.pending_approval.length > 0 && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Awaiting Your Review</h2>
          </div>
          <div className="space-y-3">
            {data.pending_approval.map(ms => (
              <div key={ms.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <div>
                  <div className="text-slate-900 text-sm font-medium">{ms.title}</div>
                  <div className="text-slate-500 text-xs mt-0.5">Payout: <span className="font-mono">{formatPaise(ms.payout_amount)}</span></div>
                  {ms.auto_release_at && (
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Auto-releases in: <CountdownTimer targetIso={ms.auto_release_at} />
                    </div>
                  )}
                </div>
                <Link href={`/employer/projects/${ms.project_id}`}
                  className="flex items-center gap-1 text-sm text-emerald-700 font-medium hover:underline">
                  Review <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extension Requests */}
      {data.extension_requests.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Extension Requests</h2>
          </div>
          <div className="space-y-3">
            {data.extension_requests.map(ms => (
              <div key={ms.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-orange-50 border border-orange-100 rounded-xl p-4">
                <div>
                  <div className="text-slate-900 text-sm font-medium">{ms.title}</div>
                  {ms.extension_reason && (
                    <div className="text-slate-500 text-xs mt-0.5">"{ms.extension_reason}"</div>
                  )}
                </div>
                <Link href={`/employer/projects/${ms.project_id}`}
                  className="flex items-center gap-1 text-sm text-orange-700 font-medium hover:underline">
                  Respond <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">My Projects</h2>
          <Link href="/employer/new-project"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" />
            New Project
          </Link>
        </div>
        {data.projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-2">No projects yet.</p>
            <Link href="/employer/new-project" className="text-blue-600 hover:underline text-sm font-medium">
              Create your first project →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.projects.map(p => (
              <div key={p.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-slate-900 font-medium">{p.title}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="font-mono">Locked: {formatPaise(p.escrow_held)}</span>
                    <span>{timeAgo(p.created_at)}</span>
                  </div>
                </div>
                <Link href={`/employer/projects/${p.id}`}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium">
                  View <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
