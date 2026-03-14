"use client";
import { FadeUp } from "./fade-up";
import WorkflowIllustration from "@/components/illustrations/workflow";

const steps = [
  {
    num: "01",
    role: "Employer",
    roleStyle: "border-blue-200 text-blue-600 bg-blue-50",
    title: "Post & Fund",
    desc: "Paste your requirement. AI breaks it into milestone deliverables with exact success criteria. Lock funds in escrow.",
  },
  {
    num: "02",
    role: "Freelancer",
    roleStyle: "border-emerald-200 text-emerald-600 bg-emerald-50",
    title: "Bid & Work",
    desc: "Browse the marketplace, bid based on your reputation score, get assigned, and submit work for AI review.",
  },
  {
    num: "03",
    role: "Platform",
    roleStyle: "border-violet-200 text-violet-600 bg-violet-50",
    title: "AI Verifies & Pays",
    desc: "AI judges the submission. On approval, a 24-hour employer review window opens. Silence = approval. Funds transfer automatically.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
      <FadeUp>
        <div className="text-center mb-16">
          <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-3">Process</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">How it works</h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Three actors. One autonomous agent in the middle.
          </p>
        </div>
      </FadeUp>

      <div className="grid lg:grid-cols-2 gap-14 items-center">

        {/* Left — Illustration */}
        <FadeUp delay={0.05}>
          <WorkflowIllustration className="w-full max-w-sm mx-auto" />
        </FadeUp>

        {/* Right — steps */}
        <div className="space-y-5">
          {steps.map((s, i) => (
            <FadeUp key={s.num} delay={0.1 + i * 0.12}>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all hover:border-slate-300 flex gap-5">
                <span className="text-4xl font-black text-slate-100 leading-none select-none flex-shrink-0 pt-0.5">
                  {s.num}
                </span>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold border rounded-full px-2.5 py-1 ${s.roleStyle}`}>
                      {s.role}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
