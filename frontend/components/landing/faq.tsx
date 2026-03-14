"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeUp } from "./fade-up";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "What if the AI evaluation is wrong?",
    a: "You have a 24-hour review window after every AI approval. If you believe the AI missed something important, you can file a Veto with a small arbitration fee. A human admin reviews the full submission, the AI evaluation log, and the success criteria. If the AI was wrong, your fee is refunded.",
  },
  {
    q: "How is the escrow held?",
    a: "All funds are processed through a licensed payment gateway regulated by the RBI. Your money is held securely until each milestone's conditions are verified, then transferred directly to the freelancer's account.",
  },
  {
    q: "What are the platform fees?",
    a: "Employers pay no platform fee — you pay only what you fund. Freelancers pay a fee deducted from their payout, based on their PFI score: 15% (new/high-risk), 10% (standard), 5% (proven pro), 0% (god-tier). Build your score by delivering quality work on time.",
  },
  {
    q: "What if a freelancer abandons my project?",
    a: "Ghost Protocol automatically triggers 72 hours after a missed deadline with no submission and no extension request filed. Your remaining escrow is fully refunded. The remaining milestones are re-listed on the marketplace for other freelancers to pick up.",
  },
  {
    q: "Can the deadline be extended?",
    a: "Yes. Freelancers can request a deadline extension with a reason and proposed new date. The employer can approve or deny. If approved, the payment decay timer resets and Ghost Protocol won't fire. If denied, the original deadline stands.",
  },
  {
    q: "What kind of projects does TrustLayer support?",
    a: "Currently TrustLayer focuses on writing projects — blog posts, technical documentation, copywriting, and similar content deliverables. AI evaluation is optimised for text-based work. More categories are planned.",
  },
];

function FAQItem({
  q, a, open, onToggle,
}: {
  q: string; a: string; open: boolean; onToggle: () => void;
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-900 pr-4">{q}</span>
        <span className="flex-shrink-0 text-slate-400">
          {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="px-6 pb-5 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-slate-50 border-y border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <FadeUp>
          <div className="text-center mb-14">
            <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-3">FAQ</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">Common questions</h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              Everything you need to know before you start.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((f, i) => (
              <FAQItem
                key={f.q}
                q={f.q}
                a={f.a}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
