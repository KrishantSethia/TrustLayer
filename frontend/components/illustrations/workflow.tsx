export default function WorkflowIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 440 465" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <style>{`
        @keyframes dash-flow {
          from { stroke-dashoffset: 20; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.1; }
        }
        .line-blue  { animation: dash-flow 1.2s linear infinite; }
        .line-green { animation: dash-flow 1.2s linear infinite 0.4s; }
        .line-amber { animation: dash-flow 1s  linear infinite 0.2s; }
        .line-purple{ animation: dash-flow 1s  linear infinite 0.6s; }
        .bob-left   { animation: bob 3.2s ease-in-out infinite;      transform-origin: 65px 350px; }
        .bob-right  { animation: bob 3.2s ease-in-out infinite 1.6s; transform-origin: 375px 350px; }
        .glow-ring  { animation: glow-pulse 2.6s ease-in-out infinite; }
      `}</style>

      {/* ─────────────────────────────────────────
          LINES  (drawn behind nodes)
      ───────────────────────────────────────── */}

      {/* Employer → AI  (requirements, blue curve) */}
      <path d="M 100 308 C 116 232 178 182 191 150"
        stroke="#93C5FD" strokeWidth="2.5" strokeDasharray="7,5" fill="none" className="line-blue" />
      <polygon points="184,152 191,137 199,151" fill="#93C5FD" />

      {/* Freelancer → AI  (work submitted, green curve) */}
      <path d="M 340 308 C 324 232 262 182 249 150"
        stroke="#86EFAC" strokeWidth="2.5" strokeDasharray="7,5" fill="none" className="line-green" />
      <polygon points="241,151 249,137 256,152" fill="#86EFAC" />

      {/* Employer → Escrow  (funds, amber straight) */}
      <line x1="113" y1="322" x2="172" y2="262"
        stroke="#FCD34D" strokeWidth="2" strokeDasharray="6,4" className="line-amber" />
      <polygon points="166,266 172,252 180,264" fill="#FCD34D" />

      {/* Escrow → Freelancer  (pays out, violet straight) */}
      <line x1="268" y1="262" x2="328" y2="322"
        stroke="#C4B5FD" strokeWidth="2" strokeDasharray="6,4" className="line-purple" />
      <polygon points="322,318 328,333 336,321" fill="#C4B5FD" />

      {/* ─────────────────────────────────────────
          LABEL PILLS
      ───────────────────────────────────────── */}

      {/* Requirements — left */}
      <rect x="18" y="212" width="104" height="20" rx="10" fill="#EFF6FF" />
      <text x="70" y="225" textAnchor="middle" fontSize="9" fontWeight="700"
        fill="#2563EB" fontFamily="system-ui, sans-serif">Requirements</text>

      {/* Submits Work — right */}
      <rect x="318" y="212" width="104" height="20" rx="10" fill="#F0FDF4" />
      <text x="370" y="225" textAnchor="middle" fontSize="9" fontWeight="700"
        fill="#16A34A" fontFamily="system-ui, sans-serif">Submits Work</text>

      {/* Funds — lower-left */}
      <rect x="84" y="282" width="50" height="18" rx="9" fill="#FEF3C7" />
      <text x="109" y="294" textAnchor="middle" fontSize="8.5" fontWeight="700"
        fill="#B45309" fontFamily="system-ui, sans-serif">Funds</text>

      {/* Pays out — lower-right */}
      <rect x="306" y="282" width="58" height="18" rx="9" fill="#F5F3FF" />
      <text x="335" y="294" textAnchor="middle" fontSize="8.5" fontWeight="700"
        fill="#7C3AED" fontFamily="system-ui, sans-serif">Pays out</text>

      {/* ─────────────────────────────────────────
          AI AGENT  (top-center)
      ───────────────────────────────────────── */}
      <circle cx="220" cy="100" r="68" fill="#7C3AED" className="glow-ring" />
      <circle cx="220" cy="100" r="58" fill="#3B0764" />
      <circle cx="220" cy="100" r="56" fill="#4C1D95" />
      <rect x="198" y="82" width="44" height="32" rx="9" fill="#6D28D9" />
      <circle cx="211" cy="96" r="5" fill="white" />
      <circle cx="229" cy="96" r="5" fill="white" />
      <circle cx="212" cy="97" r="2.5" fill="#3B0764" />
      <circle cx="230" cy="97" r="2.5" fill="#3B0764" />
      <rect x="210" y="107" width="20" height="3" rx="1.5" fill="white" opacity="0.45" />
      <rect x="219" y="66" width="2" height="16" rx="1" fill="#6D28D9" />
      <circle cx="220" cy="63" r="5" fill="#A78BFA" />

      <text x="220" y="178" textAnchor="middle" fontSize="12" fontWeight="800"
        fill="#7C3AED" fontFamily="system-ui, sans-serif">AI Agent</text>
      <text x="220" y="194" textAnchor="middle" fontSize="9.5" fill="#94A3B8"
        fontFamily="system-ui, sans-serif">Evaluates · Verifies · Releases</text>

      {/* ─────────────────────────────────────────
          ESCROW  (center)
      ───────────────────────────────────────── */}
      <rect x="174" y="234" width="92" height="52" rx="14" fill="#FFFBEB" stroke="#FDE68A" strokeWidth="1.5" />
      <rect x="208" y="250" width="24" height="18" rx="4" fill="#F59E0B" />
      <path d="M 211 250 Q 211 242 220 242 Q 229 242 229 250"
        stroke="#F59E0B" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="220" cy="257" r="3.5" fill="#FEF3C7" />
      <rect x="219" y="257" width="2" height="6" rx="1" fill="#FEF3C7" />
      <text x="220" y="298" textAnchor="middle" fontSize="10" fontWeight="700"
        fill="#92400E" fontFamily="system-ui, sans-serif">Escrow</text>

      {/* ─────────────────────────────────────────
          EMPLOYER  (bottom-left)
      ───────────────────────────────────────── */}
      <g className="bob-left">
        <circle cx="65" cy="350" r="52" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1.5" />
        <rect x="41" y="334" width="48" height="32" rx="3" fill="#BFDBFE" />
        <path d="M 35 338 L 65 316 L 95 338 Z" fill="#93C5FD" />
        <rect x="54" y="348" width="14" height="14" rx="2" fill="#2563EB" />
        {[43, 61, 79].map((x) => (
          <rect key={x} x={x} y="336" width="10" height="8" rx="1" fill="white" opacity="0.7" />
        ))}
        <text x="65" y="416" textAnchor="middle" fontSize="11" fontWeight="800"
          fill="#1E40AF" fontFamily="system-ui, sans-serif">Employer</text>
        <text x="65" y="430" textAnchor="middle" fontSize="9" fill="#60A5FA"
          fontFamily="system-ui, sans-serif">Posts &amp; Funds</text>
      </g>

      {/* ─────────────────────────────────────────
          FREELANCER  (bottom-right)
      ───────────────────────────────────────── */}
      <g className="bob-right">
        <circle cx="375" cy="350" r="52" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1.5" />
        <rect x="351" y="330" width="48" height="34" rx="5" fill="#BBF7D0" />
        <rect x="356" y="335" width="38" height="24" rx="3" fill="#DCFCE7" />
        <rect x="360" y="341" width="20" height="2.5" rx="1" fill="#16A34A" opacity="0.6" />
        <rect x="360" y="347" width="14" height="2.5" rx="1" fill="#16A34A" opacity="0.4" />
        <rect x="360" y="353" width="18" height="2.5" rx="1" fill="#16A34A" opacity="0.5" />
        <rect x="346" y="364" width="58" height="5" rx="2.5" fill="#86EFAC" />
        <text x="375" y="416" textAnchor="middle" fontSize="11" fontWeight="800"
          fill="#15803D" fontFamily="system-ui, sans-serif">Freelancer</text>
        <text x="375" y="430" textAnchor="middle" fontSize="9" fill="#4ADE80"
          fontFamily="system-ui, sans-serif">Works &amp; Submits</text>
      </g>

    </svg>
  );
}
