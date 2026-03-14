"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@/lib/utils";
import Link from "next/link";
import { FolderOpen, Layers, AlertTriangle, CheckCircle2, Users, Briefcase, Building2, DollarSign, ArrowUpRight } from "lucide-react";

interface Stats {
  projects: { total: number; draft: number; open: number; in_progress: number; completed: number; cancelled: number };
  disputes: { pending: number };
  revenue: { gmv: number; platform_revenue: number; total_paid_out: number; active_escrow: number };
  users: { freelancers: number; employers: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { apiFetch<Stats>("/admin/stats").then(setStats).catch(console.error); }, []);

  if (!stats) return <div className="text-slate-400 text-sm">Loading...</div>;

  const topCards = [
    { icon: FolderOpen,    label: "Total Projects",  value: stats.projects.total,      color: "text-slate-700",   bg: "bg-slate-100" },
    { icon: Layers,        label: "In Progress",     value: stats.projects.in_progress, color: "text-blue-600",   bg: "bg-blue-50" },
    { icon: AlertTriangle, label: "Open Disputes",   value: stats.disputes.pending,    color: "text-orange-600",  bg: "bg-orange-50", urgent: stats.disputes.pending > 0 },
    { icon: CheckCircle2,  label: "Completed",       value: stats.projects.completed,  color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const revenueCards = [
    { label: "Platform Fees Earned",   value: formatPaise(stats.revenue.platform_revenue), color: "text-emerald-600" },
    { label: "Total GMV Processed",    value: formatPaise(stats.revenue.gmv),              color: "text-slate-900" },
    { label: "Paid Out to Freelancers",value: formatPaise(stats.revenue.total_paid_out),   color: "text-blue-600" },
    { label: "Locked in Escrow",       value: formatPaise(stats.revenue.active_escrow),    color: "text-amber-600" },
  ];

  const statusBreakdown = [
    { label: "Draft",       value: stats.projects.draft,        dot: "bg-slate-400" },
    { label: "Open",        value: stats.projects.open,         dot: "bg-blue-500" },
    { label: "In Progress", value: stats.projects.in_progress,  dot: "bg-indigo-500" },
    { label: "Completed",   value: stats.projects.completed,    dot: "bg-emerald-500" },
    { label: "Cancelled",   value: stats.projects.cancelled,    dot: "bg-red-400" },
  ];

  const quickLinks = [
    { href: "/admin/disputes",      label: "Dispute Queue",         desc: `${stats.disputes.pending} pending`, Icon: AlertTriangle, urgent: stats.disputes.pending > 0 },
    { href: "/admin/projects",      label: "All Projects",          desc: `${stats.projects.total} total`,     Icon: FolderOpen,    urgent: false },
    { href: "/admin/ghost-protocol",label: "Ghost Protocol Monitor",desc: "Check at-risk milestones",          Icon: Layers,        urgent: false },
    { href: "/admin/users",         label: "User Management",       desc: "Freelancers & employers",           Icon: Users,         urgent: false },
    { href: "/admin/demo",          label: "Demo Control Panel",    desc: "Hackathon demo tools",              Icon: DollarSign,    urgent: false },
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Overview</div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {topCards.map(({ icon: Icon, label, value, color, bg, urgent }) => (
          <div key={label} className={`bg-white border rounded-2xl p-5 ${urgent ? "border-orange-200" : "border-slate-200"}`}>
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div className={`text-2xl font-bold ${color} font-mono`}>{value}</div>
            <div className="text-sm text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Revenue */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-5">Platform Revenue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {revenueCards.map(({ label, value, color }) => (
            <div key={label}>
              <div className={`text-xl font-bold ${color} font-mono`}>{value}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 font-mono">{stats.users.freelancers}</div>
              <div className="text-xs text-slate-400">Freelancers</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 font-mono">{stats.users.employers}</div>
              <div className="text-xs text-slate-400">Employers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-5">Project Status Breakdown</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {statusBreakdown.map(({ label, value, dot }) => (
            <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-slate-900 font-mono">{value}</div>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {quickLinks.map(({ href, label, desc, Icon, urgent }) => (
          <Link key={href} href={href}
            className={`bg-white border rounded-2xl p-5 hover:shadow-sm transition-all flex items-start justify-between group ${
              urgent ? "border-orange-200 hover:border-orange-300" : "border-slate-200 hover:border-slate-300"
            }`}>
            <div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${urgent ? "bg-orange-50" : "bg-slate-100"}`}>
                <Icon className={`w-4 h-4 ${urgent ? "text-orange-500" : "text-slate-500"}`} />
              </div>
              <div className="text-sm font-semibold text-slate-900">{label}</div>
              <div className={`text-xs mt-0.5 ${urgent ? "text-orange-500" : "text-slate-400"}`}>{desc}</div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors mt-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
