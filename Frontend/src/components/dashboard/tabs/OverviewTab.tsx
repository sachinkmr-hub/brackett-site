import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  Globe2,
  Inbox,
  Link2,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboard } from '../DashboardContext';
import { TabKey } from '../types';

const formatCompact = (value: number) => Intl.NumberFormat(undefined, { notation: 'compact' }).format(value);
const closedStatuses = ['answered', 'archived', 'closed', 'done'];
const easeOut = [0.16, 1, 0.3, 1] as const;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: easeOut } },
};

export const OverviewTab: React.FC<{ setActiveTab: (tab: TabKey) => void }> = ({ setActiveTab }) => {
  const {
    workspace,
    onboardingProfile,
    analytics,
    activityFeed,
    questions,
    boards,
    members,
    invites,
    integrations,
  } = useDashboard();
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace?.id) return;

    const key = `brackett_last_seen_${workspace.id}`;
    setLastSeenAt(localStorage.getItem(key));

    const timer = window.setTimeout(() => {
      localStorage.setItem(key, new Date().toISOString());
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [workspace?.id]);

  if (!workspace) return null;

  const needsOnboarding = !onboardingProfile || !(
    onboardingProfile.websiteUrl ||
    onboardingProfile.businessName ||
    onboardingProfile.industry ||
    onboardingProfile.targetCustomer ||
    onboardingProfile.mainOffer
  );

  const activeQuestions = questions.filter((question) => !closedStatuses.includes(question.status));
  const highPriorityQuestions = activeQuestions.filter((question) => ['critical', 'high'].includes(question.priority || ''));
  const needsSourceQuestions = activeQuestions.filter((question) => !question.sourceUrl && !question.sourceLabel && !question.sourceExcerpt && !question.board);
  const pendingInvites = invites.filter((invite) => !invite.acceptedAt && new Date(invite.expiresAt) > new Date());
  const liveSources = integrations.filter((integration) => ['ready', 'connected'].includes(integration.status));
  const totalRecords = analytics?.total ?? questions.length;
  const sourceBacked = analytics?.sourceBacked ?? questions.filter((question) => question.sourceUrl || question.sourceLabel || question.sourceExcerpt || question.board || question.latestDecision).length;
  const sourceCoverage = analytics?.sourceCoverage ?? (totalRecords ? Math.round((sourceBacked / totalRecords) * 100) : 0);
  const answered = analytics?.answered ?? questions.filter((question) => question.status === 'answered').length;

  const lastSeenDate = lastSeenAt ? new Date(lastSeenAt) : null;
  const changesSinceLastVisit = useMemo(() => {
    if (!lastSeenDate || Number.isNaN(lastSeenDate.getTime())) {
      return activityFeed.slice(0, 4);
    }

    return activityFeed
      .filter((item) => new Date(item.createdAt).getTime() > lastSeenDate.getTime())
      .slice(0, 4);
  }, [activityFeed, lastSeenAt]);

  const lastSeenLabel = lastSeenDate && !Number.isNaN(lastSeenDate.getTime())
    ? lastSeenDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'first session';

  const suggestedActions = [
    needsOnboarding
      ? {
          label: 'Import company context',
          detail: 'Ground brackett before trusting answers.',
          meta: 'Highest leverage',
          icon: <Globe2 size={16} />,
          onClick: () => setActiveTab('onboarding'),
        }
      : highPriorityQuestions.length
        ? {
            label: highPriorityQuestions[0].title,
            detail: 'Resolve the highest-risk open question.',
            meta: `${highPriorityQuestions.length} high priority`,
            icon: <AlertTriangle size={16} />,
            onClick: () => setActiveTab('discussions'),
          }
        : {
            label: activeQuestions.length ? 'Review open decisions' : 'Capture the next decision',
            detail: activeQuestions.length ? 'Triage unresolved work while context is fresh.' : 'Add the first open question to create momentum.',
            meta: `${activeQuestions.length} open`,
            icon: <Inbox size={16} />,
            onClick: () => setActiveTab('discussions'),
          },
    liveSources.length
      ? {
          label: 'Ask the private analyst',
          detail: 'Query only the context brackett can trace.',
          meta: `${liveSources.length} live source${liveSources.length === 1 ? '' : 's'}`,
          icon: <Radio size={16} />,
          onClick: () => setActiveTab('analyst'),
        }
      : {
          label: 'Connect a real source',
          detail: 'Move beyond setup checklists into live signal.',
          meta: 'Signal missing',
          icon: <Link2 size={16} />,
          onClick: () => setActiveTab('integrations'),
        },
    pendingInvites.length
      ? {
          label: 'Review pending invites',
          detail: 'Nudge teammates before links expire.',
          meta: `${pendingInvites.length} pending`,
          icon: <Users size={16} />,
          onClick: () => setActiveTab('team'),
        }
      : {
          label: 'Invite one decision maker',
          detail: 'Bring the next owner into the workspace.',
          meta: `${members.length} member${members.length === 1 ? '' : 's'}`,
          icon: <Users size={16} />,
          onClick: () => setActiveTab('team'),
        },
  ];

  const metricCards = [
    {
      label: 'Source coverage',
      value: `${sourceCoverage}%`,
      detail: `${sourceBacked}/${Math.max(totalRecords, 1)} records traceable`,
      icon: <ShieldCheck size={16} />,
      tone: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      glow: 'rgba(36, 84, 214, 0.10)',
    },
    {
      label: 'Open loops',
      value: formatCompact(activeQuestions.length),
      detail: highPriorityQuestions.length ? `${highPriorityQuestions.length} high priority` : 'No urgent priority flags',
      icon: <Inbox size={16} />,
      tone: highPriorityQuestions.length ? 'text-amber-700' : 'text-emerald-700',
      bg: highPriorityQuestions.length ? 'bg-amber-50' : 'bg-emerald-50',
      border: highPriorityQuestions.length ? 'border-amber-100' : 'border-emerald-100',
      glow: highPriorityQuestions.length ? 'rgba(183, 121, 31, 0.12)' : 'rgba(47, 125, 91, 0.10)',
    },
    {
      label: 'Decisions saved',
      value: formatCompact(answered),
      detail: analytics?.oldestOpenQuestion ? `Oldest open: ${analytics.oldestOpenQuestion.ageDays}d` : 'No aging decision debt',
      icon: <CheckCircle2 size={16} />,
      tone: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      glow: 'rgba(47, 125, 91, 0.10)',
    },
    {
      label: 'Live sources',
      value: formatCompact(liveSources.length),
      detail: liveSources.length ? 'Validated for signal' : 'Connect source before analyst answers',
      icon: <Link2 size={16} />,
      tone: liveSources.length ? 'text-cyan-700' : 'text-slate-500',
      bg: liveSources.length ? 'bg-cyan-50' : 'bg-slate-50',
      border: liveSources.length ? 'border-cyan-100' : 'border-slate-200',
      glow: liveSources.length ? 'rgba(14, 155, 168, 0.10)' : 'rgba(100, 116, 139, 0.08)',
    },
  ];

  const pipeline = [
    { label: 'Open', value: analytics?.open ?? questions.filter((question) => question.status === 'open' || question.status === 'active').length, color: 'bg-blue-600' },
    { label: 'In progress', value: analytics?.in_progress ?? questions.filter((question) => question.status === 'in_progress').length, color: 'bg-amber-500' },
    { label: 'Answered', value: answered, color: 'bg-emerald-600' },
    { label: 'Archived', value: analytics?.archived ?? questions.filter((question) => question.status === 'archived').length, color: 'bg-slate-400' },
  ];
  const pipelineTotal = Math.max(pipeline.reduce((sum, item) => sum + item.value, 0), 1);

  const boardHealth = boards.slice(0, 4).map((board) => ({
    board,
    active: activeQuestions.filter((question) => question.board?.id === board.id).length,
  }));

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.045 } } }}
      className="space-y-5 pb-16"
    >
      <motion.section variants={itemVariants} className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="quiet-surface relative overflow-hidden rounded-2xl p-5 sm:p-6">
          <div className="absolute -right-28 -top-24 h-56 w-80 rotate-[-10deg] bg-[linear-gradient(115deg,transparent,rgba(36,84,214,0.08),transparent)] blur-2xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Last check: {lastSeenLabel}
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl font-[650] leading-tight text-slate-950 sm:text-4xl">
                {needsOnboarding
                  ? 'Make the workspace trustworthy before you ask it to think.'
                  : `${workspace.name} has ${activeQuestions.length} open loop${activeQuestions.length === 1 ? '' : 's'} to protect.`}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {changesSinceLastVisit.length
                  ? `${changesSinceLastVisit.length} update${changesSinceLastVisit.length === 1 ? '' : 's'} changed since you left. Start with the next unresolved decision.`
                  : 'No new activity since your last check-in. Keep the system clean by routing the next decision now.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab(needsOnboarding ? 'onboarding' : activeQuestions.length ? 'discussions' : 'integrations')}
              className="premium-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white"
            >
              {needsOnboarding ? <Globe2 size={16} /> : activeQuestions.length ? <Inbox size={16} /> : <Link2 size={16} />}
              {needsOnboarding ? 'Import context' : activeQuestions.length ? 'Review decisions' : 'Connect source'}
            </button>
          </div>
        </div>

        <div data-tour="suggested-actions" className="quiet-surface rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="premium-label text-[10px] font-medium text-slate-500">Next best moves</p>
            <ArrowRight size={15} className="text-blue-500" />
          </div>
          <div className="space-y-2">
            {suggestedActions.map((action) => (
              <button
                type="button"
                key={action.label}
                onClick={action.onClick}
                className="motion-rise group flex w-full items-start gap-3 rounded-xl border border-slate-200/80 bg-white/74 p-3 text-left shadow-sm"
              >
                <span className="mt-0.5 rounded-xl border border-slate-200/80 bg-white p-2 text-blue-600 shadow-sm group-hover:border-blue-200">
                  {action.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-[650] text-slate-950">{action.label}</span>
                  <span className="mt-1 block text-[11px] font-medium text-blue-600">{action.meta}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{action.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      <section data-tour="health" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <motion.div
            variants={itemVariants}
            key={card.label}
            className="elite-card-glow rounded-2xl p-4"
            style={{
              '--glow-color': card.glow,
              '--glow-shadow': card.glow,
              '--glow-border-hover': card.glow,
            } as React.CSSProperties}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className={`rounded-xl border p-2 shadow-sm ${card.tone} ${card.bg} ${card.border}`}>{card.icon}</span>
              <span className="text-[11px] font-semibold text-slate-400">Live</span>
            </div>
            <p className="text-3xl font-[700] text-slate-950">{card.value}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{card.detail}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <motion.div variants={itemVariants} className="quiet-surface rounded-2xl p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="premium-label text-[10px] font-medium text-slate-500">Decision pipeline</p>
              <h3 className="mt-2 text-lg font-[650] text-slate-950">Where the work stands</h3>
            </div>
            <BarChart3 size={18} className="text-blue-500" />
          </div>

          <div className="space-y-4">
            {pipeline.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-[600] text-slate-700">{item.label}</span>
                  <span className="text-slate-500">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max(4, (item.value / pipelineTotal) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/80 bg-white/74 p-3">
              <p className="premium-label text-[10px] font-medium text-slate-500">Needs source</p>
              <p className="mt-2 text-xl font-[700] text-slate-950">{analytics?.needsSource ?? needsSourceQuestions.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/74 p-3">
              <p className="premium-label text-[10px] font-medium text-slate-500">Stale</p>
              <p className="mt-2 text-xl font-[700] text-slate-950">{analytics?.stale ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/74 p-3">
              <p className="premium-label text-[10px] font-medium text-slate-500">Boards</p>
              <p className="mt-2 text-xl font-[700] text-slate-950">{analytics?.totalBoards ?? boards.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="quiet-surface rounded-2xl p-5">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="premium-label text-[10px] font-medium text-slate-500">Activity</p>
              <h3 className="mt-2 text-lg font-[650] text-slate-950">What changed recently</h3>
            </div>
            <Clock3 size={18} className="text-slate-400" />
          </div>

          <div className="space-y-3">
            {(changesSinceLastVisit.length ? changesSinceLastVisit : activityFeed.slice(0, 4)).map((item) => (
              <div key={item.id} className="flex gap-3 rounded-xl border border-slate-200/80 bg-white/74 p-3 shadow-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-[650] text-slate-950">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.summary || item.type}</p>
                </div>
              </div>
            ))}
            {!activityFeed.length && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-900">
                Activity will appear here as the team creates boards, captures questions, logs decisions, and invites teammates.
              </div>
            )}
          </div>
        </motion.div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <motion.div variants={itemVariants} className="quiet-surface rounded-2xl p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="premium-label text-[10px] font-medium text-slate-500">Board health</p>
              <h3 className="mt-2 text-lg font-[650] text-slate-950">Where questions collect</h3>
            </div>
            <FileText size={18} className="text-slate-400" />
          </div>

          <div className="space-y-2">
            {boardHealth.length ? boardHealth.map(({ board, active }) => (
              <button
                type="button"
                key={board.id}
                onClick={() => setActiveTab('discussions')}
                className="motion-rise flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white/74 p-3 text-left shadow-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-[650] text-slate-950">{board.name}</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">{board.description || 'No description yet'}</span>
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  {active} open
                </span>
              </button>
            )) : (
              <div className="rounded-xl border border-slate-200/80 bg-white/74 p-4 text-sm leading-6 text-slate-500">
                Create boards to group decisions by product, launch, customer, or operational lane.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="quiet-surface rounded-2xl p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="premium-label text-[10px] font-medium text-blue-700">Private analyst</p>
              <h3 className="mt-2 text-lg font-[650] text-slate-950">Answers only when sources exist</h3>
            </div>
            <Sparkles size={18} className="text-blue-500" />
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/74 p-4 text-sm leading-6 text-slate-600">
            {liveSources.length
              ? `Ready to answer from ${liveSources.length} live source${liveSources.length === 1 ? '' : 's'}, open decisions, workspace profile, and activity history.`
              : 'Connect at least one live source before analyst answers unlock. brackett should feel trustworthy because it refuses to invent certainty.'}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-white/74 p-3">
              <Gauge size={16} className="mb-2 text-blue-600" />
              <p className="text-xs font-medium text-slate-500">Coverage</p>
              <p className="mt-1 text-sm font-[650] text-slate-950">{sourceCoverage}% source-backed</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/74 p-3">
              <Radio size={16} className="mb-2 text-blue-600" />
              <p className="text-xs font-medium text-slate-500">Analyst state</p>
              <p className="mt-1 text-sm font-[650] text-slate-950">{liveSources.length ? 'Ready' : 'Locked'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab(liveSources.length ? 'analyst' : 'integrations')}
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white/78 p-3 text-left text-sm font-[650] text-slate-950 transition-colors hover:border-blue-200 hover:bg-white"
          >
            {liveSources.length ? 'Open private analyst' : 'Connect a source'}
            <ArrowRight size={15} className="text-blue-500" />
          </button>
        </motion.div>
      </section>
    </motion.div>
  );
};
