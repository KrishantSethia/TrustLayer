"use client";
import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ApiError } from "@/lib/api";
import { Building2, Briefcase, CheckCircle2, AlertCircle, Bot, Shield } from "lucide-react";

const stats = [
  { label: "Platform fee", value: "0%", sub: "at highest trust tier" },
  { label: "Avg. release", value: "< 1h", sub: "after AI approval" },
  { label: "First-try approvals", value: "94%", sub: "across all categories" },
];

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.get("registered")) setSuccess("Account created! Sign in below.");
  }, [params]);

  const doLogin = async (em: string, pw: string) => {
    setError("");
    setLoading(true);
    try {
      await login(em, pw);
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u.role === "EMPLOYER") router.push("/employer");
      else if (u.role === "FREELANCER") router.push("/freelancer");
      else if (u.role === "ADMIN") router.push("/admin");
      else router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: { preventDefault: () => void }) => { e.preventDefault(); doLogin(email, password); };
  const quickLogin = (demoEmail: string) => doLogin(demoEmail, "demo1234");

  return (
    <div className="min-h-screen bg-white flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] bg-slate-50 border-r border-slate-200 p-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="TrustLayer" width={32} height={32} className="rounded-xl" />
          <span className="font-bold text-slate-900 text-lg">TrustLayer</span>
        </Link>

        {/* Quote */}
        <div>
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-6">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <blockquote className="text-2xl font-semibold text-slate-900 leading-relaxed mb-6">
            "The AI judge approved my work in 8 seconds. Payment hit my wallet before my client even read the notification."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              R
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Riya Mehta</div>
              <div className="text-xs text-slate-500">Freelance Technical Writer · PFI 812</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-xl font-bold text-slate-900 font-mono">{s.value}</div>
              <div className="text-xs font-medium text-slate-700 mt-0.5">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2.5 justify-center mb-10 lg:hidden">
            <Image src="/logo.png" alt="TrustLayer" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-slate-900 text-lg">TrustLayer</span>
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm mb-8">Sign in to your TrustLayer account</p>

          {success && (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3.5 mb-5 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3.5 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                required
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-400">
              <span className="bg-white px-3">or try a demo account</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => quickLogin("rajesh@trustlayer.demo")} disabled={loading}
              className="bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl p-4 text-left transition-all disabled:opacity-50 group"
            >
              <Building2 className="w-5 h-5 text-blue-500 mb-2" />
              <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">Demo Employer</div>
              <div className="text-xs text-slate-400 mt-0.5">Rajesh Mehta · Post &amp; fund</div>
            </button>
            <button
              onClick={() => quickLogin("priya@trustlayer.demo")} disabled={loading}
              className="bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl p-4 text-left transition-all disabled:opacity-50 group"
            >
              <Briefcase className="w-5 h-5 text-emerald-500 mb-2" />
              <div className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">Demo Freelancer</div>
              <div className="text-xs text-slate-400 mt-0.5">Priya Sharma · PFI 795</div>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mt-8">
            <Shield className="w-3.5 h-3.5 text-slate-300" />
            <p className="text-slate-400 text-xs">
              No account?{" "}
              <Link href="/signup" className="text-blue-600 hover:underline font-medium">Create one →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
