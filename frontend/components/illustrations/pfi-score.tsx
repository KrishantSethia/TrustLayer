export default function PFIScoreIllustration({ className }: { className?: string }) {
  const cx = 210, cy = 175, r = 120;

  // Score → point on arc (180° = left endpoint, 0° = right endpoint)
  function pt(score: number): [number, number] {
    const frac = (score - 300) / 550;
    const a = Math.PI * (1 - frac);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  }

  // Arc path between two score values
  // sweep=1 → clockwise in SVG (y-down) = goes through the TOP half ✓
  function seg(s1: number, s2: number): string {
    const [x1, y1] = pt(s1);
    const [x2, y2] = pt(s2);
    const span = ((s2 - s1) / 550) * 180;
    const large = span > 180 ? 1 : 0;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }

  // Needle for score 785
  const needleFrac = (785 - 300) / 550;
  const needleAngle = Math.PI * (1 - needleFrac);
  const nx = cx + r * 0.82 * Math.cos(needleAngle);
  const ny = cy - r * 0.82 * Math.sin(needleAngle);

  // Tick marks at 300, 500, 650, 800, 850
  const ticks = [300, 500, 650, 800, 850];

  return (
    <svg viewBox="0 0 420 310" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>

      {/* Dark card background */}
      <rect width="420" height="310" rx="20" fill="#0F172A" />

      {/* Subtle glow behind gauge */}
      <ellipse cx={cx} cy={cy + 10} rx="145" ry="55" fill="#6D28D9" opacity="0.12" />

      {/* Track */}
      <path d={seg(300, 850)} stroke="#1E293B" strokeWidth="22" strokeLinecap="round" fill="none" />

      {/* Tier segments */}
      <path d={seg(300, 499)} stroke="#EF4444" strokeWidth="18" strokeLinecap="butt" fill="none" opacity="0.85" />
      <path d={seg(499, 649)} stroke="#F59E0B" strokeWidth="18" strokeLinecap="butt" fill="none" opacity="0.85" />
      <path d={seg(649, 799)} stroke="#22D3EE" strokeWidth="18" strokeLinecap="butt" fill="none" opacity="0.9" />
      <path d={seg(799, 850)} stroke="#A78BFA" strokeWidth="18" strokeLinecap="round" fill="none" />

      {/* Tick marks */}
      {ticks.map((score) => {
        const frac = (score - 300) / 550;
        const a = Math.PI * (1 - frac);
        const ox = cx + (r + 8) * Math.cos(a);
        const oy = cy - (r + 8) * Math.sin(a);
        const ix = cx + (r - 4) * Math.cos(a);
        const iy = cy - (r - 4) * Math.sin(a);
        return <line key={score} x1={ox.toFixed(1)} y1={oy.toFixed(1)} x2={ix.toFixed(1)} y2={iy.toFixed(1)} stroke="#334155" strokeWidth="2" />;
      })}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)}
        stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="9" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="3.5" fill="#818CF8" />

      {/* Score number */}
      <text x={cx} y={cy + 42} textAnchor="middle" fontSize="48" fontWeight="800"
        fill="white" fontFamily="system-ui, sans-serif">785</text>

      {/* Label */}
      <text x={cx} y={cy + 64} textAnchor="middle" fontSize="11" fill="#64748B"
        fontFamily="system-ui, sans-serif">Professional Fidelity Index</text>

      {/* Tier badge */}
      <rect x={cx - 62} y={cy + 74} width="124" height="26" rx="13" fill="#1E1B4B" />
      <text x={cx} y={cy + 91} textAnchor="middle" fontSize="11" fontWeight="700"
        fill="#A5B4FC" fontFamily="system-ui, sans-serif">✦ Proven Pro — 5% fee</text>

      {/* Score range labels */}
      <text x="78" y={cy + 16} fontSize="10" fill="#475569" fontFamily="system-ui, sans-serif">300</text>
      <text x="330" y={cy + 16} fontSize="10" fill="#475569" fontFamily="system-ui, sans-serif">850</text>

      {/* Delta indicator */}
      <rect x={cx + 66} y={cy + 74} width="42" height="26" rx="8" fill="#14532D" />
      <text x={cx + 87} y={cy + 91} textAnchor="middle" fontSize="11" fontWeight="700"
        fill="#4ADE80" fontFamily="system-ui, sans-serif">+25</text>

    </svg>
  );
}
