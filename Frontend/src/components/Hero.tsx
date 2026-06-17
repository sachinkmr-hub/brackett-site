import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useModal } from '../providers/ModalProvider';
import { ArrowRight, Activity, CheckCircle2, LayoutGrid } from 'lucide-react';

const MOCK_CARDS = [
  {
    id: 1,
    type: 'Active Decision',
    time: '2h ago',
    title: 'Should we migrate the auth flow to Clerk?',
    desc: 'We\'re hitting edge cases with local cookie sessions on cross-origin setups. Need a call on whether to adopt Clerk now or patch our custom JWT flow.',
    status: 'indigo'
  },
  {
    id: 2,
    type: 'Active Decision',
    time: '4h ago',
    title: 'Finalize Q3 roadmap themes',
    desc: 'Engineering needs final confirmation on whether we are prioritizing the mobile app or the advanced analytics dashboard this quarter.',
    status: 'amber'
  },
  {
    id: 3,
    type: 'Active Decision',
    time: '1d ago',
    title: 'Server Provisioning for EU region',
    desc: 'Data compliance requires us to spin up an EU cluster. Need to decide between AWS Frankfurt or waiting for the new Paris region.',
    status: 'emerald'
  }
];

export const Hero: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % MOCK_CARDS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isHovered]);
  const { showAuthModal } = useModal();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#F8F7F4] pt-32 pb-24 lg:pt-40 lg:pb-32 min-h-[90vh] flex items-center">
      {/* Abstract light grid background */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
        
        {/* Left: Text Content */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-start w-full max-w-xl lg:pr-8"
        >
          {/* Eyebrow */}
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-indigo-600 font-semibold">
              Brackett
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1 
            variants={itemVariants} 
            className="font-syne font-bold text-[clamp(40px,5vw,64px)] leading-[1.05] tracking-tight text-[#111318]"
          >
            Run your company after launch, not your tabs.
          </motion.h1>

          {/* Subcopy */}
          <motion.p 
            variants={itemVariants} 
            className="mt-6 text-lg font-sans leading-relaxed text-[#4B5563]"
          >
            Not just another tab manager. We guardrail elite AI with personalized frameworks to act as your dedicated Product Manager. Synthesize scattered context into clear, actionable scopes.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 mt-10 w-full sm:w-auto">
            <button id="hero-cta-primary"
              onClick={() => showAuthModal('signup')} 
              className="w-full sm:w-auto px-8 py-4 bg-[#111318] text-white rounded-lg font-medium shadow-sm hover:bg-black transition-all active:scale-[0.98]"
            >
              Request access
            </button>
            <button id="hero-cta-secondary"
              onClick={() => {
                const el = document.getElementById('how-it-works-section') || document.getElementById('purpose-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }} 
              className="group w-full sm:w-auto px-8 py-4 bg-white text-[#111318] border border-zinc-200 rounded-lg font-medium hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
            >
              See how it works
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </motion.div>

          {/* novus.ai badge */}
          <motion.div variants={itemVariants} className="mt-8 flex items-center gap-2 text-sm text-zinc-500 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200 shadow-sm">
              <span className="text-[10px]">✨</span>
            </div>
            Proudly participating in the <span className="font-semibold text-zinc-900">novus.ai</span> competition
          </motion.div>
        </motion.div>

        {/* Right: Product Mockup */}
        <motion.div 
          initial={{ opacity: 0, x: 30, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-full min-h-[400px] lg:min-h-[500px]"
        >
          {/* Radiance Glow */}
          <div className="absolute -inset-4 md:-inset-10 z-0 bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-amber-500/10 blur-[60px] md:blur-[80px] rounded-[100px] pointer-events-none" />

          {/* Rotating Stack of Full Windows */}
          <div 
            className="absolute inset-0 z-10"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {MOCK_CARDS.map((card, idx) => {
              const pos = (idx - activeIndex + MOCK_CARDS.length) % MOCK_CARDS.length;
              
              // Only show up to 3 cards in the stack
              if (pos > 2) return null;

              return (
                <motion.div
                  key={card.id}
                  animate={{
                    y: pos === 0 ? 0 : pos === 1 ? -20 : -40,
                    x: pos === 0 ? 0 : pos === 1 ? 30 : -30,
                    rotate: pos === 0 ? 0 : pos === 1 ? 4 : -4,
                    scale: pos === 0 ? 1 : pos === 1 ? 0.95 : 0.9,
                    opacity: pos === 0 ? 1 : pos === 1 ? 0.7 : 0.4,
                    zIndex: 30 - pos,
                  }}
                  transition={{
                    duration: 0.7,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="absolute inset-0 rounded-2xl bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-zinc-200/60 overflow-hidden flex flex-col h-full origin-bottom"
                >
                  {/* Window Header */}
                  <div className="h-12 border-b border-zinc-100 flex items-center px-4 gap-2 bg-zinc-50/50">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                    </div>
                    <div className="mx-auto px-4 py-1.5 bg-white rounded-md text-xs text-zinc-400 border border-zinc-100 shadow-sm font-mono flex items-center gap-2">
                      <LayoutGrid className="w-3 h-3" />
                      brackett.app/workspace
                    </div>
                  </div>

                  {/* Mockup Interface Moment */}
                  <div className="flex-1 bg-white p-8 flex flex-col gap-6 overflow-hidden">
                    <div className="flex justify-between items-end border-b border-zinc-100 pb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-zinc-900 font-syne">Current Priorities</h3>
                        <p className="text-sm text-zinc-500 mt-1">What needs our attention this week.</p>
                      </div>
                      <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium border border-indigo-100">
                        3 Open Items
                      </div>
                    </div>

                    <div className="relative flex-1 min-h-[220px]">
                      {/* Active Item Card inside the Window */}
                      <div className="absolute top-0 left-0 right-0 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden group">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${card.status}-500 rounded-l-xl`}></div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <Activity className={`w-4 h-4 text-${card.status}-600`} />
                            <span className={`text-xs font-medium text-${card.status}-600`}>{card.type}</span>
                          </div>
                          <span className="text-xs text-zinc-400">{card.time}</span>
                        </div>
                        <h4 className="font-semibold text-zinc-900 text-lg">{card.title}</h4>
                        <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
                          {card.desc}
                        </p>
                        
                        <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between">
                          <div className="flex -space-x-2">
                            <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-white flex items-center justify-center text-[10px] text-white font-medium">JD</div>
                            <div className={`w-7 h-7 rounded-full bg-${card.status}-600 border-2 border-white flex items-center justify-center text-[10px] text-white font-medium`}>SM</div>
                          </div>
                          <div className={`text-xs font-medium text-${card.status}-700 bg-${card.status}-50 px-3 py-1.5 rounded-md shadow-sm border border-${card.status}-100 cursor-pointer hover:bg-${card.status}-100 transition-colors`}>
                            Review thread
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
          
          {/* Decorative shadow element */}
          <div className="absolute -inset-x-4 -bottom-4 h-24 bg-gradient-to-t from-[#F8F7F4] to-transparent z-10 pointer-events-none" />
        </motion.div>

      </div>
    </section>
  );
};
