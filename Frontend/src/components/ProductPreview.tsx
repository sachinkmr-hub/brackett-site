import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, FileText, Link2, Search, ShieldCheck, Sparkles, UserRoundCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrackettWordmark } from './BrackettLogo';

type DemoState = {
  step: number;
  ownerAssigned: boolean;
  decisionText: string;
  status: string;
};

export const ProductPreview: React.FC = () => {
  const [demoState, setDemoState] = useState<DemoState>({
    step: 0,
    ownerAssigned: false,
    decisionText: '',
    status: 'Needs decision'
  });

  // Automated sequence
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const runSequence = async () => {
      // Reset
      setDemoState({ step: 0, ownerAssigned: false, decisionText: '', status: 'Needs decision' });
      
      // Step 1: Assign owner
      timeoutId = setTimeout(() => {
        setDemoState(s => ({ ...s, step: 1, ownerAssigned: true }));
        
        // Step 2: Type decision
        timeoutId = setTimeout(() => {
          let text = '';
          const fullText = 'Launch moved by one week after security review found two unresolved API edge cases.';
          let charIndex = 0;
          
          const typeChar = () => {
            if (charIndex < fullText.length) {
              text += fullText[charIndex];
              setDemoState(s => ({ ...s, step: 2, decisionText: text }));
              charIndex++;
              timeoutId = setTimeout(typeChar, 30);
            } else {
              // Step 3: Resolve
              timeoutId = setTimeout(() => {
                setDemoState(s => ({ ...s, step: 3, status: 'Answered' }));
              }, 600);
            }
          };
          typeChar();
          
        }, 1200);
      }, 1500);
    };

    const intervalId = setInterval(runSequence, 10000);
    runSequence();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <section 
      className="relative overflow-hidden border-y border-[rgba(0,0,0,0.05)] bg-[#F2F1EE] py-16 text-[#111318] sm:py-32" 
      id="product-section"
    >
      <div className="relative mx-auto max-w-[1200px] px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 text-center"
        >
          <span className="mb-3 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">
            Product preview
          </span>
          <h2 className="mx-auto max-w-2xl font-syne text-4xl font-semibold tracking-tight text-zinc-950 sm:text-[48px] leading-[1.1]">
            Watch the AI PM execute.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[18px] leading-[1.75] text-zinc-600">
            brackett actively synthesizes messy team context into an actionable scope: assigning an owner, citing the source, and driving a final decision.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-[1060px]"
        >
          {/* Indigo Halo Glow */}
          <div className="absolute inset-0 z-0 bg-indigo-500/20 blur-[100px] rounded-[40px]" />
          
          <div 
            className="relative z-10 flex flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/60 shadow-[0_34px_110px_rgba(37,99,235,0.13),0_20px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
            id="brackett-app-mockup"
          >
            {/* Browser Chrome */}
            <div className="flex h-12 items-center border-b border-slate-200/80 bg-white/40 px-4">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400 border border-black/10" />
                <div className="h-3 w-3 rounded-full bg-amber-400 border border-black/10" />
                <div className="h-3 w-3 rounded-full bg-emerald-400 border border-black/10" />
              </div>
              <div className="mx-auto flex h-6 w-full max-w-xs items-center justify-center rounded-md border border-slate-200/60 bg-white/50 px-3 font-mono text-[10px] text-slate-400">
                app.brackett.io/workspace
              </div>
              <div className="w-14" /> {/* Spacer to balance dots */}
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/75 px-5 py-3">
              <div className="flex items-center gap-3">
                <BrackettWordmark markSize={18} textClassName="text-sm leading-tight" />
                <div>
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Acme Corp</p>
                </div>
              </div>
            </div>

            <div className="grid min-h-[540px] lg:grid-cols-[280px_1fr]">
              {/* Sidebar */}
              <aside className="border-b border-slate-200/80 bg-white/40 p-4 lg:border-b-0 lg:border-r">
                <p className="mb-4 font-mono text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Inbox</p>
                <div className="space-y-2">
                  <div className="w-full rounded-xl border border-indigo-200 bg-white p-3 shadow-sm relative">
                    {/* Tooltip */}
                    <div className="absolute -left-32 top-3 hidden xl:block">
                      <div className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-xl flex items-center gap-2">
                        <span>Active Thread</span>
                        <div className="absolute right-[-4px] top-1/2 -mt-1 h-2 w-2 rotate-45 bg-slate-900" />
                      </div>
                    </div>
                    
                    <span className="block text-[13px] font-semibold text-zinc-950">Why did the launch date move?</span>
                    <span className="mt-2 flex items-center gap-2 text-[11px] font-medium text-zinc-500">
                      <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${demoState.status === 'Answered' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {demoState.status}
                    </span>
                  </div>
                  <div className="w-full rounded-xl border border-slate-200/50 bg-white/40 p-3 opacity-60">
                    <span className="block text-[13px] font-semibold text-zinc-950">Which billing flow is final?</span>
                    <span className="mt-2 flex items-center gap-2 text-[11px] font-medium text-zinc-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Answered
                    </span>
                  </div>
                </div>
              </aside>

              {/* Main Content */}
              <main className="bg-white/60 p-6 sm:p-10 relative">
                <div className="mb-6">
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`rounded-md px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors duration-500 ${demoState.status === 'Answered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {demoState.status}
                    </span>
                  </div>
                  <h3 className="font-syne text-3xl font-semibold tracking-tight text-slate-950">Why did the launch date move?</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mb-8">
                  <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden xl:block">
                      <div className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-xl whitespace-nowrap">
                        Owner Assigned
                        <div className="absolute bottom-[-4px] left-1/2 -ml-1 h-2 w-2 rotate-45 bg-indigo-600" />
                      </div>
                    </div>
                    
                    <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase text-slate-500">
                      <UserRoundCheck size={14} /> Owner
                    </div>
                    <div className="flex items-center gap-3 min-h-[24px]">
                      {demoState.ownerAssigned ? (
                        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">M</div>
                          <span className="text-[14px] font-semibold text-zinc-950">Maya, Product</span>
                        </motion.div>
                      ) : (
                        <span className="text-[13px] italic text-slate-400">Unassigned</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                    <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase text-slate-500">
                      <Link2 size={14} /> Source
                    </div>
                    <p className="text-[14px] font-semibold text-zinc-950 flex items-center gap-2">
                      <span className="text-blue-600 underline decoration-blue-200 underline-offset-2">Slack thread</span> + <span className="text-blue-600 underline decoration-blue-200 underline-offset-2">launch doc</span>
                    </p>
                  </div>
                </div>

                <div className={`relative rounded-2xl border p-6 transition-colors duration-500 ${demoState.status === 'Answered' ? 'border-emerald-200 bg-emerald-50/50 shadow-[0_18px_50px_rgba(16,185,129,0.06)]' : 'border-slate-200/80 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.04)]'}`}>
                  {/* Tooltip */}
                  {demoState.status === 'Answered' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute -right-32 top-1/2 -translate-y-1/2 hidden xl:block">
                      <div className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-xl flex items-center gap-2 whitespace-nowrap">
                        <div className="absolute left-[-4px] top-1/2 -mt-1 h-2 w-2 rotate-45 bg-emerald-600" />
                        Resolution Captured
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase text-slate-500">
                      <FileText size={15} /> Declared decision
                    </div>
                    {demoState.status === 'Answered' && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={14} />
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="min-h-[48px]">
                    {demoState.decisionText ? (
                      <p className="text-[16px] leading-[1.6] text-zinc-800">{demoState.decisionText}<span className="animate-pulse inline-block w-1.5 h-4 bg-slate-400 ml-1 align-middle" style={{ display: demoState.status === 'Answered' ? 'none' : 'inline-block' }} /></p>
                    ) : (
                      <p className="text-[16px] leading-[1.6] text-slate-400 italic">Waiting for owner to provide a decision...</p>
                    )}
                  </div>
                </div>
                
              </main>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
