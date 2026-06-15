import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  Command,
  Globe,
  LayoutGrid,
  Link2,
  LogOut,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDashboard } from './DashboardContext';
import { useAuth } from '../../providers/AuthProvider';
import { TabKey } from './types';
import { OverviewTab } from './tabs/OverviewTab';
import { OnboardingTab } from './tabs/OnboardingTab';
import { TeamDiscussionsTab } from './tabs/TeamDiscussionsTab';
import { AnalystBrainTab } from './tabs/AnalystBrainTab';
import { TeamTab } from './tabs/TeamTab';
import { IntegrationsTab } from './tabs/IntegrationsTab';
import { CommandPalette } from './CommandPalette';
import { GuidedTour } from './GuidedTour';
import { BrackettWordmark } from '../BrackettLogo';

const tabs: Array<{ id: TabKey; label: string; eyebrow: string; icon: React.ReactNode; description: string }> = [
  { id: 'overview', label: 'Command', eyebrow: 'Today', icon: <LayoutGrid size={16} />, description: 'Priorities, coverage, and workspace health.' },
  { id: 'onboarding', label: 'Context', eyebrow: 'Setup', icon: <Globe size={16} />, description: 'Ground the workspace in the company truth.' },
  { id: 'discussions', label: 'Decisions', eyebrow: 'Open loops', icon: <MessageSquare size={16} />, description: 'Questions, owners, source trails, and answers.' },
  { id: 'analyst', label: 'Analyst', eyebrow: 'Private', icon: <BrainCircuit size={16} />, description: 'Ask against connected, source-backed context.' },
  { id: 'integrations', label: 'Sources', eyebrow: 'Signal', icon: <Link2 size={16} />, description: 'Boards, integrations, and data readiness.' },
  { id: 'team', label: 'People', eyebrow: 'Access', icon: <Users size={16} />, description: 'Members, roles, and invite links.' },
];

const closedStatuses = ['answered', 'archived', 'closed', 'done'];

