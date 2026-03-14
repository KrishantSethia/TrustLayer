"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, CheckCircle2, TrendingUp, AlertCircle, Lock, Zap, Shield } from "lucide-react";

const activityFeed = [
  { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50", text: "Milestone paid out", sub: "₹18,000 released · SEO Blog Series", delay: 1.2 },
  { icon: TrendingUp, color: "text-blue-600 bg-blue-50", text: "PFI score increased", sub: "Priya R. · 762 → 785 · Proven Pro tier", delay: 2.4 },
  { icon: Bot, color: "text-violet-600 bg-violet-50", text: "AI evaluated a submission", sub: "Score 91/100 · All criteria met · Payout queued", delay: 3.6 },
  { icon: AlertCircle, color: "text-amber-600 bg-amber-50", text: "Extension approved", sub: "New deadline accepted · Decay timer reset", delay: 4.8 },
];

const checklist = [
  { criterion: "Word count ≥ 1,000 words", met: true },
  { criterion: "SEO keywords included (3 of 3)", met: true },
  { criterion: "Proper citations provided", met: true },
  { criterion: "Readability grade ≤ 8", met: false },
];

const metrics = [
  { icon: Lock, value: "₹2.4L+", label: "Secured in escrow", color: "text-emerald-600 bg-emerald-50" },
  { icon: Bot, value: "94%", label: "First-try AI approvals", color: "text-blue-600 bg-blue-50" },
  { icon: Zap, value: "< 60s", label: "To post a project", color: "text-amber-600 bg-amber-50" },
];

function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Hero() {
  const countdown = useCountdown(85267);

  return (
    <section className="relative overflow-hidden lg:min-h-[calc(100vh-64px)] flex items-center">
      {/* Dot grid */}
      <div className="absolute inset-0 [background-image:radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:28px_28px] opacity-60" />
      {/* Left tinted zone — fills the empty white space with subtle blue warmth */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-blue-50/60 to-transparent pointer-events-none" />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />

      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-16">

          {/* ── Left — copy ── */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.0 }}
              className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 text-xs text-blue-700 font-medium mb-5 sm:mb-8"
            >
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              Autonomous AI · Secure Escrow · Instant Payouts
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-5xl lg:text-[3.75rem] font-bold leading-[1.1] mb-4 sm:mb-6 tracking-tight text-slate-900"
            >
              Capital flows only<br />
              when{" "}
              <span className="text-blue-600">value is verified.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm sm:text-lg text-slate-500 max-w-xl mb-5 sm:mb-8 leading-relaxed"
            >
              TrustLayer is an AI-powered freelance escrow platform. An autonomous agent
              decomposes projects into milestones, evaluates every submission, and releases
              payment — no manual review needed.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6 sm:mb-8"
            >
              <Link
                href="/signup?role=EMPLOYER"
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm"
              >
                Post a project →
              </Link>
              <Link
                href="/signup?role=FREELANCER"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm"
              >
                Start earning
              </Link>
            </motion.div>

            {/* ── Live platform metric strip ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="grid grid-cols-3 gap-2 sm:flex sm:flex-row sm:gap-3 justify-center lg:justify-start"
            >
              {metrics.map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    className="flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 bg-white border border-slate-200 rounded-xl px-2 sm:px-4 py-2.5 sm:py-3 shadow-sm text-center sm:text-left"
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.color}`}>
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono tabular-nums leading-tight">{m.value}</div>
                      <div className="text-[10px] sm:text-xs text-slate-400 leading-tight">{m.label}</div>
                    </div>
                  </div>
                );
              })}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center gap-2 mt-3 sm:mt-5 justify-center lg:justify-start"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">Free to sign up · Secure payments · No lock-in</span>
            </motion.div>
          </div>

          {/* ── Right — product card + activity feed (hidden on mobile) ── */}
          <div className="hidden lg:block flex-1 w-full max-w-[420px] mx-auto lg:mx-0">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
            >
              <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">M2</span>
                  <span className="text-sm font-medium text-slate-800">Article Draft & Review</span>
                </div>
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.3 }}
                  className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full"
                >
                  AI Approved
                </motion.span>
              </div>

              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">AI Evaluation</span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="text-sm font-bold text-slate-900 font-mono"
                  >
                    94 / 100
                  </motion.span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-4">
                  <motion.div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "94%" }}
                    transition={{ duration: 1.2, delay: 1.0, ease: "easeOut" }}
                  />
                </div>
                <div className="space-y-2">
                  {checklist.map((c, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 + i * 0.15, duration: 0.3 }}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className={c.met ? "text-emerald-600 font-bold" : "text-red-400 font-bold"}>
                        {c.met ? "✓" : "✗"}
                      </span>
                      <span className={c.met ? "text-slate-700" : "text-slate-400 line-through"}>
                        {c.criterion}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Auto-releasing payment in</div>
                  <div className="text-2xl font-mono font-bold text-slate-900 tracking-tight tabular-nums">
                    {countdown}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 mb-1">Payout</div>
                  <div className="text-xl font-bold text-emerald-600 font-mono">₹9,000</div>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button className="w-full border border-red-200 text-red-500 text-xs py-2.5 rounded-lg font-medium hover:bg-red-50 transition-colors">
                  Dispute & Veto — 5% arbitration fee applies
                </button>
              </div>
            </motion.div>

            {/* Live activity feed — hidden on mobile to keep hero compact */}
            <div className="hidden sm:block mt-3 space-y-2">
              {activityFeed.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: item.delay, duration: 0.4 }}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-3"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 leading-tight">{item.text}</div>
                      <div className="text-xs text-slate-400 truncate">{item.sub}</div>
                    </div>
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
                      className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0"
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
