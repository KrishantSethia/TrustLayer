"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPaise, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Wallet, Lock, TrendingUp } from "lucide-react";

interface WalletData {
  user_id: string;
  available_balance: number;
  escrow_pending: number;
  recent_transactions: Array<{ id: string; type: string; amount: number; created_at: string; notes?: string }>;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);

  useEffect(() => {
    if (user) apiFetch<WalletData>(`/users/${user.id}/wallet`).then(setWallet).catch(console.error);
  }, [user]);

  if (!wallet) return <div className="text-slate-400 text-sm">Loading wallet...</div>;

  const txns = wallet.recent_transactions ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Freelancer</div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Wallet & Earnings</h1>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 sm:p-6">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono">{formatPaise(wallet.available_balance)}</div>
          <div className="text-sm text-slate-500 mt-1">Available to Withdraw</div>
        </div>
        <div className="bg-white border border-amber-200 rounded-2xl p-4 sm:p-6">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 font-mono">{formatPaise(wallet.escrow_pending)}</div>
          <div className="text-sm text-slate-500 mt-1">Frozen in Escrow</div>
        </div>
      </div>

      {/* Frozen explanation */}
      {wallet.escrow_pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
          <span className="font-semibold">Why is money frozen?</span> TrustLayer holds your milestone earnings until the full project completes. Complete all milestones → everything releases together.
        </div>
      )}

      {/* Transactions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Transaction History</h2>
        </div>
        {txns.length === 0 ? (
          <div className="text-slate-400 text-sm text-center py-10">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {txns.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div>
                  <div className="text-sm text-slate-900 font-medium capitalize">{tx.type.replace(/_/g, " ")}</div>
                  {tx.notes && <div className="text-xs text-slate-400 mt-0.5">{tx.notes}</div>}
                  <div className="text-xs text-slate-400 mt-0.5">{formatDate(tx.created_at)}</div>
                </div>
                <div className="font-bold text-emerald-600 font-mono">{formatPaise(Math.abs(tx.amount))}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
