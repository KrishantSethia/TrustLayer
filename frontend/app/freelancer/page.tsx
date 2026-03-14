"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@/lib/utils";
import Link from "next/link";
import StatusBadge from "@/components/status-badge";
import PFIScoreometer from "@/components/pfi-scoreometer";
import { Briefcase, Clock, Lock, Wallet, ArrowRight } from "lucide-react";

interface BackendDash {
  user: {
    id: string; name: string; pfi_score: number;
    tier: { tier: string; fee_percent: number; pfi_score: number };
    available_balance: number; escrow_pending: number;
  };
  active_projects: Array<{ id: string; title: string; status: string; employer_id: string }>;
  active_milestones: Array<{ id: string; title: string; status: string; project_id: string; deadline: string }>;
  pending_bids: Array<{ id: string; project_id: string; proposed_rate: number; status: string; created_at: string; projects?: { title: string; status: string } }>;
}

export default function FreelancerDashboard() {
  const [data, setData] = useState<BackendDash | null>(null);
  useEffect(() => { apiFetch<BackendDash>("/freelancer/dashboard").then(setData).catch(console.error); }, []);

  if (!data) return <div className="text-slate-400 text-sm">Loading dashboard...</div>;

  const { user } = data;
  const dueSoon = data.active_milestones.filter(m => {
    if (!m.deadline) return false;
    const diff = new Date(m.deadline).getTime() - Date.now();
    return diff > 0 && diff < 48 * 3600 * 1000;
  });

  const stats = [
    { label: "Active Projects",   value: data.active_projects.length,      icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Due Soon (48h)",    value: dueSoon.length,                   icon: Clock,     color: "text-orange-600",  bg: "bg-orange-50", urgent: dueSoon.length > 0 },
    { label: "Frozen Earnings",   value: formatPaise(user.escrow_pending),  icon: Lock,      color: "text-amber-600",   bg: "bg-amber-50" },
    { label: "Available Balance", value: formatPaise(user.available_balance), icon: Wallet,  color: "text-blue-600",    bg: "bg-blue-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Freelancer</div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PFI Hero */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Your PFI Score</h2>
          <PFIScoreometer score={user.pfi_score} size="large" showBreakdown />
        </div>

        {/* Stats + Bids */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {stats.map(({ label, value, icon: Icon, color, bg, urgent }: any) => (
              <div key={label} className={`bg-white border rounded-2xl p-5 ${urgent ? "border-orange-200" : "border-slate-200"}`}>
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
                <div className="text-xs text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Pending Bids */}
          {data.pending_bids.length > 0 && (
            <div className="bg-white border border-blue-200 rounded-2xl p-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Pending Bids ({data.pending_bids.length})
              </div>
              {data.pending_bids.map(b => (
                <div key={b.id} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-2 last:mb-0">
                  <div>
                    <span className="text-sm text-slate-700 font-medium">{b.projects?.title || "Project"}</span>
                    <span className="text-xs text-slate-400 ml-2 font-mono">{formatPaise(b.proposed_rate)}</span>
                  </div>
                  <Link href={`/freelancer/marketplace/${b.project_id}`}
                    className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline">
                    View <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Work */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Active Work</h2>
          <Link href="/freelancer/marketplace"
            className="flex items-center gap-1 text-emerald-600 text-sm font-medium hover:underline">
            Browse Marketplace <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {data.active_projects.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-1">No active projects.</p>
            <Link href="/freelancer/marketplace" className="text-emerald-600 text-sm font-medium hover:underline">
              Find work →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.active_projects.map(p => {
              const currentMs = data.active_milestones.find(m => m.project_id === p.id);
              return (
                <div key={p.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-slate-900 font-medium">{p.title}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    {currentMs && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <StatusBadge status={currentMs.status} />
                        <span>{currentMs.title}</span>
                      </div>
                    )}
                  </div>
                  <Link href={`/freelancer/my-projects/${p.id}`}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap">
                    Open Terminal →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
