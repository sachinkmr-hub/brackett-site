import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useModal } from '../providers/ModalProvider';

const FEATURES = [
  'Private workspace for team questions and decisions',
  'Website/context import and manual company profile',
  'Boards, owners, source trails, activity, and exports',
  'Invite links with transparent email delivery state',
];

export const PricingSection: React.FC = () => {
  const { showAuthModal } = useModal();

  return (
    <section className="relative border-t border-[rgba(0,0,0,0.05)] bg-[#F8F7F4] py-24 text-[#111318]" id="pricing-section">
      <div className="mx-auto max-w-[1100px] px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <span className="mb-4 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
            Early access
          </span>
          <h2 className="font-syne text-4xl font-semibold tracking-tight text-zinc-950 sm:text-[48px] leading-[1.1]">
            Execution clarity, for free.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-[18px] leading-[1.75] text-zinc-600">
            Get an elite, fully guardrailed AI Product Manager during our exclusive early access window. Scale to paid plans only when you need multi-team SSO.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto grid max-w-4xl overflow-hidden rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-[#FFFFFF] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.04)] md:grid-cols-[1fr_0.85fr]"
          id="pricing-plans-grid"
        >
          <div className="p-8 sm:p-10">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-syne text-[22px] font-semibold tracking-tight text-zinc-950">Early Access Team</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-zinc-500">Full access to the AI Product Manager and Analytics suite.</p>
              </div>
              <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-700">
                Open now
              </span>
            </div>

            <div className="mb-8 flex items-end gap-2">
              <span className="font-syne text-6xl font-semibold tracking-tight text-zinc-950">$0</span>
              <span className="pb-2 text-[14px] font-medium text-zinc-500">for early adopters</span>
            </div>

            <ul className="space-y-4">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-[15px] leading-snug text-zinc-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <Check size={12} className="stroke-[3]" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => showAuthModal('signup')}
              className="premium-button mt-10 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-lg font-semibold text-white transition hover:animate-amber-shimmer"
              id="pricing-cta-primary"
            >
              Create workspace
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="border-t border-[rgba(0,0,0,0.05)] bg-[#F2F1EE] p-8 sm:p-10 md:border-l md:border-t-0 flex flex-col justify-center">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">For teams</p>
            <h4 className="mt-4 font-syne text-[22px] font-semibold text-zinc-950">Team Rollout</h4>
            <p className="mt-3 text-[15px] leading-[1.6] text-zinc-600">
              Need to scale across multiple teams? Get SSO, managed integrations, custom usage limits, audit exports, and priority support.
            </p>
            <button
              type="button"
              onClick={() => window.location.href = 'mailto:hello@brackett.app'}
              className="mt-8 rounded-xl border border-zinc-200 bg-white px-6 py-3.5 text-[15px] font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm w-full"
            >
              Contact for pricing
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
