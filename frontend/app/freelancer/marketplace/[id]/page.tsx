"use client";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPaise, getTier } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";

interface ProjectDetail {
  id: string; title: string; project_summary: string; total_budget: number;
  category: string; raw_requirement: string; source_text?: string;
  milestones: Array<{ sequence_number: number; title: string; description: string; payout_amount: number; deadline: string }>;
  "users!projects_employer_id_fkey"?: { name: string; employer_trust_score: number } | null;
  my_bid?: { status: string; proposed_rate: number };
}

export default function ProjectBidPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [rate, setRate] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiFetch<ProjectDetail>(`/marketplace/${id}`).then(p => {
      setProject(p);
      setRate(Math.floor(p.total_budget / 100));
    });
  }, [id]);

  const pfiScore = (user as any)?.pfi_score || 500;
  const tier = getTier(pfiScore);
  const netEarning = rate * (1 - tier.fee / 100);

  const submitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rate || message.length < 20) return;
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/bids", {
        method: "POST",
        body: JSON.stringify({ project_id: id, proposed_rate: rate * 100, message }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  if (!project) return <div className="text-slate-400 text-sm">Loading...</div>;

  const employer = project["users!projects_employer_id_fkey"];
  const trust = employer?.employer_trust_score ?? 500;
  const trustColor = trust >= 400 ? "text-emerald-600" : trust >= 300 ? "text-amber-600" : "text-red-500";

  const inputClass = "bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300 text-sm transition-colors";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/freelancer/marketplace"
        className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </Link>

      {/* Project card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2">
          <div>
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold inline-block mb-2">
              {project.category}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{project.title}</h1>
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono shrink-0">{formatPaise(project.total_budget)}</div>
        </div>
        <p className="text-slate-500 text-sm mb-3">{project.project_summary}</p>
        {project.source_text && (
          <details className="mb-3">
            <summary className="text-xs font-semibold text-amber-600 uppercase tracking-wide cursor-pointer hover:text-amber-700">
              View Source Text
            </summary>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {project.source_text}
            </div>
          </details>
        )}
        <div className="text-xs text-slate-400">
          Employer: <span className="text-slate-600 font-medium">{employer?.name ?? "Unknown"}</span>
          <span className="mx-2">·</span>
          Trust Score: <span className={`font-semibold ${trustColor}`}>{trust}</span>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-4">Project Milestones</h2>
        <div className="space-y-3">
          {(project.milestones || []).map(ms => (
            <div key={ms.sequence_number} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold">M{ms.sequence_number}</span>
                <span className="text-slate-900 font-medium">{ms.title}</span>
                <span className="sm:ml-auto text-sm font-mono text-slate-600">{formatPaise(ms.payout_amount)}</span>
              </div>
              <p className="text-slate-500 text-sm mt-1">{ms.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bid form / status */}
      {project.my_bid ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          {project.my_bid.status === "PENDING" && (
            <>
              <Clock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <div className="text-slate-700 font-medium">Bid submitted — waiting for employer decision</div>
              <div className="text-sm text-slate-400 mt-1 font-mono">{formatPaise(project.my_bid.proposed_rate)}</div>
            </>
          )}
          {project.my_bid.status === "ACCEPTED" && (
            <>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <div className="text-emerald-700 font-semibold">Your bid was accepted!</div>
            </>
          )}
          {project.my_bid.status === "REJECTED" && (
            <>
              <XCircle className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <div className="text-slate-500">Your bid was not selected for this project.</div>
            </>
          )}
        </div>
      ) : success ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
          <div className="text-emerald-700 font-semibold">Bid submitted! Employer will review shortly.</div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-5">Submit Your Bid</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm mb-4">{error}</div>
          )}
          <form onSubmit={submitBid} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Your proposed rate (₹)</label>
              <input type="number" value={rate} min={1} onChange={e => setRate(parseInt(e.target.value) || 0)}
                className={`${inputClass} w-48`} />
              <div className="text-xs text-slate-400 mt-2">
                Your PFI: <span className="font-bold" style={{ color: tier.color }}>{pfiScore} ({tier.name} — {tier.fee}% fee)</span>
                {rate > 0 && (
                  <> · You'll earn <span className="text-emerald-600 font-semibold">₹{Math.floor(netEarning).toLocaleString("en-IN")}</span> after fees</>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Your pitch <span className="text-slate-400 font-normal">(min 20 chars)</span></label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                rows={4} placeholder="Tell the employer why you're the right fit..."
                className={`${inputClass} w-full resize-none`} />
              <div className="text-xs text-slate-400 mt-1">{message.length} chars</div>
            </div>
            <button type="submit" disabled={!rate || message.length < 20 || submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
              {submitting ? "Submitting..." : "Submit Bid →"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
