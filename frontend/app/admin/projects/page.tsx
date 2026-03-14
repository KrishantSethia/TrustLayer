"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPaise, timeAgo } from "@/lib/utils";
import Link from "next/link";
import StatusBadge from "@/components/status-badge";

interface Project {
  id: string; title: string; status: string; total_budget: number;
  escrow_held: number; created_at: string;
  users: { name: string; email: string } | null;
  freelancer?: { name: string; pfi_score: number } | null;
}

const statusFilters = ["", "DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    apiFetch<Project[]>(`/admin/projects${status ? `?status=${status}` : ""}`).then(setProjects).catch(console.error);
  }, [status]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Admin</div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">All Projects</h1>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`text-sm px-3.5 py-1.5 rounded-xl font-medium transition-all ${
              status === s
                ? "bg-violet-100 text-violet-700 border border-violet-200"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
            }`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Project", "Employer", "Freelancer", "Budget", "Status", "Created", ""].map(h => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${h === "Budget" ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="font-medium text-slate-900">{p.title}</div>
                  <div className="text-xs text-slate-400 font-mono">{p.id.slice(0, 8)}</div>
                </td>
                <td className="px-4 py-3.5 text-slate-600">{p.users?.name || "—"}</td>
                <td className="px-4 py-3.5">
                  {p.freelancer ? (
                    <div>
                      <div className="text-slate-700">{p.freelancer.name}</div>
                      <div className="text-xs text-slate-400">PFI {p.freelancer.pfi_score}</div>
                    </div>
                  ) : <span className="text-slate-300 text-xs">Unassigned</span>}
                </td>
                <td className="px-4 py-3.5 text-right font-medium text-slate-900 font-mono">{formatPaise(p.total_budget)}</td>
                <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3.5 text-slate-400 text-xs">{timeAgo(p.created_at)}</td>
                <td className="px-4 py-3.5">
                  <Link href={`/admin/projects/${p.id}`}
                    className="text-xs text-violet-600 hover:underline font-medium">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && (
          <div className="text-slate-400 text-sm text-center py-16">No projects found.</div>
        )}
      </div>
    </div>
  );
}
