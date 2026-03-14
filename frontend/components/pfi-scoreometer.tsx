"use client";
import { useEffect, useState } from "react";
import { getTier } from "@/lib/utils";

interface Props {
  score: number;
  size?: "small" | "large";
  showBreakdown?: boolean; // kept for API compat, unused
}

const PFI_MIN = 300;
const PFI_MAX = 850;
const RANGE   = PFI_MAX - PFI_MIN;

// score → [x, y] on the semicircular arc
function pt(score: number, cx: number, cy: number, r: number): [number, number] {
  const frac = (score - PFI_MIN) / RANGE;
  const a = Math.PI * (1 - frac);
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}

// arc path from score s1 to s2 (clockwise through top half)
function seg(s1: number, s2: number, cx: number, cy: number, r: number): string {
  const [x1, y1] = pt(s1, cx, cy, r);
  const [x2, y2] = pt(s2, cx, cy, r);
  const span = ((s2 - s1) / RANGE) * 180;
  const large = span > 180 ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  "High Risk":  { bg: "#450a0a", text: "#fca5a5" },
  "Standard":   { bg: "#451a03", text: "#fcd34d" },
  "Proven Pro": { bg: "#0c1a2e", text: "#A5B4FC" },
  "God-Tier":   { bg: "#14532D", text: "#4ADE80" },
};

