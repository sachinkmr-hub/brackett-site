import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { buildAppUrl } from '../lib/routing';
import { BrackettLogo } from '../components/BrackettLogo';
import { COLORS } from '../theme/tokens';

type OnboardingPath = 'existing' | 'new' | null;

export const OnboardingFlow: React.FC = () => {
  const [path, setPath] = useState<OnboardingPath>(null);
  const [url, setUrl] = useState('');
  const [idea, setIdea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate saving context for the AI backend
    setTimeout(() => {
      window.location.assign(buildAppUrl('/dashboard').toString());
    }, 800);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-main p-6 selection:bg-tile-accent selection:text-white editorial-bg">
      <div className="aura-flow-layer subtle" aria-hidden="true" />
      
      <div className="relative z-10 w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-panel rounded-2xl p-8 sm:p-12 shadow-xl"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <BrackettLogo size={36} color={COLORS.logo.dark} />
            <h1 className="mt-6 font-sans text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Welcome to brackett
            </h1>
            <p className="mt-3 text-zinc-500">
              Let's set up your operating workspace.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!path ? (
              <motion.div
                key="choice"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <button
                  onClick={() => setPath('existing')}
                  className="motion-rise w-full rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition-all hover:border-zinc-300"
                >
                  <h3 className="font-semibold text-zinc-950">I already have a live product</h3>
                  <p className="mt-1 text-sm text-zinc-500">Connect your website, revenue, and traffic signals.</p>
                </button>
                <button
                  onClick={() => setPath('new')}
                  className="motion-rise w-full rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition-all hover:border-zinc-300"
                >
                  <h3 className="font-semibold text-zinc-950">I'm just starting out</h3>
                  <p className="mt-1 text-sm text-zinc-500">Define your idea and set initial goals.</p>
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleFinish}
                className="space-y-6"
              >
                {path === 'existing' ? (
                  <div>
                    <label htmlFor="url" className="mb-2 block text-sm font-semibold text-zinc-950">Product URL</label>
                    <input
                      id="url"
                      type="url"
                      required
                      placeholder="https://yourproduct.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                    />
                    <p className="mt-2 text-xs text-zinc-500">We'll use this to start tracking traffic and signals.</p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="idea" className="mb-2 block text-sm font-semibold text-zinc-950">What are you building?</label>
                    <textarea
                      id="idea"
                      required
                      rows={3}
                      placeholder="A brief description of your product idea..."
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                    />
                    <p className="mt-2 text-xs text-zinc-500">This gives your AI context for future moves.</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setPath(null)}
                    disabled={isSubmitting}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-70"
                  >
                    {isSubmitting ? 'Configuring workspace...' : 'Complete setup'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