export const DashboardLayout: React.FC = () => {
  const {
    isLoading,
    error,
    workspace,
    onboardingProfile,
    questions,
    members,
    invites,
    integrations,
    analytics,
    loadDashboard,
  } = useDashboard();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isCmdKOpen, setIsCmdKOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdKOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const contentPanel = contentRef.current;
    if (!contentPanel) return;
    const prefersReducedMotion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    if (typeof contentPanel.scrollTo === 'function') {
      contentPanel.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    } else {
      contentPanel.scrollTop = 0;
    }
  }, [activeTab]);

  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const needsOnboarding = !onboardingProfile || !(
    onboardingProfile.websiteUrl ||
    onboardingProfile.businessName ||
    onboardingProfile.industry ||
    onboardingProfile.targetCustomer ||
    onboardingProfile.mainOffer
  );

  const activeQuestions = questions.filter((question) => !closedStatuses.includes(question.status));
  const pendingInvites = invites.filter((invite) => !invite.acceptedAt && new Date(invite.expiresAt) > new Date());
  const liveSources = integrations.filter((integration) => ['ready', 'connected'].includes(integration.status)).length;

  const readinessScore = useMemo(() => {
    const sourceCoverage = analytics?.sourceCoverage ?? 0;
    const contextScore = needsOnboarding ? 0 : 28;
    const peopleScore = Math.min(members.length, 4) * 6;
    const sourceScore = Math.min(liveSources, 3) * 10;
    const decisionScore = Math.min(analytics?.answered ?? 0, 5) * 4;
    const drag = Math.min(activeQuestions.length, 6) * 2 + Math.min(pendingInvites.length, 3) * 3;
    return Math.max(8, Math.min(100, 20 + contextScore + peopleScore + sourceScore + decisionScore + Math.round(sourceCoverage * 0.22) - drag));
  }, [activeQuestions.length, analytics?.answered, analytics?.sourceCoverage, liveSources, members.length, needsOnboarding, pendingInvites.length]);

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <div className="brackett-dashboard relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 rounded-full border-4 border-slate-200 border-t-slate-950 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Opening your workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="brackett-dashboard relative min-h-screen overflow-hidden px-6 py-16">
        <div className="quiet-surface mx-auto max-w-2xl rounded-2xl p-8">
          <p className="premium-label text-[10px] font-medium text-blue-700">Workspace load</p>
          <h1 className="mt-3 text-2xl font-[650] text-slate-950">Workspace needs attention</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {error || 'We could not load your dashboard yet.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={loadDashboard} className="premium-button rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
              Retry workspace load
            </button>
            <button onClick={handleLogout} className="rounded-xl border border-slate-200/80 bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-sm hover:bg-slate-50">
              Clear session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="brackett-dashboard relative min-h-screen overflow-hidden text-slate-950">
      <CommandPalette isOpen={isCmdKOpen} onClose={() => setIsCmdKOpen(false)} onSelectTab={setActiveTab} />
      <GuidedTour activeTab={activeTab} needsOnboarding={needsOnboarding} onSelectTab={setActiveTab} />

      <div className="relative z-10 flex min-h-screen">
        <aside data-tour="workspace-nav" className="hidden w-[268px] shrink-0 border-r border-slate-200/80 bg-white/82 px-4 py-5 shadow-[1px_0_0_rgba(255,255,255,0.78)_inset] backdrop-blur-2xl lg:flex lg:flex-col">
          <div className="mb-7 flex items-center gap-3 px-1">
            <BrackettWordmark markSize={24} textClassName="text-[18px]" />
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">{workspace.name}</p>
            </div>
          </div>

          <nav className="space-y-1.5" aria-label="Workspace">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-left text-sm font-[560] transition-colors ${
                    isActive ? 'text-slate-950' : 'text-slate-500 hover:bg-white/80 hover:text-slate-950'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(17,21,29,0.08)]"
                      transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                    />
                  )}
                  <span className={`relative z-10 rounded-lg border p-1.5 ${isActive ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-transparent text-slate-400 group-hover:text-slate-700'}`}>
                    {tab.icon}
                  </span>
                  <span className="relative z-10 min-w-0">
                    <span className="block">{tab.label}</span>
                    <span className="block truncate text-[11px] font-medium text-slate-400">{tab.eyebrow}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <button
            onClick={() => setIsCmdKOpen(true)}
            className="mt-6 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/74 px-3 py-2.5 text-sm text-slate-500 shadow-sm backdrop-blur-xl transition-colors hover:border-blue-200 hover:bg-white hover:text-slate-950"
          >
            <span className="flex items-center gap-2">
              <Command size={14} />
              Search
            </span>
            <span className="flex gap-1 text-[10px] font-bold">
              <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5">Ctrl</kbd>
              <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5">K</kbd>
            </span>
          </button>

          <div className="quiet-surface mt-auto rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="premium-label text-[10px] font-medium text-slate-500">Workspace readiness</p>
              {readinessScore >= 80 ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Sparkles size={15} className="text-blue-600" />}
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="text-3xl font-[650] text-slate-950">{readinessScore}%</p>
              <p className="text-right text-xs leading-5 text-slate-500">
                {needsOnboarding ? 'Context is the first unlock.' : `${activeQuestions.length} open loop${activeQuestions.length === 1 ? '' : 's'}.`}
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
              <div className="h-full rounded-full bg-slate-950 transition-all duration-300" style={{ width: `${readinessScore}%` }} />
            </div>
          </div>
        </aside>

        <main id="brackett-main-content" className="relative flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
          <header data-tour="dashboard-header" className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.72)_inset] backdrop-blur-2xl sm:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="premium-label text-[10px] font-medium text-blue-700">{currentTab.eyebrow}</p>
                <h1 className="mt-1 text-2xl font-[650] text-slate-950 sm:text-3xl">{currentTab.label}</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{currentTab.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1 lg:hidden">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative rounded-full px-4 py-2 text-sm font-[560] whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'text-white'
                          : 'border border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="mobile-active"
                          className="absolute inset-0 rounded-full bg-slate-950"
                          transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsCmdKOpen(true)}
                  className="lg:hidden rounded-full border border-slate-200 bg-white p-2 text-slate-950 hover:bg-slate-50"
                  aria-label="Open command palette"
                >
                  <Command size={16} />
                </button>

                <button
                  onClick={loadDashboard}
                  className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition-colors hover:bg-white hover:text-slate-950 sm:inline-flex"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
                <button
                  onClick={handleLogout}
                  className="premium-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <div ref={contentRef} className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-7">
            <AnimatePresence>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                {activeTab === 'overview' && <OverviewTab setActiveTab={setActiveTab} />}
                {activeTab === 'onboarding' && <OnboardingTab />}
                {activeTab === 'discussions' && <TeamDiscussionsTab />}
                {activeTab === 'analyst' && <AnalystBrainTab />}
                {activeTab === 'team' && <TeamTab />}
                {activeTab === 'integrations' && <IntegrationsTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};
