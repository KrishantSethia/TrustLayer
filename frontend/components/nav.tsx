"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const employerLinks = [
  { href: "/employer", label: "Dashboard" },
  { href: "/employer/new-project", label: "New Project" },
  { href: "/employer/projects", label: "My Projects" },
];

const freelancerLinks = [
  { href: "/freelancer", label: "Dashboard" },
  { href: "/freelancer/marketplace", label: "Marketplace" },
  { href: "/freelancer/my-projects", label: "My Work" },
  { href: "/freelancer/wallet", label: "Wallet" },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/ghost-protocol", label: "Ghost Protocol" },
  { href: "/admin/demo", label: "Demo Panel" },
];

const rolePill: Record<string, string> = {
  EMPLOYER:   "bg-blue-50 text-blue-700 border-blue-200",
  FREELANCER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ADMIN:      "bg-violet-50 text-violet-700 border-violet-200",
};

export default function Nav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const links = user.role === "EMPLOYER" ? employerLinks
    : user.role === "FREELANCER" ? freelancerLinks
    : adminLinks;

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-4">
        <Link href={`/${user.role.toLowerCase()}`} className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="TrustLayer" width={26} height={26} className="rounded-lg" />
          <span className="font-bold text-slate-900 text-base hidden sm:block">TrustLayer</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto">
          {links.map(link => (
            <Link key={link.href} href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === link.href
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 md:hidden" />

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <span className="text-sm text-slate-600 font-medium hidden sm:block">{user.name}</span>
          <span className={`text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-full border ${rolePill[user.role] ?? rolePill.ADMIN}`}>
            {user.role}
          </span>
          <button onClick={logout}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors ml-1">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-1.5 -mr-1 text-slate-500 hover:text-slate-900">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav drawer */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-3 pt-1">
          {links.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }`}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
