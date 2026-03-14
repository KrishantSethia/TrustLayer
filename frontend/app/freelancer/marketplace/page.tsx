"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPaise, timeAgo } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import PFIScoreometer from "@/components/pfi-scoreometer";
import { Search, Store, ArrowRight } from "lucide-react";

interface Project {
  id: string; title: string; project_summary: string; total_budget: number;
  category: string; created_at: string; bid_count?: number;
  "users!projects_employer_id_fkey"?: { name: string; employer_trust_score: number } | null;
}

export default function Marketplace() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { apiFetch<Project[]>("/marketplace").then(setProjects).catch(console.error); }, []);

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.project_summary || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Freelancer</div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Marketplace</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Project list */}
        <div className="md:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 text-sm transition-colors"
            />
          </div>
          <div className="text-xs text-slate-400">{filtered.length} project{filtered.length !== 1 ? "s" : ""} available</div>

          {filtered.map(p => {
            const employer = p["users!projects_employer_id_fkey"];
            const trust = employer?.employer_trust_score ?? 500;
            const trustColor = trust >= 400 ? "text-emerald-600" : trust >= 300 ? "text-amber-600" : "text-red-500";
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-1">
                  <div>
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold inline-block mb-2">
                      {p.category}
                    </span>
                    <h3 className="text-slate-900 font-semibold">{p.title}</h3>
                  </div>
                  <div className="text-lg font-bold text-slate-900 font-mono sm:ml-4 shrink-0">{formatPaise(p.total_budget)}</div>
                </div>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{p.project_summary}</p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-400 flex-wrap">
                    <span>by <span className="text-slate-600 font-medium">{employer?.name ?? "Unknown"}</span></span>
                    <span className={`font-semibold ${trustColor}`}>Trust: {trust}</span>
                    {p.bid_count !== undefined && <span>{p.bid_count} bids</span>}
                    <span>{timeAgo(p.created_at)}</span>
                  </div>
                  <Link href={`/freelancer/marketplace/${p.id}`}
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap">
                    View & Bid <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
              <Store className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <div className="text-slate-400 text-sm">No projects available.</div>
            </div>
          )}
        </div>

        {/* PFI Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Your PFI</h2>
            {user && <PFIScoreometer score={(user as any).pfi_score || 500} size="small" />}
          </div>
        </div>
      </div>
    </div>
  );
}