export default function PFIScoreometer({ score, size = "large" }: Props) {
  const [displayScore, setDisplayScore] = useState(PFI_MIN);
  const tier  = getTier(displayScore);
  const badge = BADGE_COLORS[tier.name] ?? BADGE_COLORS["Standard"];

  useEffect(() => {
    const start = displayScore;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const t    = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(start + (score - start) * ease));
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]); // eslint-disable-line react-hooks/exhaustive-deps

  if (size === "small") {
    const cx = 130, cy = 110, r = 80;
    const frac = (displayScore - PFI_MIN) / RANGE;
    const angle = Math.PI * (1 - frac);
    const nx = cx + r * 0.82 * Math.cos(angle);
    const ny = cy - r * 0.82 * Math.sin(angle);

    return (
      <svg viewBox="0 0 260 170" fill="none" className="w-28 rounded-xl">
        <rect width="260" height="170" rx="14" fill="#0F172A" />
        <path d={seg(300, 850, cx, cy, r)} stroke="#1E293B" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d={seg(300, 499, cx, cy, r)} stroke="#EF4444" strokeWidth="12" strokeLinecap="butt" fill="none" opacity="0.25" />
        <path d={seg(499, 649, cx, cy, r)} stroke="#F59E0B" strokeWidth="12" strokeLinecap="butt" fill="none" opacity="0.25" />
        <path d={seg(649, 799, cx, cy, r)} stroke="#22D3EE" strokeWidth="12" strokeLinecap="butt" fill="none" opacity="0.25" />
        <path d={seg(799, 850, cx, cy, r)} stroke="#A78BFA" strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.25" />
        {displayScore > 300 && <path d={seg(300, Math.min(displayScore, 499), cx, cy, r)} stroke="#EF4444" strokeWidth="12" strokeLinecap="butt" fill="none" opacity="0.9" />}
        {displayScore > 499 && <path d={seg(499, Math.min(displayScore, 649), cx, cy, r)} stroke="#F59E0B" strokeWidth="12" strokeLinecap="butt" fill="none" opacity="0.9" />}
        {displayScore > 649 && <path d={seg(649, Math.min(displayScore, 799), cx, cy, r)} stroke="#22D3EE" strokeWidth="12" strokeLinecap="butt" fill="none" opacity="0.9" />}
        {displayScore > 799 && <path d={seg(799, Math.min(displayScore, 850), cx, cy, r)} stroke="#A78BFA" strokeWidth="12" strokeLinecap="round" fill="none" />}
        <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="2.5" fill="#818CF8" />
        <text x={cx} y={cy + 30} textAnchor="middle" fontSize="28" fontWeight="800" fill="white" fontFamily="system-ui, sans-serif">{displayScore}</text>
      </svg>
    );
  }

  // Large
  const cx = 210, cy = 175, r = 120;
  const frac = (displayScore - PFI_MIN) / RANGE;
  const angle = Math.PI * (1 - frac);
  const nx = cx + r * 0.82 * Math.cos(angle);
  const ny = cy - r * 0.82 * Math.sin(angle);
  const ticks = [300, 500, 650, 800, 850];

  return (
    <svg viewBox="0 0 420 310" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <rect width="420" height="310" rx="20" fill="#0F172A" />
      <ellipse cx={cx} cy={cy + 10} rx="145" ry="55" fill="#6D28D9" opacity="0.12" />

      {/* Track */}
      <path d={seg(300, 850, cx, cy, r)} stroke="#1E293B" strokeWidth="22" strokeLinecap="round" fill="none" />

      {/* Background tiers (dimmed) */}
      <path d={seg(300, 499, cx, cy, r)} stroke="#EF4444" strokeWidth="18" strokeLinecap="butt" fill="none" opacity="0.2" />
      <path d={seg(499, 649, cx, cy, r)} stroke="#F59E0B" strokeWidth="18" strokeLinecap="butt" fill="none" opacity="0.2" />
      <path d={seg(649, 799, cx, cy, r)} stroke="#22D3EE" strokeWidth="18" strokeLinecap="butt" fill="none" opacity="0.2" />
      <path d={seg(799, 850, cx, cy, r)} stroke="#A78BFA" strokeWidth="18" strokeLinecap="round" fill="none" opacity="0.2" />

      {/* Active arc up to current score */}
      {displayScore > 300 && <path d={seg(300, Math.min(displayScore, 499), cx, cy, r)} stroke="#EF4444" strokeWidth="18" strokeLinecap="butt" fill="none" opacity="0.85" />}
      {displayScore > 499 && <path d={seg(499, Math.min(displayScore, 649), cx, cy, r)} stroke="#F59E0B" strokeWidth="18" strokeLinecap="butt" fill="none" opacity="0.85" />}
      {displayScore > 649 && <path d={seg(649, Math.min(displayScore, 799), cx, cy, r)} stroke="#22D3EE" strokeWidth="18" strokeLinecap="butt" fill="none" opacity="0.9" />}
      {displayScore > 799 && <path d={seg(799, Math.min(displayScore, 850), cx, cy, r)} stroke="#A78BFA" strokeWidth="18" strokeLinecap="round" fill="none" />}

      {/* Tick marks */}
      {ticks.map((s) => {
        const f = (s - PFI_MIN) / RANGE;
        const a = Math.PI * (1 - f);
        const ox = cx + (r + 8)  * Math.cos(a);
        const oy = cy - (r + 8)  * Math.sin(a);
        const ix = cx + (r - 4)  * Math.cos(a);
        const iy = cy - (r - 4)  * Math.sin(a);
        return <line key={s} x1={ox.toFixed(1)} y1={oy.toFixed(1)} x2={ix.toFixed(1)} y2={iy.toFixed(1)} stroke="#334155" strokeWidth="2" />;
      })}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="9" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="3.5" fill="#818CF8" />

      {/* Score */}
      <text x={cx} y={cy + 42} textAnchor="middle" fontSize="48" fontWeight="800" fill="white" fontFamily="system-ui, sans-serif">{displayScore}</text>
      <text x={cx} y={cy + 64} textAnchor="middle" fontSize="11" fill="#64748B" fontFamily="system-ui, sans-serif">Professional Fidelity Index</text>

      {/* Tier badge */}
      <rect x={cx - 70} y={cy + 74} width="140" height="26" rx="13" fill={badge.bg} />
      <text x={cx} y={cy + 91} textAnchor="middle" fontSize="11" fontWeight="700" fill={badge.text} fontFamily="system-ui, sans-serif">✦ {tier.name} — {tier.fee}% fee</text>

      {/* Range labels */}
      <text x="78" y={cy + 16} fontSize="10" fill="#475569" fontFamily="system-ui, sans-serif">300</text>
      <text x="330" y={cy + 16} fontSize="10" fill="#475569" fontFamily="system-ui, sans-serif">850</text>
    </svg>
  );
}
