"use client";
import { useState, useEffect, Suspense } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Building2, Briefcase, CheckCircle2, AlertCircle, ChevronLeft, Shield } from "lucide-react";

const ROLE_CONFIG = {
  EMPLOYER: {
    Icon: Building2,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    label: "I'm an Employer",
    sublabel: "I need work done",
    cardHover: "hover:border-blue-400 hover:bg-blue-50/40",
    cardActive: "border-blue-400 bg-blue-50/40",
    pillBg: "bg-blue-50 border-blue-200",
    pillText: "text-blue-700",
    checkColor: "text-blue-500",
    perks: [
      "AI breaks your requirement into structured milestones",
      "Funds locked in escrow — never pay for bad work",
      "24-hour dispute window to challenge AI decisions",
    ],
    ctaLabel: "Create Employer Account →",
    ctaClass: "bg-slate-900 hover:bg-slate-800",
    calloutBg: "bg-blue-50 border-blue-200",
    calloutText: "text-blue-700",
    callout: "After signing up, use the AI Requirement Generator to decompose your first project into milestones automatically.",
    description: "Post projects, lock funds securely, get AI-verified deliverables.",
  },
  FREELANCER: {
    Icon: Briefcase,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    label: "I'm a Freelancer",
    sublabel: "I want to get paid",
    cardHover: "hover:border-emerald-400 hover:bg-emerald-50/40",
    cardActive: "border-emerald-400 bg-emerald-50/40",
    pillBg: "bg-emerald-50 border-emerald-200",
    pillText: "text-emerald-700",
    checkColor: "text-emerald-500",
    perks: [
      "Browse projects and bid based on your reputation score",
      "Get paid per milestone — no waiting for project end",
      "Build your score to unlock 0% platform fees",
    ],
    ctaLabel: "Create Freelancer Account →",
    ctaClass: "bg-emerald-600 hover:bg-emerald-500",
    calloutBg: "bg-emerald-50 border-emerald-200",
    calloutText: "text-emerald-700",
    callout: "You'll start with a reputation score of 500 (Standard tier, 10% fee). Complete milestones on time to earn your way to 0%.",
    description: "Bid on projects, submit work, get paid automatically when AI approves.",
  },
} as const;

type Role = keyof typeof ROLE_CONFIG;

function SignupFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [role, setRole] = useState<Role>("FREELANCER");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const r = params.get("role") as Role | null;
    if (r && (r === "EMPLOYER" || r === "FREELANCER")) {
      setRole(r);
      setStep("form");
    }
  }, [params]);

  const selectRole = (r: Role) => { setRole(r); setStep("form"); };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ ...form, phone: parseInt(form.phone), role }),
      });
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const cfg = ROLE_CONFIG[role];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Nav ── */}
      <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/logo.png" alt="TrustLayer" width={28} height={28} className="rounded-lg" />
          <span className="font-bold text-slate-900 text-lg">TrustLayer</span>
        </Link>
        <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors text-right">
          <span className="hidden sm:inline">Already have an account? </span><span className="text-blue-600 font-medium">Sign in →</span>
        </Link>
      </nav>

      {/* ── Step 1: Role picker ── */}
      {step === "pick" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8 sm:mb-10">
              <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-3">Get started</div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">How will you use TrustLayer?</h1>
              <p className="text-slate-500">Choose your role to get started. You can always create a second account later.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {(["EMPLOYER", "FREELANCER"] as Role[]).map((r) => {
                const c = ROLE_CONFIG[r];
                const { Icon } = c;
                return (
                  <button
                    key={r}
                    onClick={() => selectRole(r)}
                    className={`text-left bg-white border-2 border-slate-200 ${c.cardHover} rounded-2xl p-5 sm:p-8 transition-all hover:scale-[1.015] hover:shadow-md group`}
                  >
                    <div className={`w-12 h-12 ${c.iconBg} rounded-xl flex items-center justify-center mb-5`}>
                      <Icon className={`w-6 h-6 ${c.iconColor}`} />
                    </div>
                    <div className="text-xl font-bold text-slate-900 mb-1">{c.label}</div>
                    <div className={`text-sm font-medium ${c.pillText} mb-4`}>{c.sublabel}</div>
                    <p className="text-sm text-slate-500 leading-relaxed mb-5">{c.description}</p>
                    <ul className="space-y-2.5">
                      {c.perks.map((p) => (
                        <li key={p} className="flex items-start gap-2.5 text-xs text-slate-500">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${c.checkColor} flex-shrink-0 mt-0.5`} />
                          {p}
                        </li>
                      ))}
                    </ul>
                    <div className={`mt-6 text-sm font-semibold ${c.pillText} group-hover:underline`}>
                      Get started →
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Form ── */}
      {step === "form" && (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">

            {/* Back + role badge */}
            <button
              onClick={() => setStep("pick")}
              className={`inline-flex items-center gap-2 border ${cfg.pillBg} rounded-full px-3 py-1.5 text-xs mb-6 transition-colors hover:opacity-80`}
            >
              <ChevronLeft className="w-3 h-3" />
              <cfg.Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
              <span className={`font-semibold ${cfg.pillText}`}>{cfg.label}</span>
              <span className="text-slate-400">· change</span>
            </button>

            <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
            <p className="text-slate-500 text-sm mb-7">{cfg.description}</p>

            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3.5 mb-5 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
                <input
                  type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                <input
                  type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone number</label>
                <input
                  type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  required minLength={8}
                />
              </div>

              {/* Role-specific callout */}
              <div className={`border ${cfg.calloutBg} rounded-xl p-4 text-xs ${cfg.calloutText} leading-relaxed`}>
                {cfg.callout}
              </div>

              <button
                type="submit" disabled={loading}
                className={`w-full ${cfg.ctaClass} disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm`}
              >
                {loading ? "Creating account..." : cfg.ctaLabel}
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 mt-6">
              <Shield className="w-3.5 h-3.5 text-slate-300" />
              <p className="text-slate-400 text-xs">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in →</Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupFlow />
    </Suspense>
  );
}
