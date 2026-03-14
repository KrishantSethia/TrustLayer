"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import { Scale, Clock, CheckCircle2, XCircle } from "lucide-react";

interface Dispute {
  id: string; ruling: string; created_at: string; dispute_type: string; arbitration_fee: number;
  milestones: { id: string; title: string; status: string; project_id: string; projects: { title: string; employer_id: string; freelancer_id: string } };
  raised_by: string;
}

const tabs = [
  { key: "PENDING",       label: "Pending",         icon: Clock },
  { key: "EMPLOYER_WIN",  label: "Employer Won",    icon: CheckCircle2 },
  { key: "FREELANCER_WIN",label: "Freelancer Won",  icon: CheckCircle2 },
];

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [tab, setTab] = useState("PENDING");

  useEffect(() => {
    apiFetch<Dispute[]>(`/disputes?ruling=${tab}`).then(setDisputes).catch(console.error);
  }, [tab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Admin</div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dispute Queue</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium transition-all ${
              tab === key
                ? "bg-orange-100 text-orange-700 border border-orange-200"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Dispute list */}
      <div className="space-y-3">
        {disputes.map(d => (
          <div key={d.id} className={`bg-white border rounded-2xl p-4 sm:p-5 ${
            d.ruling === "PENDING" ? "border-orange-200" : "border-slate-200"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Badge row */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  d.dispute_type === "EMPLOYER_VETO"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  <Scale className="w-3 h-3" />
                  {d.dispute_type === "EMPLOYER_VETO" ? "Employer Veto" : "Freelancer Escalation"}
                </span>
                {d.ruling !== "PENDING" && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    d.ruling === "FREELANCER_WIN"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-600 border-red-200"
                  }`}>
                    {d.ruling === "FREELANCER_WIN" ? "Freelancer Won" : "Employer Won"}
                  </span>
                )}
              </div>

              <div className="font-semibold text-slate-900">{d.milestones?.projects?.title}</div>
              <div className="text-sm text-slate-500 mt-0.5">{d.milestones?.title}</div>
              <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(d.created_at)}
              </div>
            </div>

            {d.ruling === "PENDING" && (
              <Link href={`/admin/disputes/${d.id}`}
                className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors flex-shrink-0 text-center">
                Review & Rule →
              </Link>
            )}
            </div>
          </div>
        ))}
        {disputes.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
            <XCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <div className="text-slate-400 text-sm">No disputes in this category.</div>
          </div>
        )}
      </div>
    </div>
  );
}
