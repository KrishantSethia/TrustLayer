"use client";
import Link from "next/link";
import Image from "next/image";

const links = {
  Product: [
    { label: "How it works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "PFI Score", href: "#freelancers" },
    { label: "FAQ", href: "#faq" },
  ],
  Employers: [
    { label: "Post a project", href: "/signup?role=EMPLOYER" },
    { label: "How escrow works", href: "#how-it-works" },
    { label: "AI decomposer", href: "#employers" },
    { label: "Dispute process", href: "#faq" },
  ],
  Freelancers: [
    { label: "Browse marketplace", href: "/signup?role=FREELANCER" },
    { label: "PFI & fee tiers", href: "#freelancers" },
    { label: "Ghost Protocol", href: "#features" },
    { label: "Extension requests", href: "#faq" },
  ],
  Account: [
    { label: "Sign in", href: "/login" },
    { label: "Create account", href: "/signup" },
    { label: "Employer signup", href: "/signup?role=EMPLOYER" },
    { label: "Freelancer signup", href: "/signup?role=FREELANCER" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-8">

        {/* Top: brand + links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Image src="/logo.png" alt="TrustLayer" width={28} height={28} className="rounded-lg" />
              <span className="font-semibold text-slate-900">TrustLayer</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-powered freelance escrow. Capital flows only when value is verified.
            </p>
          </div>

          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <div className="text-xs font-semibold text-slate-900 uppercase tracking-widest mb-4">
                {group}
              </div>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} TrustLayer. All rights reserved.</span>
          <span>Built for the future of work.</span>
        </div>
      </div>
    </footer>
  );
}
