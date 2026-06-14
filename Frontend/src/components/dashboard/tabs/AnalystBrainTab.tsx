import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Link2,
  Loader2,
  MessageSquare,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useDashboard } from '../DashboardContext';
import { PrivateAnalystResponse } from '../types';

const isLiveIntegration = (status: string) => ['ready', 'connected'].includes(status);
const isOpenStatus = (status: string) => !['answered', 'archived', 'closed', 'done'].includes(status);
const easeOut = [0.16, 1, 0.3, 1] as const;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: easeOut } },
};

export const AnalystBrainTab: React.FC = () => {
  const { integrations, questions, askPrivateAnalyst } = useDashboard();
  const [query, setQuery] = useState('What should we review before the next decision meeting?');
  const [response, setResponse] = useState<PrivateAnalystResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const liveIntegrations = integrations.filter((integration) => isLiveIntegration(integration.status));
  const hasLiveContext = liveIntegrations.length > 0;
  const activeQuestions = questions.filter((q) => isOpenStatus(q.status));
  const sourceGaps = activeQuestions.filter((question) => !question.sourceUrl && !question.sourceLabel && !question.sourceExcerpt && !question.board);

  const samplePrompts = useMemo(() => [
    'What is most likely to block the team this week?',
    'Which open decisions need a source before we trust them?',
    'Summarize the highest-priority unresolved questions.',
  ], []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    const payload = await askPrivateAnalyst(trimmed);
    if (payload) {
      setResponse(payload);
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div
      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
      initial="hidden"
      animate="show"
      className="grid gap-5 pb-16 xl:grid-cols-[1.1fr_0.9fr]"
    >
      <motion.section variants={itemVariants} className="quiet-surface flex min-h-[620px] flex-col overflow-hidden rounded-2xl">
        <div className="border-b border-slate-200/80 bg-white/72 px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                <BrainCircuit size={20} />
              </div>
              <div>
                <p className="premium-label text-[10px] font-medium text-blue-700">Private analyst</p>
                <h2 className="text-lg font-[650] text-slate-950">Source-aware workspace brief</h2>
              </div>
            </div>
            <span className={`self-start rounded-full border px-3 py-1.5 text-xs font-semibold sm:self-auto ${
              hasLiveContext ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'
            }`}>
              {hasLiveContext ? `${liveIntegrations.length} live source${liveIntegrations.length === 1 ? '' : 's'}` : 'Needs live source'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!response ? (
            <div className="flex h-full min-h-[360px] items-center justify-center">
              <div className="max-w-2xl text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-2xl font-[700] leading-tight text-slate-950">
                  Ask for the shape of the workspace, not a guessed answer.
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                  The MVP analyst reads brackett records and tells you what is open, sourced, stale, or risky. It stays honest when live source context is missing.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {samplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setQuery(prompt)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:text-slate-950"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white/78 p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                    {response.confidence === 'workspace_grounded' ? 'Workspace-grounded' : 'Needs live source'}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    {response.sources.length} source match{response.sources.length === 1 ? '' : 'es'}
                  </span>
                </div>
                <p className="text-sm leading-7 text-slate-700">{response.answer}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Open loops', response.summary.openLoops],
                  ['High priority', response.summary.highPriority],
                  ['Source gaps', response.summary.sourceGaps],
                  ['Live sources', response.summary.liveSources],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-200/80 bg-white/74 p-3 shadow-sm">
                    <p className="premium-label text-[10px] font-medium text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-[700] text-slate-950">{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/74 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  <h3 className="text-sm font-[650] text-slate-950">Matched records</h3>
                </div>
                <div className="space-y-2">
                  {response.sources.length ? response.sources.map((source) => (
                    <div key={source.id} className="rounded-xl border border-slate-200/80 bg-white/80 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-[650] text-slate-950">{source.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {source.board || source.sourceLabel || 'Workspace record'} - {source.status}
                          </p>
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                          {source.priority || 'medium'}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <p className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-sm leading-6 text-amber-800">
                      No matching decision records yet. Capture a question or refine the prompt.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-slate-200/80 bg-white/72 p-4 backdrop-blur-xl">
          <div className="relative mx-auto flex max-w-3xl items-end rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10">
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask what needs attention..."
              className="max-h-[120px] min-h-[44px] w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400"
              rows={1}
            />
            <button
              type="submit"
              disabled={isSubmitting || query.trim().length < 3}
              className="premium-button flex-shrink-0 rounded-xl p-2.5 text-white transition disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Ask analyst"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </form>
      </motion.section>

      <motion.aside variants={itemVariants} className="space-y-5">
        <div className="quiet-surface rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="premium-label text-[10px] font-medium text-slate-500">Trust state</p>
              <h3 className="mt-2 text-lg font-[650] text-slate-950">What the analyst can use</h3>
            </div>
            {hasLiveContext ? <CheckCircle2 size={18} className="text-emerald-600" /> : <ShieldAlert size={18} className="text-amber-600" />}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200/80 bg-white/74 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-[650] text-slate-950">
                <Radio size={15} className="text-blue-600" />
                Source posture
              </div>
              <p className="text-sm leading-6 text-slate-600">
                {hasLiveContext
                  ? `${liveIntegrations.length} live source${liveIntegrations.length === 1 ? '' : 's'} can contribute to workspace briefs.`
                  : 'No live source is connected, so responses stay conservative.'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/74 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-[650] text-slate-950">
                <MessageSquare size={15} className="text-blue-600" />
                Decision room
              </div>
              <p className="text-sm leading-6 text-slate-600">
                {activeQuestions.length} open question{activeQuestions.length === 1 ? '' : 's'} are available for triage. {sourceGaps.length} need a source trail.
              </p>
            </div>
          </div>
        </div>

        <div className="quiet-surface rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="premium-label text-[10px] font-medium text-slate-500">Next actions</p>
              <h3 className="mt-2 text-lg font-[650] text-slate-950">Make answers safer</h3>
            </div>
            <ArrowRight size={18} className="text-blue-500" />
          </div>
          <div className="space-y-2">
            {(response?.nextActions.length ? response.nextActions : [
              hasLiveContext ? 'Ask about a specific open decision.' : 'Connect a source before relying on analyst output.',
              sourceGaps.length ? 'Attach source trails to open records.' : 'Keep capturing source details with each new decision.',
              'Invite the person who owns the next decision.',
            ]).map((action) => (
              <div key={action} className="flex gap-3 rounded-xl border border-slate-200/80 bg-white/74 p-3 text-sm leading-6 text-slate-600">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="quiet-surface rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Link2 size={16} className="text-blue-600" />
            <h3 className="text-sm font-[650] text-slate-950">Connected sources</h3>
          </div>
          <div className="space-y-2">
            {liveIntegrations.length ? liveIntegrations.map((integration) => (
              <div key={integration.id} className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm font-semibold text-emerald-800">
                {integration.provider}
              </div>
            )) : (
              <p className="rounded-xl border border-slate-200/80 bg-white/74 p-3 text-sm leading-6 text-slate-500">
                No live sources yet. Setup checklists do not count as analyst signal.
              </p>
            )}
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
};
