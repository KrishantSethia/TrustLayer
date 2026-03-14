"use client";
import { FadeUp } from "./fade-up";
import { ShieldCheck, Lock, Clock, Layers } from "lucide-react";

const stats = [
  { icon: ShieldCheck, value: "0%", label: "Human decisions required" },
  { icon: Lock, value: "100%", label: "Capital backed by verified work" },
  { icon: Clock, value: "24h", label: "Max employer review window" },
  { icon: Layers, value: "3", label: "Milestones generated per project" },
];

export default function Stats() {
  return (
    <section className="border-y border-slate-200 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <FadeUp key={s.label} delay={i * 0.08}>
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                    <Icon className="w-4.5 h-4.5 text-slate-500" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums mb-1">{s.value}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </div>
            </FadeUp>
          );
        })}
      </div>
    </section>
  );
}
