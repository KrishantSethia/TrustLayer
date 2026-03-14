export default function TrustGapIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 380" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <style>{`
        @keyframes float-a {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.8; }
          50%       { transform: translateY(-9px) rotate(6deg); opacity: 1; }
        }
        @keyframes float-b {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
          50%       { transform: translateY(-13px) rotate(-8deg); opacity: 0.9; }
        }
        @keyframes float-c {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
          50%       { transform: translateY(-7px) rotate(10deg); opacity: 0.8; }
        }
        @keyframes float-d {
          0%, 100% { transform: translateY(0px); opacity: 0.3; }
          50%       { transform: translateY(-5px); opacity: 0.6; }
        }
        @keyframes x-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
        .qm-a { animation: float-a 2.8s ease-in-out infinite; transform-origin: 226px 118px; }
        .qm-b { animation: float-b 3.4s ease-in-out infinite 0.7s; transform-origin: 308px 112px; }
        .qm-c { animation: float-c 2.6s ease-in-out infinite 1.3s; transform-origin: 232px 262px; }
        .qm-d { animation: float-d 3.1s ease-in-out infinite 0.4s; transform-origin: 316px 252px; }
        .x-cross { animation: x-pulse 2.2s ease-in-out infinite; }
      `}</style>

      {/* ── Employer card (left) ── */}
      <rect x="12" y="44" width="192" height="292" rx="20" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1.5" />

      {/* Building */}
      <rect x="66" y="78" width="76" height="96" rx="4" fill="#BFDBFE" />
      {/* Roof triangle */}
      <path d="M 58 82 L 104 56 L 150 82 Z" fill="#93C5FD" />
      {/* Door */}
      <rect x="90" y="148" width="28" height="26" rx="3" fill="#2563EB" />
      {/* Windows */}
      {[68, 98, 128].map((x) => [88, 118].map((y) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="18" height="16" rx="2" fill="white" opacity="0.8" />
      )))}

      {/* Dollar badge */}
      <circle cx="108" cy="232" r="32" fill="#2563EB" />
      <text x="108" y="243" textAnchor="middle" fontSize="28" fontWeight="800" fill="white" fontFamily="system-ui, sans-serif">$</text>

      {/* Label */}
      <text x="108" y="298" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1E40AF" fontFamily="system-ui, sans-serif">Employer</text>
      <text x="108" y="316" textAnchor="middle" fontSize="11" fill="#60A5FA" fontFamily="system-ui, sans-serif">Ready to pay</text>

      {/* ── Freelancer card (right) ── */}
      <rect x="356" y="44" width="192" height="292" rx="20" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1.5" />

      {/* Laptop screen */}
      <rect x="382" y="82" width="140" height="90" rx="7" fill="#BBF7D0" />
      <rect x="390" y="89" width="124" height="76" rx="4" fill="#DCFCE7" />
      {/* Screen lines */}
      {[100, 110, 120, 130, 140].map((y, i) => (
        <rect key={y} x="400" y={y} width={[68, 52, 74, 40, 58][i]} height="3" rx="1.5" fill="#16A34A" opacity={[0.6, 0.4, 0.6, 0.3, 0.5][i]} />
      ))}
      {/* Keyboard */}
      <rect x="370" y="172" width="164" height="10" rx="3" fill="#86EFAC" />

      {/* Check badge */}
      <circle cx="452" cy="232" r="32" fill="#16A34A" />
      <path d="M 438 232 L 448 244 L 468 218" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

      {/* Label */}
      <text x="452" y="298" textAnchor="middle" fontSize="13" fontWeight="700" fill="#15803D" fontFamily="system-ui, sans-serif">Freelancer</text>
      <text x="452" y="316" textAnchor="middle" fontSize="11" fill="#4ADE80" fontFamily="system-ui, sans-serif">Work delivered</text>

      {/* ── Broken center zone ── */}
      {/* Dashed lines */}
      <line x1="206" y1="190" x2="240" y2="190" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="6,4" />
      <line x1="320" y1="190" x2="354" y2="190" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="6,4" />

      {/* X circle */}
      <circle cx="280" cy="190" r="52" fill="#FEF2F2" stroke="#FECACA" strokeWidth="2" />
      <g className="x-cross">
        <path d="M 260 170 L 300 210" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
        <path d="M 300 170 L 260 210" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* Floating question marks — each animates independently */}
      <text className="qm-a" x="226" y="128" fontSize="22" fontWeight="800" fill="#FCA5A5" fontFamily="system-ui, sans-serif">?</text>
      <text className="qm-b" x="308" y="120" fontSize="16" fontWeight="800" fill="#FCA5A5" fontFamily="system-ui, sans-serif">?</text>
      <text className="qm-c" x="232" y="268" fontSize="15" fontWeight="800" fill="#FCA5A5" fontFamily="system-ui, sans-serif">?</text>
      <text className="qm-d" x="316" y="258" fontSize="12" fontWeight="800" fill="#FCA5A5" fontFamily="system-ui, sans-serif">?</text>

      {/* Bottom label */}
      <text x="280" y="368" textAnchor="middle" fontSize="11" fill="#94A3B8" fontFamily="system-ui, sans-serif">No objective verification exists</text>

      {/* Decorative dots */}
      <circle cx="36" cy="24" r="6" fill="#BFDBFE" opacity="0.7" />
      <circle cx="56" cy="16" r="4" fill="#BFDBFE" opacity="0.4" />
      <circle cx="504" cy="24" r="6" fill="#BBF7D0" opacity="0.7" />
      <circle cx="524" cy="16" r="4" fill="#BBF7D0" opacity="0.4" />
    </svg>
  );
}
