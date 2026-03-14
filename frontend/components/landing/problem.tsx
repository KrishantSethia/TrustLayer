"use client";
import { FadeUp } from "./fade-up";
import { XCircle } from "lucide-react";
import TrustGapIllustration from "@/components/illustrations/trust-gap";

const employerPains = [
  "Pay upfront and receive subpar work with no recourse",
  "Disputes drag on for weeks with no objective resolution",
  "No way to verify quality criteria before releasing payment",
  "One dishonest freelancer can derail an entire project",
];

const freelancerPains = [
  "Deliver great work and wait months — or never — to get paid",
  "Clients move goalposts after you've finished",
  "Subjective reviews destroy your reputation unfairly",
  "No leverage once work is handed over",
];

export default function Problem() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
      <FadeUp>
        <div className="text-center mb-16">
          <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-3">The Problem</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 tracking-tight">
            The freelance trust gap costs everyone
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Employers can't verify quality objectively. Freelancers face payment uncertainty.
            Manual escrow is slow, biased, and administratively heavy.
          </p>
        </div>
      </FadeUp>

      {/* Animation + pain cards side by side */}
      <div className="grid lg:grid-cols-2 gap-12 items-center mb-10">

        {/* Left — Illustration */}
        <FadeUp delay={0.05}>
          <TrustGapIllustration className="w-full max-w-sm mx-auto" />
        </FadeUp>

        {/* Right — pain cards stacked */}
        <div className="space-y-5">
          <FadeUp delay={0.1}>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
              <div className="inline-flex items-center gap-2 bg-white border border-red-200 rounded-full px-3 py-1 text-xs text-red-600 font-semibold mb-4">
                Employers
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-4">"I paid for work I can't use."</h3>
              <ul className="space-y-2.5">
                {employerPains.map((pain) => (
                  <li key={pain} className="flex items-start gap-3 text-sm text-slate-600">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    {pain}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
              <div className="inline-flex items-center gap-2 bg-white border border-orange-200 rounded-full px-3 py-1 text-xs text-orange-600 font-semibold mb-4">
                Freelancers
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-4">"I did the work. Where's my money?"</h3>
              <ul className="space-y-2.5">
                {freelancerPains.map((pain) => (
                  <li key={pain} className="flex items-start gap-3 text-sm text-slate-600">
                    <XCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    {pain}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
        </div>
      </div>

      {/* Bridge */}
      <FadeUp delay={0.3}>
        <div className="bg-blue-600 rounded-2xl px-5 sm:px-8 py-5 sm:py-6 text-center text-white">
          <p className="font-semibold text-base sm:text-lg">
            TrustLayer puts an AI agent in the middle — a neutral party that neither side can argue with.
          </p>
        </div>
      </FadeUp>
    </section>
  );
}
