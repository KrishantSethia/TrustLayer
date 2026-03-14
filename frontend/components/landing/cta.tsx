"use client";
import Link from "next/link";
import { FadeUp } from "./fade-up";

export default function CTA() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
      <FadeUp>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Ready to eliminate the trust gap?
          </h2>
          <p className="text-slate-500 mb-10 max-w-lg mx-auto leading-relaxed">
            Join TrustLayer and let AI be the neutral third party that both employers and
            freelancers can agree on.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup?role=EMPLOYER"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
            >
              I need work done →
            </Link>
            <Link
              href="/signup?role=FREELANCER"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm"
            >
              I want to get hired
            </Link>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
