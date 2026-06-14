import React from 'react';
import { BrackettWordmark } from './BrackettLogo';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useModal } from '../providers/ModalProvider';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { showAuthModal } = useModal();

  return (
    <footer className="border-t border-[rgba(0,0,0,0.05)] bg-[#F8F7F4] px-6 py-16 text-[#111318] md:px-12">
      <div className="mx-auto max-w-[1100px]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 flex flex-col gap-8 rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-[#FFFFFF] p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-10"
          id="footer-cta-hub"
        >
          <div className="max-w-xl">
            <div className="mb-6 flex items-center gap-2">
              <BrackettWordmark markSize={26} />
            </div>
            <h2 className="font-syne text-[32px] font-semibold tracking-tight text-zinc-950 sm:text-[40px] leading-[1.1]">
              Start with one open decision.
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-zinc-600">
              Capture the source, owner, status, and answer in one calm workspace.
            </p>
          </div>

          <button
            onClick={() => showAuthModal('signup')}
            className="premium-button flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-lg font-semibold text-white transition hover:animate-amber-shimmer"
            id="footer-cta-action"
          >
            Start workspace
            <ArrowRight size={18} />
          </button>
        </motion.div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-zinc-200/60 pt-8 font-sans text-xs text-zinc-500 sm:flex-row" id="footer-copyright-links">
          <div className="flex gap-6">
            <a href="#privacy" className="transition-colors hover:text-zinc-950 hover:underline" id="footer-link-privacy">
              Privacy
            </a>
            <a href="#terms" className="transition-colors hover:text-zinc-950 hover:underline" id="footer-link-terms">
              Terms
            </a>
            <a href="#cookie-pref" className="transition-colors hover:text-zinc-950 hover:underline" id="footer-link-cookies">
              Cookies
            </a>
          </div>

          <div className="text-center sm:text-right" id="footer-credit">
            (c) {currentYear} brackett, Inc.
          </div>
        </div>
      </div>
    </footer>
  );
};
