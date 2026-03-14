"use client";
import dynamic from "next/dynamic";

// Dynamic import — Lottie requires browser APIs, can't SSR
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface LottiePlayerProps {
  src: object | null;
  className?: string;
  loop?: boolean;
}

export default function LottiePlayer({ src, className = "", loop = true }: LottiePlayerProps) {
  if (!src) {
    // Placeholder shown until the JSON file is added
    return (
      <div className={`${className} bg-slate-100 rounded-2xl flex items-center justify-center`}>
        <span className="text-xs text-slate-400">animation loading...</span>
      </div>
    );
  }
  return (
    <Lottie
      animationData={src}
      loop={loop}
      className={className}
    />
  );
}
