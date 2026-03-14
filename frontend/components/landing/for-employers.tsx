"use client";
import Link from "next/link";
import { FadeUp } from "./fade-up";
import { CheckCircle2, Sparkles, ShieldCheck, RefreshCw, Scale } from "lucide-react";

const benefits = [
  {
    icon: Sparkles,
    title: "AI Requirement Decomposer",
    desc: "Paste a rough brief. AI turns it into a 3-milestone project with exact pass/fail success criteria — in seconds.",
  },
  {
    icon: ShieldCheck,
    title: "Escrow-Protected Payments",
    desc: "Funds are locked at project start. No freelancer can be paid until each milestone passes AI verification.",
  },
  {
    icon: Scale,
    title: "24-Hour Review Window",
    desc: "After every AI approval, you get 24 hours to review the work. Disagree? File a dispute — a human admin arbitrates.",
  },
  {
    icon: RefreshCw,
    title: "Automatic Refund on Abandonment",
    desc: "Ghost Protocol fires 72h after a missed deadline. Your remaining escrow is fully refunded, no questions asked.",
  },
];

// Mock milestone decompose output
const mockMilestones = [
  { seq: "M1", title: "Research & Outline", pct: "10%", days: "2 days" },
  { seq: "M2", title: "Full Draft (1,000+ words)", pct: "30%", days: "5 days" },
  { seq: "M3", title: "Final Revision & SEO", pct: "60%", days: "7 days" },
];

export default function ForEmployers() {
  return (
    <section id="employers" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
      <div className="grid lg:grid-cols-2 gap-16 items-center">

        {/* Left — copy */}
        <div>
          <FadeUp>
            <div className="text-xs text-blue-600 font-semibold uppercase tracking-widest mb-4">
              For Employers
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 tracking-tight">
              Post a project in minutes.<br />Get verified results.
            </h2>
            <p className="text-slate-500 leading-relaxed mb-10">
              Stop arguing about quality. TrustLayer's AI sets the bar before work starts,
              and judges the result against it. You only pay for work that actually meets spec.
            </p>
          </FadeUp>

          <div className="space-y-5">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <FadeUp key={b.title} delay={i * 0.1}>
                  <div className="flex gap-4">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 mb-0.5">{b.title}</div>
                      <div className="text-sm text-slate-500 leading-relaxed">{b.desc}</div>
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>

          <FadeUp delay={0.5}>
            <Link
              href="/signup?role=EMPLOYER"
              className="inline-flex items-center gap-2 mt-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Post your first project →
            </Link>
          </FadeUp>
        </div>

        {/* Right — AI decomposer preview */}
        <FadeUp delay={0.2}>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
              <div className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-1">AI Requirement Decomposer</div>
              <div className="text-sm font-medium text-slate-700 italic">
                "Write a 1,000-word SEO blog post about AI in healthcare..."
              </div>
            </div>

            {/* Output */}
            <div className="px-5 py-5 space-y-3">
              {mockMilestones.map((m, i) => (
                <div key={m.seq} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded flex-shrink-0">
                    {m.seq}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{m.title}</div>
                    <div className="text-xs text-slate-400">{m.days}</div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full flex-shrink-0">
                    {m.pct}
                  </span>
                </div>
              ))}
            </div>

            {/* Success criteria preview */}
            <div className="px-5 pb-5">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wide mb-2">
                  AI Success Criteria — M2
                </div>
                <div className="space-y-1.5">
                  {[
                    "Word count ≥ 1,000",
                    "Target keywords appear ≥ 3 times",
                    "At least 2 credible citations",
                    "Flesch reading ease score ≥ 60",
                  ].map((c) => (
                    <div key={c} className="flex items-center gap-2 text-xs text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
