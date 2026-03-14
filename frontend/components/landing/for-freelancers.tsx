"use client";
import Link from "next/link";
import { FadeUp } from "./fade-up";
import PFIScoreIllustration from "@/components/illustrations/pfi-score";

const tiers = [
  { range: "300–499", tier: "High Risk", fee: "15%", borderColor: "border-red-800", feeColor: "text-red-400", bgColor: "bg-red-950/20" },
  { range: "500–649", tier: "Standard", fee: "10%", borderColor: "border-yellow-700", feeColor: "text-yellow-400", bgColor: "bg-yellow-950/20" },
  { range: "650–799", tier: "Proven Pro", fee: "5%", borderColor: "border-blue-700", feeColor: "text-blue-400", bgColor: "bg-blue-950/20" },
  { range: "800–850", tier: "God-Tier", fee: "0%", borderColor: "border-emerald-700", feeColor: "text-emerald-400", bgColor: "bg-emerald-950/20" },
];

const pfiBenefits = [
  { delta: "+15 pts", label: "AI approved on first submission" },
  { delta: "+10 pts", label: "Submitted 24h+ before deadline" },
  { delta: "+5 pts", label: "AI approved on 2nd–3rd try" },
  { delta: "−15 pts", label: "Missed deadline" },
  { delta: "−75 pts", label: "Lost employer dispute" },
];

export default function ForFreelancers() {
  return (
    <section id="freelancers" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
      <FadeUp>
        <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 items-center">

            {/* Col 1 — copy + PFI delta */}
            <div className="md:col-span-1">
              <div className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-4">
                For Freelancers
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 tracking-tight">
                Your reputation earns you lower fees
              </h2>
              <p className="text-slate-400 leading-relaxed mb-6 text-sm">
                Every milestone you complete builds your{" "}
                <strong className="text-white">PFI score</strong> — from 300 to 850.
                Top freelancers pay 0% fees.
              </p>

              <div className="space-y-2 mb-7">
                {pfiBenefits.map((b) => (
                  <div key={b.label} className="flex items-center gap-3 text-sm">
                    <span className={`font-mono font-bold w-16 text-right flex-shrink-0 text-xs ${b.delta.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                      {b.delta}
                    </span>
                    <span className="text-slate-400 text-xs">{b.label}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/signup?role=FREELANCER"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Start building your PFI →
              </Link>
            </div>

            {/* Col 2 — PFI Gauge */}
            <div className="md:col-span-1 flex items-center justify-center">
              <PFIScoreIllustration className="w-full max-w-[280px]" />
            </div>

            {/* Col 3 — tier cards */}
            <div className="md:col-span-1">
              <div className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">
                Fee Tiers by PFI Score
              </div>
              <div className="grid grid-cols-2 gap-3">
                {tiers.map((t) => (
                  <div key={t.range} className={`border rounded-xl p-4 text-center ${t.borderColor} ${t.bgColor}`}>
                    <div className={`text-2xl font-bold font-mono tabular-nums ${t.feeColor}`}>{t.fee}</div>
                    <div className="text-xs text-slate-300 font-medium mt-1">{t.tier}</div>
                    <div className="text-xs text-slate-600 mt-0.5 font-mono">{t.range}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-4 leading-relaxed">
                New freelancers start at 500 (Standard, 10% fee). Every on-time delivery moves you up.
              </p>
            </div>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
