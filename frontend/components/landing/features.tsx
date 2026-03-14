"use client";
import { FadeUp } from "./fade-up";
import { Bot, Lock, BarChart3, Ghost } from "lucide-react";

const features = [
  {
    icon: Bot,
    iconBg: "bg-blue-50 text-blue-600",
    title: "AI Quality Judge",
    desc: "Every deliverable is evaluated by AI against exact success criteria you define. Binary pass/fail — no subjective opinions.",
  },
  {
    icon: Lock,
    iconBg: "bg-emerald-50 text-emerald-600",
    title: "Smart Escrow",
    desc: "Funds are locked the moment a project is funded. Released only when AI certifies the work meets spec.",
  },
  {
    icon: BarChart3,
    iconBg: "bg-amber-50 text-amber-600",
    title: "PFI Score",
    desc: "Freelancers earn a Professional Fidelity Index from 300–850. Higher score = lower platform fees, more client trust.",
  },
  {
    icon: Ghost,
    iconBg: "bg-violet-50 text-violet-600",
    title: "Ghost Protocol",
    desc: "If a freelancer abandons a project 72h past deadline, the system auto-refunds the employer and relists the work. No admin needed.",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-slate-50 border-y border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <FadeUp>
          <div className="text-center mb-16">
            <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-3">Platform</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">
              Built for trust at every layer
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Neither party can cheat — funds are locked by escrow and work is objectively judged by AI.
            </p>
          </div>
        </FadeUp>

        <div className="grid md:grid-cols-2 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <FadeUp key={f.title} delay={i * 0.1}>
                <div className="bg-white border border-slate-200 rounded-2xl p-7 flex gap-5 hover:shadow-md hover:border-slate-300 transition-all h-full">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${f.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1.5">{f.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
