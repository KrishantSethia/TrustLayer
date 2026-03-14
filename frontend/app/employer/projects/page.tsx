"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPaise, timeAgo } from "@/lib/utils";
import Link from "next/link";
import StatusBadge from "@/components/status-badge";
import { FolderOpen, Plus, ArrowRight } from "lucide-react";

interface Project {
  id: string; title: string; status: string; total_budget: number;
  escrow_held: number; created_at: string;
  users: { name: string; email: string } | null;
  freelancer?: { name: string; pfi_score: number } | null;
}

const statusFilters = ["", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function EmployerProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    apiFetch<Project[]>(`/employer/projects${status ? `?status=${status}` : ""}`).then(setProjects);
  }, [status]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Employer</div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Projects</h1>
        </div>
        <Link href="/employer/new-project"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" />
          New Project
        </Link>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`text-sm px-3.5 py-1.5 rounded-xl font-medium transition-all ${
              status === s
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
            }`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Project list */}
      <div className="space-y-3">
        {projects.map(p => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-slate-300 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <h3 className="text-slate-900 font-medium">{p.title}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-400 flex-wrap">
                  <span className="font-mono">Budget: {formatPaise(p.total_budget)}</span>
                  <span className="font-mono">Locked: {formatPaise(p.escrow_held)}</span>
                  {p.freelancer && <span>Freelancer: {p.freelancer.name}</span>}
                  <span>{timeAgo(p.created_at)}</span>
                </div>
              </div>
              <Link href={`/employer/projects/${p.id}`}
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium shrink-0">
                View <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
            <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <div className="text-slate-400 text-sm">No projects found.</div>
          </div>
        )}
      </div>
    </div>
  );
}
