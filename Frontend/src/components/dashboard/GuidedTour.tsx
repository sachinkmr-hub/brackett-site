import React, { useEffect, useState } from 'react';
import { Joyride, Step, STATUS, TooltipRenderProps } from 'react-joyride';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { TabKey } from './types';
import { COLORS } from '../../theme/tokens';

const markTourSeen = () => {
  localStorage.setItem('brackett_tour_v3_seen', 'true');
};

const FluidBeacon = (props: any) => (
  <button
    {...props}
    style={{ boxShadow: '0 16px 44px rgba(36, 84, 214, 0.22)' }}
    className="relative h-9 w-9 rounded-full border border-blue-200 bg-white/80 backdrop-blur-xl"
    type="button"
  >
    <span className="absolute inset-1 rounded-full bg-blue-500/10" />
    <span className="absolute inset-2 animate-ping rounded-full bg-blue-500/35" />
    <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600" style={{ boxShadow: '0 0 20px rgba(36, 84, 214, 0.7)' }} />
  </button>
);

const FluidTooltip = ({
  backProps,
  closeProps,
  continuous,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) => {
  const progress = Math.max(8, ((index + 1) / size) * 100);

  return (
    <motion.div
      {...tooltipProps}
      initial={{ opacity: 0, y: 10, scale: 0.97, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      style={{ boxShadow: '0 34px 110px rgba(15, 23, 42, 0.18), 0 18px 70px rgba(36, 84, 214, 0.12)' }}
      className="relative w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-[22px] border border-white/70 bg-white/86 p-5 text-left backdrop-blur-2xl"
    >
      <div 
        style={{ background: `linear-gradient(110deg, transparent, rgba(36, 84, 214, 0.18), rgba(14, 155, 168, 0.16), transparent)` }}
        className="absolute -right-16 -top-20 h-40 w-64 rotate-[-10deg] blur-2xl" 
        aria-hidden="true" 
      />
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="premium-label text-[10px] font-semibold text-blue-700">Guided workspace</p>
            <p className="mt-1 text-xs font-medium text-slate-400">{index + 1} of {size}</p>
          </div>
          <button
            {...closeProps}
            onClick={(event) => {
              markTourSeen();
              closeProps.onClick?.(event);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition hover:text-slate-950"
            type="button"
            aria-label="Close guided tour"
          >
            <X size={14} />
          </button>
        </div>

        <div className="text-[15px] leading-7 text-slate-700 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-[700] [&_h3]:tracking-[-0.025em] [&_h3]:text-slate-950 [&_p]:mt-1 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-slate-600">
          {step.content}
        </div>

        <div className="mt-5 h-1 overflow-hidden rounded-full bg-slate-200/80">
          <div
            className="h-full origin-left rounded-full transition-all duration-500"
            style={{ 
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${COLORS.brand.blue}, ${COLORS.brand.cyan})`,
              boxShadow: `0 0 18px rgba(36, 84, 214, 0.45)`
            }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {!isLastStep ? (
            <button
              {...skipProps}
              onClick={(event) => {
                markTourSeen();
                skipProps.onClick?.(event);
              }}
              className="text-sm font-semibold text-slate-400 transition hover:text-slate-700"
              type="button"
            >
              Skip
            </button>
          ) : <span />}

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button {...backProps} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" type="button">
                Back
              </button>
            )}
            <button
              {...primaryProps}
              onClick={(event) => {
                if (isLastStep) markTourSeen();
                primaryProps.onClick?.(event);
              }}
              style={{ 
                background: `linear-gradient(135deg, ${COLORS.brand.violet}, ${COLORS.brand.cyan})`,
                boxShadow: `0 14px 34px rgba(36, 84, 214, 0.24)`
              }}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
              type="button"
            >
              {isLastStep ? 'Finish' : continuous ? 'Next' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const GuidedTour: React.FC<{
  activeTab: string;
  needsOnboarding: boolean;
  onSelectTab: (tab: TabKey) => void;
}> = ({ activeTab, needsOnboarding, onSelectTab }) => {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('brackett_tour_v3_seen');
    if (!hasSeenTour && activeTab === 'overview') {
      const timer = setTimeout(() => setRun(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h3>Welcome to brackett</h3>
          <p>Start with one useful move. The workspace will teach itself as you go.</p>
        </div>
      ),
      placement: 'center',
    },
    {
      target: '[data-tour="suggested-actions"]',
      content: needsOnboarding
        ? 'Import your site first. brackett turns it into context before asking you to configure anything.'
        : 'Your next move floats to the top, so this never feels like an empty dashboard.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="health"]',
      content: 'This is the pulse: context coverage, open work, team load, and changes since you left.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="revenue-pulse"]',
      content: 'Coverage shows whether brackett has enough source signal to answer with confidence.',
      placement: 'right',
    },
    {
      target: '[data-tour="workspace-nav"]',
      content: (
        <div>
          <h3>Move by context</h3>
          <p>Setup, discussions, analyst, integrations, and team settings stay one glide away.</p>
        </div>
      ),
      placement: 'right',
    }
  ];

  const handleJoyrideCallback = (data: any) => {
    const { action, status, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (type === 'step:after' && needsOnboarding && index === 1) {
      onSelectTab('overview');
    }

    if (finishedStatuses.includes(status) || action === 'close' || action === 'skip') {
      if (typeof pendo !== 'undefined') {
        if (status === STATUS.FINISHED) {
          pendo.track('guided_tour_completed', {
            steps_completed: steps.length,
            total_steps: steps.length,
          });
        } else {
          pendo.track('guided_tour_skipped', {
            step_at_skip: index + 1,
            total_steps: steps.length,
            skip_method: action === 'close' ? 'close' : 'skip',
          });
        }
      }
      setRun(false);
      markTourSeen();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      beaconComponent={FluidBeacon}
      tooltipComponent={FluidTooltip}
      onEvent={handleJoyrideCallback}
      styles={{
        options: {
          overlayColor: 'rgba(2, 6, 23, 0.34)',
          spotlightShadow: '0 0 0 1px rgba(36, 84, 214, 0.22), 0 0 64px rgba(36, 84, 214, 0.18)',
          zIndex: 2000,
        },
        spotlight: {
          borderRadius: 24,
        },
      } as any}
    />
  );
};
