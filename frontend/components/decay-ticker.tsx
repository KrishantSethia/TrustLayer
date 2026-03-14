"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@/lib/utils";

interface DecayData {
  current_payout: number;
  original_payout: number;
  floor_payout: number;
  is_overdue: boolean;
  hours_overdue: number;
}

export default function DecayTicker({ milestoneId }: { milestoneId: string }) {
  const [data, setData] = useState<DecayData | null>(null);

  const fetch = async () => {
    try {
      const d = await apiFetch<DecayData>(`/milestones/${milestoneId}/decay`);
      setData(d);
    } catch {}
  };

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 3000);
    return () => clearInterval(id);
  }, [milestoneId]);

  if (!data?.is_overdue) return null;

  const pct = data.original_payout > data.floor_payout
    ? ((data.current_payout - data.floor_payout) / (data.original_payout - data.floor_payout)) * 100
    : 100;

  return (
    <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-sm">
      <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
        💸 Payment Decaying — {data.hours_overdue.toFixed(1)}h overdue
      </div>
      <div className="text-white mb-1">
        Current payout: <span className="font-bold text-red-300">{formatPaise(data.current_payout)}</span>
        <span className="text-gray-500 ml-1">(was {formatPaise(data.original_payout)})</span>
      </div>
      <div className="bg-gray-800 rounded-full h-2 overflow-hidden mb-1">
        <div className="h-full bg-red-500 transition-all duration-300 rounded-full"
          style={{ width: `${pct}%` }} />
      </div>
      <div className="text-gray-500 text-xs">Floor: {formatPaise(data.floor_payout)}</div>
    </div>
  );
}
