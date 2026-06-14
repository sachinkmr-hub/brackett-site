import React from 'react';
import { AlertCircle, Slack, CreditCard, FileText, Database } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';

const MESSAGES = [
  { sender: 'Sarah', time: '10:42 AM', text: 'Is this spec final or still a draft?', avatar: 'bg-emerald-500' },
  { sender: 'Alex', time: '11:15 AM', text: 'Who approved the pricing change?', avatar: 'bg-blue-500' },
  { sender: 'David', time: '1:05 PM', text: 'Does support know this launch moved?', avatar: 'bg-amber-500' },
];

const CONTEXT_GAPS = [
  'Decisions are made without data because querying it takes too long.',
  'Action items drift when no dedicated PM is there to enforce ownership.',
  'Docs explain the final state, but lose the analytical reasoning behind it.',
  'Your team spends more time managing tools than executing scopes.',
  'New teammates inherit outcomes, but miss the strategic context.',
];

export const ProblemSection: React.FC = () => {
  return (
    <section
      className="relative overflow-hidden bg-[#0A0E1A] py-24 text-white"
      id="purpose-section"
    >
      {/* Noise / Grid texture */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-screen pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="mx-auto max-w-[1100px] px-6 md:px-12 relative z-10">
        
        <div className="text-center mb-20">
          <span className="mb-3 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-400">
            The problem
          </span>
          <h2 className="mx-auto max-w-3xl font-syne text-4xl font-semibold leading-[1.1] tracking-tight sm:text-[48px] relative inline-block">
            You don't just need fewer tabs. You need a Product Manager to connect them.
            <motion.svg className="absolute -bottom-4 left-0 w-full h-4 text-red-500" viewBox="0 0 400 20" preserveAspectRatio="none" initial={{ strokeDasharray: 400, strokeDashoffset: 400 }} whileInView={{ strokeDashoffset: 0 }} transition={{ duration: 1, ease: "easeOut", delay: 0.2 }} viewport={{ once: true }}>
              <path d="M0 10 Q 100 20 200 10 T 400 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
            </motion.svg>
          </h2>
        </div>

        {/* Before / After Split */}
        <div className="grid lg:grid-cols-2 gap-8 mb-24 items-center">
          
          {/* Chaos (Left) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative h-[400px] rounded-2xl border border-white/10 bg-white/5 p-8 overflow-hidden"
          >
            <div className="absolute top-4 left-4 font-mono text-[10px] uppercase tracking-wider text-white/40">Before</div>
            
            {/* Tool nodes scattered */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[8%] left-[8%] flex items-center justify-center w-12 h-12 rounded-xl bg-[#4A154B] shadow-lg"><Slack size={24} color="white" /></motion.div>
              <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute bottom-[8%] right-[8%] flex items-center justify-center w-12 h-12 rounded-xl bg-[#635BFF] shadow-lg"><CreditCard size={24} color="white" /></motion.div>
              <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute top-[12%] right-[10%] flex items-center justify-center w-12 h-12 rounded-xl bg-[#0052CC] shadow-lg"><FileText size={24} color="white" /></motion.div>
              <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute bottom-[12%] left-[10%] flex items-center justify-center w-12 h-12 rounded-xl bg-[#000000] border border-white/20 shadow-lg"><Database size={24} color="white" /></motion.div>
              
              {/* Question Threads floating around */}
              <div className="absolute inset-0 opacity-80 pointer-events-none">
                 {MESSAGES.map((msg, i) => (
                   <motion.div
                     key={i}
                     initial={{ opacity: 0, scale: 0.9 }}
                     whileInView={{ opacity: 1, scale: 1 }}
                     viewport={{ once: true }}
                     transition={{ duration: 0.5, delay: i * 0.4 }}
                     className="absolute bg-white/10 backdrop-blur-md border border-white/10 rounded-lg p-3 w-[200px] sm:w-[220px] shadow-xl"
                     style={{
                       top: `${25 + i * 25}%`,
                       left: i % 2 === 0 ? '5%' : 'auto',
                       right: i % 2 !== 0 ? '5%' : 'auto',
                     }}
                   >
                     <div className="flex items-center gap-2 mb-1">
                       <div className={`w-4 h-4 rounded-full ${msg.avatar}`} />
                       <span className="text-[10px] font-bold text-white/80">{msg.sender}</span>
                       <span className="text-[9px] text-white/40 ml-auto">{msg.time}</span>
                     </div>
                     <p className="text-[11px] text-white/90 leading-snug">{msg.text}</p>
                   </motion.div>
                 ))}
              </div>
            </div>
          </motion.div>

          {/* Unified (Right) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-[400px] rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-8 overflow-hidden shadow-[0_0_40px_rgba(99,102,241,0.1)]"
          >
            <div className="absolute top-4 left-4 font-mono text-[10px] tracking-wider text-indigo-400">
              <span className="uppercase">With </span><span className="lowercase">brackett</span>
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
              <div className="w-full max-w-sm sm:max-w-md rounded-2xl border border-white/10 bg-[#0A0E1A]/80 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden group hover:border-indigo-500/50 transition-colors duration-500">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-indigo-500 to-amber-500 opacity-70"></div>
                
                <div className="flex items-center gap-2 mb-5 border-b border-white/5 pb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="font-mono text-[11px] text-emerald-400 font-bold tracking-widest">AI SYNTHESIS</span>
                </div>
                <div className="space-y-5">
                  <div>
                    <h5 className="text-[16px] font-semibold text-white mb-2 tracking-tight">Launch Date & Pricing Spec</h5>
                    <p className="text-[13px] text-indigo-100/60 leading-relaxed">
                      Launch moved to Thursday. Spec is final. Support has been notified of the delay and the approved pricing tiers.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">S</div>
                      <span className="text-[11px] font-medium text-white/60">Owner: Sarah</span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[11px] font-semibold">
                      Aligned
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 5 Bullets as animated cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 flex flex-col justify-center">
            <h4 className="mb-4 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-400">
              <AlertCircle size={14} className="text-red-400" />
              Why standard spaces fail
            </h4>
          </div>
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
            {CONTEXT_GAPS.map((bullet, idx) => (
              <motion.div
                key={bullet}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: idx * 0.2 }}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-5 shadow-lg backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400 font-mono text-[10px]">{idx + 1}</span>
                  <span className="text-[14px] leading-relaxed text-white/80">{bullet}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
