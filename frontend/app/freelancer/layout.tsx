"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Nav from "@/components/nav";

export default function FreelancerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "FREELANCER")) router.push("/login");
  }, [user, isLoading]);
  if (isLoading || !user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  );
  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-5 py-5 sm:py-8">{children}</main>
    </div>
  );
}
