import React from 'react';
import { ArrowRight, CheckCircle2, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useModal } from '../providers/ModalProvider';

export const SocialProof: React.FC = () => {
  const { showAuthModal } = useModal();

  return (
    <section className="relative overflow-hidden bg-[#F8F7F4] py-16 text-[#111318]" id="social-section">
      <div className="mx-auto max-w-[1100px] px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 text-center"
        >
          {/* Company Text Logos */}
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 opacity-60 grayscale mix-blend-multiply">
            <div className="font-syne text-2xl font-extrabold tracking-tighter text-zinc-900">ACME CORP</div>
            <div className="font-serif text-3xl italic font-semibold text-zinc-900">Lumina</div>
            <div className="font-mono text-2xl font-bold tracking-widest text-zinc-900">VORTEX</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-4xl flex flex-col items-center text-center"
        >
          {/* Avatars with gradient rings + 5-star rating */}
          <div className="mb-8 flex flex-col items-center justify-center gap-5">
            <div className="flex -space-x-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 w-16 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-600 p-[2px] shadow-lg relative z-10 hover:z-20 transition-transform hover:scale-105">
                  <div className="h-full w-full rounded-full border-[3px] border-white bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=f1f5f9`} alt="Avatar" className="w-full h-full object-cover mix-blend-multiply" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map(star => <Star key={star} size={20} fill="currentColor" />)}
              </div>
              <p className="font-sans text-[15px] font-semibold text-zinc-800">Join 500+ founders in the early access program</p>
            </div>
          </div>

          {/* Quote */}
          <h3 className="font-syne text-xl md:text-[28px] italic font-semibold leading-[1.4] tracking-tight text-zinc-950 mb-6 max-w-4xl px-4">
            "The AI PM synthesized our messy Slack threads into a clear engineering scope on day one."
          </h3>
          <div className="mb-12">
            <p className="font-sans text-[16px] font-semibold text-zinc-900">Sarah Jenkins</p>
            <p className="font-sans text-[14px] text-zinc-500 mt-1">Co-founder, Acme Corp (Early Access Beta)</p>
          </div>
        </motion.div>

        <div className="flex flex-col gap-5 rounded-[24px] border border-[rgba(0,0,0,0.06)] bg-[#FFFFFF] p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between mx-auto max-w-4xl">
          <div className="flex items-start gap-4">
            <CheckCircle2 size={28} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
            <div>
              <p className="font-syne text-[22px] font-semibold text-zinc-950 tracking-tight">Early workspace access is open.</p>
              <p className="mt-1 text-[15px] text-zinc-500">Start private, import context, and invite teammates when the flow is ready.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => showAuthModal('signup')}
            className="premium-button flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-lg font-semibold text-white transition hover:animate-amber-shimmer"
          >
            Create workspace
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
