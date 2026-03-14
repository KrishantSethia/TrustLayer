"use client";
import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPaise, timeAgo, getTier } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, CheckCircle2, Lock } from "lucide-react";

interface Bid {
  id: string; proposed_rate: number; message: string; status: string; created_at: string;
  freelancer: { id: string; name: string; pfi_score: number };
}

const tierBg: Record<string, string> = {
  "High Risk":   "bg-red-50 text-red-700 border-red-200",
  "Standard":    "bg-slate-100 text-slate-600 border-slate-200",
  "Proven Pro":  "bg-cyan-50 text-cyan-700 border-cyan-200",
  "God-Tier":    "bg-violet-50 text-violet-700 border-violet-200",
};

export default function BidsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bids, setBids] = useState<Bid[]>([]);
  const [confirmBid, setConfirmBid] = useState<Bid | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    apiFetch<Bid[]>(`/projects/${id}/bids`).then(setBids);
  }, [id]);

  const handleAccept = async (bid: Bid) => {
    setPaying(true);
    try {
      const order = await apiFetch<{
        step: string; razorpay_order_id: string; razorpay_key_id: string;
        amount: number; currency: string;
      }>(`/bids/${bid.id}/accept`, { method: "POST" });

      if (order.step !== "payment_required") {
        router.push(`/employer/projects/${id}?accepted=1`);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);
      script.onload = () => {
        const rzp = new (window as any).Razorpay({
          key: order.razorpay_key_id,
          amount: order.amount,
          currency: order.currency || "INR",
          order_id: order.razorpay_order_id,
          name: "TrustLayer",
          description: `Escrow — ${bid.freelancer.name}`,
          theme: { color: "#2563EB" },
          handler: async (response: { razorpay_payment_id: string }) => {
            try {
              await apiFetch(`/bids/${bid.id}/confirm-payment`, {
                method: "POST",
                body: JSON.stringify({ razorpay_payment_id: response.razorpay_payment_id }),
              });
              setConfirmBid(null);
              router.push(`/employer/projects/${id}?accepted=1`);
            } catch (err) {
              alert(err instanceof ApiError ? err.message : "Payment confirmation failed");
            } finally {
              setPaying(false);
            }
          },
          modal: { ondismiss: () => { setPaying(false); setConfirmBid(null); } },
        });
        rzp.open();
      };
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to initiate payment");
      setPaying(false);
    }
  };

  const pendingBids = bids.filter(b => b.status === "PENDING").sort((a, b) => b.freelancer.pfi_score - a.freelancer.pfi_score);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/employer/projects/${id}`}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="w-px h-5 bg-slate-200" />
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Employer / Bids</div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Bids
            <span className="text-slate-400 font-normal ml-2 text-lg">({pendingBids.length})</span>
          </h1>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-start gap-2">
        <Lock className="w-4 h-4 mt-0.5 shrink-0" />
        <span>You pay when you accept a bid. The agreed amount goes into escrow and is only released as milestones pass AI verification.</span>
      </div>

      {pendingBids.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <div className="text-slate-400 text-sm">No bids yet. Check back soon.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingBids.map(bid => {
            const tier = getTier(bid.freelancer.pfi_score);
            const netEarning = bid.proposed_rate * (1 - tier.fee / 100);
            const tierClass = tierBg[tier.name] || tierBg["Standard"];
            return (
              <div key={bid.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-slate-900 font-semibold text-base">{bid.freelancer.name}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-sm font-bold font-mono" style={{ color: tier.color }}>
                        PFI {bid.freelancer.pfi_score}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${tierClass}`}>
                        {tier.name} — {tier.fee}% fee
                      </span>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="text-slate-900 font-bold font-mono text-lg">{formatPaise(bid.proposed_rate)}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Freelancer gets <span className="font-mono">{formatPaise(Math.floor(netEarning))}</span> after {tier.fee}% fee
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4 text-sm text-slate-600 leading-relaxed">
                  {bid.message}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{timeAgo(bid.created_at)}</span>
                  <button onClick={() => setConfirmBid(bid)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-5 py-2 rounded-xl font-medium transition-colors">
                    Accept & Pay
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmBid && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-sm w-full">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900">Accept {confirmBid.freelancer.name}'s bid?</h3>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Agreed amount</span>
                <span className="font-bold font-mono text-slate-900">{formatPaise(confirmBid.proposed_rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Milestone pool (50%)</span>
                <span className="font-mono text-blue-700">{formatPaise(confirmBid.proposed_rate / 2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Success fee (50%)</span>
                <span className="font-mono text-slate-600">{formatPaise(confirmBid.proposed_rate / 2)}</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs mb-5">
              All other {pendingBids.length - 1} bid(s) will be rejected. Funds go into escrow and release as milestones pass AI verification.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleAccept(confirmBid)} disabled={paying}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-colors text-sm">
                {paying ? "Processing..." : `Pay ${formatPaise(confirmBid.proposed_rate)} →`}
              </button>
              <button onClick={() => setConfirmBid(null)} disabled={paying}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-medium transition-colors text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
