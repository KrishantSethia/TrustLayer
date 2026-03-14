"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@/lib/utils";
import Link from "next/link";
import StatusBadge from "@/components/status-badge";
import { Briefcase, ArrowRight } from "lucide-react";

interface MyProject {
  id: string; title: string; status: string; employer_name: string;
  frozen_earnings: number; potential_earnings: number;
  current_milestone?: { title: string; status: string; deadline: string };
}

const tabs = [
  { key: "active",    label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export default function MyProjects() {
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [tab, setTab] = useState<"active" | "completed" | "cancelled">("active");

  useEffect(() => { apiFetch<MyProject[]>("/freelancer/my-projects").then(setProjects).catch(console.error); }, []);

  const filtered = projects.filter(p => {
    if (tab === "active") return ["IN_PROGRESS", "OPEN"].includes(p.status);
    if (tab === "completed") return p.status === "COMPLETED";
    return p.status === "CANCELLED";
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Freelancer</div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Work</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-sm px-4 py-2 rounded-xl font-medium transition-all ${
              tab === t.key
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map(p => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-slate-300 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h3 className="text-slate-900 font-semibold">{p.title}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-xs text-slate-400 mb-2">by {p.employer_name}</div>
                {p.current_milestone && (
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={p.current_milestone.status} />
                    <span className="text-xs text-slate-400">{p.current_milestone.title}</span>
                  </div>
                )}
                <div className="flex gap-4 text-xs flex-wrap">
                  <span className="text-slate-400">Frozen: <span className="text-amber-600 font-semibold font-mono">{formatPaise(p.frozen_earnings)}</span></span>
                  <span className="text-slate-400">Potential: <span className="text-emerald-600 font-semibold font-mono">{formatPaise(p.potential_earnings)}</span></span>
                </div>
              </div>
              <Link href={`/freelancer/my-projects/${p.id}`}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap">
                Open Terminal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <div className="text-slate-400 text-sm">No {tab} projects.</div>
          </div>
        )}
      </div>
    </div>
  );
}
