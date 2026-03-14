"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "For Employers", href: "#employers" },
  { label: "For Freelancers", href: "#freelancers" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="TrustLayer" width={32} height={32} className="rounded-lg" />
          <span className="font-semibold text-slate-900 text-lg tracking-tight">TrustLayer</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-500">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-slate-900 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Get started →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="sm:hidden p-2 -mr-2 text-slate-600 hover:text-slate-900"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 pb-4 pt-2 space-y-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <div className="border-t border-slate-100 pt-3 mt-2 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors py-2"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="text-sm bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-center"
            >
              Get started →
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
