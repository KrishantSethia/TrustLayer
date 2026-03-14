"use client";
import { useEffect, useState } from "react";

interface Props {
  targetIso: string;
  onExpire?: () => void;
}

export default function CountdownTimer({ targetIso, onExpire }: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const ms = new Date(targetIso).getTime() - Date.now();
      setRemaining(Math.max(0, ms));
      if (ms <= 0) onExpire?.();
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  const totalSecs = Math.floor(remaining / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;

  const fmt = (n: number) => String(n).padStart(2, "0");

  return (
    <span className={`font-mono font-bold ${remaining < 60000 ? "text-red-400" : remaining < 300000 ? "text-yellow-400" : "text-green-400"}`}>
      {h > 0 ? `${fmt(h)}:${fmt(m)}:${fmt(s)}` : `${fmt(m)}:${fmt(s)}`}
    </span>
  );
}
