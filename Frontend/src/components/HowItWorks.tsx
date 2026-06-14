import React, { useRef } from 'react';
import { motion, useInView, animate, useScroll, useTransform } from 'motion/react';

const STEPS = [
  {
    stepNumber: 1,
    label: 'Analyze',
    verb: 'Connect',
    restOfTitle: ' live data and tools',
    description: 'Give the AI Analyst access to your raw metrics, feedback, and logs. It actively monitors signals to surface what actually matters.',
  },
  {
    stepNumber: 2,
    label: 'Synthesize',
    verb: 'Guardrail',
    restOfTitle: ' with custom frameworks',
    description: 'Personalized prompts and product frameworks turn raw data into elite Product Management scopes, roadmap decisions, and ownership assignments.',
  },
  {
    stepNumber: 3,
    label: 'Execute',
    verb: 'Drive',
    restOfTitle: ' outcomes in one workspace',
    description: 'Your team executes seamlessly on the AI-generated scopes inside a unified workspace. Context stays attached, and momentum never drops.',
  }
];

const AnimatedNumber = ({ target }: { target: number }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(nodeRef, { once: true });
  
  React.useEffect(() => {
    if (isInView && nodeRef.current) {
      animate(0, target, {
        duration: 0.8,
        ease: "easeOut",
        onUpdate: (latest) => {
          if (nodeRef.current) {
            nodeRef.current.textContent = `0${Math.floor(latest)}`;
          }
        }
      });
    }
  }, [isInView, target]);
  
  return <span ref={nodeRef} className="font-mono text-3xl font-semibold text-zinc-300">00</span>;
};

export const HowItWorks: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const lineWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section 
      className="relative border-b border-[rgba(0,0,0,0.05)] bg-[#F2F1EE] py-24 text-[#111318]" 
      id="how-it-works-section"
    >
      <div className="max-w-[1100px] mx-auto px-6 md:px-12">
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16 sm:mb-24"
        >
          <span className="mb-3 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            The methodology
          </span>
          <h2 className="font-syne text-4xl font-semibold tracking-tight text-zinc-950 sm:text-[48px]">
            How the AI PM works
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[18px] leading-[1.75] text-zinc-600">
            We don't just dump AI on a canvas. We guardrail it.
          </p>
        </motion.div>

        <div className="relative" ref={containerRef}>
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-[24px] left-[16%] right-[16%] h-[2px] bg-slate-200">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-amber-500 origin-left"
              style={{ width: lineWidth }}
            />
            {/* SVG Arrow at the end of the line */}
            <motion.svg 
              className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 text-amber-500" 
              viewBox="0 0 24 24" fill="none"
              style={{ opacity: useTransform(scrollYProgress, [0.8, 1], [0, 1]) }}
            >
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </motion.svg>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 items-stretch relative z-10" id="how-it-works-cards-grid">
            {STEPS.map((step, idx) => (
              <motion.div 
                key={step.stepNumber}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col relative"
              >
                {/* Number Circle overlaying the line */}
                <div className="mb-8 flex justify-center md:justify-start">
                  <div className="w-12 h-12 rounded-[16px] bg-[#FFFFFF] border-[2px] border-zinc-100 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.04)] z-10 relative">
                    <AnimatedNumber target={step.stepNumber} />
                  </div>
                </div>

                <div className="flex-1 rounded-[16px] bg-[#FFFFFF] border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-8 transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(245,158,11,0.12),0_4px_16px_rgba(0,0,0,0.04)]">
                  <span className="font-mono text-[11px] font-semibold tracking-[0.12em] uppercase opacity-65 mb-4 block">
                    {step.label}
                  </span>

                  <h3 className="font-syne text-[22px] font-semibold leading-[1.2] tracking-tight mb-4 text-zinc-950">
                    <span className="text-amber-600">{step.verb}</span>
                    {step.restOfTitle}
                  </h3>
                  
                  <p className="text-[15px] opacity-85 leading-[1.75] mt-auto text-zinc-600">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
