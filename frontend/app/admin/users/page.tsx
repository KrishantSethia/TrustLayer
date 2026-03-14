"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDate, getTier } from "@/lib/utils";
import { Users, Briefcase, Building2 } from "lucide-react";

interface User {
  id: string; name: string; email: string; role: string; pfi_score?: number;
  employer_trust_score?: number; created_at: string; abandoned_projects?: number;
}

const tabs = [
  { key: "FREELANCER", label: "Freelancers", icon: Briefcase },
  { key: "EMPLOYER",   label: "Employers",   icon: Building2 },
  { key: "ALL",        label: "All Users",   icon: Users },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState("FREELANCER");

  useEffect(() => {
    apiFetch<User[]>(`/admin/users?role=${tab}`).then(setUsers).catch(console.error);
  }, [tab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Admin</div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium transition-all ${
              tab === key
                ? "bg-violet-100 text-violet-700 border border-violet-200"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Email</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Role</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Score</th>
              {tab === "FREELANCER" && (
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Abandoned</th>
              )}
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => {
              const tier = u.pfi_score ? getTier(u.pfi_score) : null;
              return (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      u.role === "FREELANCER"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : u.role === "EMPLOYER"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-violet-50 text-violet-700 border-violet-200"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {tier ? (
                      <div>
                        <span className="font-bold font-mono text-slate-900">{u.pfi_score}</span>
                        <span className="text-xs text-slate-400 ml-1.5">({tier.name})</span>
                      </div>
                    ) : u.employer_trust_score ? (
                      <span className="font-mono text-blue-600 font-medium">{u.employer_trust_score}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  {tab === "FREELANCER" && (
                    <td className="px-4 py-3.5">
                      <span className={`font-mono text-sm font-medium ${u.abandoned_projects ? "text-red-500" : "text-slate-400"}`}>
                        {u.abandoned_projects || 0}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-slate-400 text-xs">{formatDate(u.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-slate-400 text-sm text-center py-16">No users found.</div>
        )}
      </div>
    </div>
  );
}
