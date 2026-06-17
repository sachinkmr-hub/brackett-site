import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Globe, Loader2, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../DashboardContext';

export const OnboardingTab: React.FC = () => {
  const { onboardingProfile, submitWebsiteOnboarding, submitScratchOnboarding } = useDashboard();
  const [websiteUrl, setWebsiteUrl] = useState(onboardingProfile?.websiteUrl || '');
  const [submittingMode, setSubmittingMode] = useState<'website' | 'scratch' | null>(null);

  const [scratchForm, setScratchForm] = useState({
    businessName: onboardingProfile?.businessName || '',
    industry: onboardingProfile?.industry || '',
    targetCustomer: onboardingProfile?.targetCustomer || '',
    mainOffer: onboardingProfile?.mainOffer || '',
    primaryPainPoints: onboardingProfile?.primaryPainPoints || '',
  });

  const needsOnboarding = !onboardingProfile || !(
    onboardingProfile.websiteUrl ||
    onboardingProfile.businessName ||
    onboardingProfile.industry ||
    onboardingProfile.targetCustomer ||
    onboardingProfile.mainOffer
  );

  const handleWebsiteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedUrl = websiteUrl.trim();
    if (!trimmedUrl) return;

    setSubmittingMode('website');
    try {
      const saved = await submitWebsiteOnboarding(trimmedUrl);
      if (saved) {
        if (typeof pendo !== 'undefined') {
          let domain = '';
          try { domain = new URL(trimmedUrl).hostname; } catch {}
          pendo.track('website_context_imported', {
            website_url_domain: domain,
            is_first_import: !onboardingProfile?.websiteUrl,
          });
        }
        setWebsiteUrl(trimmedUrl);
      }
    } finally {
      setSubmittingMode(null);
    }
  };

  const handleScratchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittingMode('scratch');
    try {
      const saved = await submitScratchOnboarding(scratchForm);
      if (saved && typeof pendo !== 'undefined') {
        pendo.track('business_profile_saved', {
          has_business_name: Boolean(scratchForm.businessName.trim()),
          has_industry: Boolean(scratchForm.industry.trim()),
          has_target_customer: Boolean(scratchForm.targetCustomer.trim()),
          has_main_offer: Boolean(scratchForm.mainOffer.trim()),
          has_pain_points: Boolean(scratchForm.primaryPainPoints.trim()),
          fields_filled_count: [scratchForm.businessName, scratchForm.industry, scratchForm.targetCustomer, scratchForm.mainOffer, scratchForm.primaryPainPoints].filter(v => v.trim()).length,
        });
      }
    } finally {
      setSubmittingMode(null);
    }
  };

  const isWebsiteSubmitting = submittingMode === 'website';
  const isScratchSubmitting = submittingMode === 'scratch';
  const isBusy = submittingMode !== null;

  return (
    <div className="space-y-6 pb-16">
      {needsOnboarding && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-panel rounded-2xl p-6"
        >
          <div className="absolute -right-20 -top-24 h-64 w-[420px] rotate-[-12deg] bg-[linear-gradient(115deg,transparent,rgba(37,99,235,0.13),rgba(6,182,212,0.12),transparent)] blur-2xl" aria-hidden="true" />
          <p className="premium-label text-[10px] font-medium text-blue-700">Suggested first action</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-[640] tracking-[-0.025em] text-slate-950">
            Give brackett enough context to answer like it belongs here.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Import a public website or define the business manually. brackett will use that profile to ground decisions, owners, and source trails.
          </p>
        </motion.div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handleWebsiteSubmit} className="premium-panel rounded-2xl p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
                <Globe size={20} />
              </div>
              <p className="premium-label text-[10px] font-medium text-blue-700">Website import</p>
              <h2 className="mt-2 text-2xl font-[620] tracking-[-0.02em] text-slate-950">Start from the public truth</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Use a live URL. If AI extraction is not configured, brackett will tell you instead of saving placeholder data.
              </p>
            </div>
            <Waves size={22} className="mt-2 text-cyan-500" />
          </div>

          <label htmlFor="company-website-url" className="premium-label text-[10px] font-medium text-slate-500">
            Company website
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="company-website-url"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="https://your-company.com"
              type="url"
              required
              disabled={isBusy}
              className="min-h-[48px] flex-1 rounded-2xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-65"
            />
            <button
              type="submit"
              disabled={isBusy}
              className="premium-button inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isWebsiteSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {isWebsiteSubmitting ? 'Importing...' : 'Import context'}
            </button>
          </div>

          <AnimatePresence>
            {isWebsiteSubmitting && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/60 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                    <span className="absolute inset-1 rounded-2xl border border-blue-200/80" />
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-[600] text-slate-950">Live import request in progress</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      brackett is waiting on the backend to fetch the site and extract profile fields. No placeholder profile will be saved.
                    </p>
                  </div>
                </div>
                <div className="trace-line mt-4 h-1.5 overflow-hidden rounded-full bg-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <form onSubmit={handleScratchSubmit} className="premium-panel rounded-2xl p-6">
          <div className="mb-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-700 shadow-sm">
              <Sparkles size={20} />
            </div>
            <p className="premium-label text-[10px] font-medium text-violet-700">Manual profile</p>
            <h2 className="mt-2 text-2xl font-[620] tracking-[-0.02em] text-slate-950">Shape the workspace yourself</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              For early teams, a concise manual profile is often faster than waiting on a website.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label="Business name" disabled={isBusy} className="rounded-2xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-65" placeholder="Business name" value={scratchForm.businessName} onChange={(event) => setScratchForm({ ...scratchForm, businessName: event.target.value })} />
            <input aria-label="Industry" disabled={isBusy} className="rounded-2xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-65" placeholder="Industry" value={scratchForm.industry} onChange={(event) => setScratchForm({ ...scratchForm, industry: event.target.value })} />
            <input aria-label="Target customer" disabled={isBusy} className="rounded-2xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-65 sm:col-span-2" placeholder="Target customer" value={scratchForm.targetCustomer} onChange={(event) => setScratchForm({ ...scratchForm, targetCustomer: event.target.value })} />
            <input aria-label="Main offer" disabled={isBusy} className="rounded-2xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-65 sm:col-span-2" placeholder="Main offer" value={scratchForm.mainOffer} onChange={(event) => setScratchForm({ ...scratchForm, mainOffer: event.target.value })} />
            <textarea aria-label="Primary pain points" disabled={isBusy} className="min-h-[112px] rounded-2xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-65 sm:col-span-2" placeholder="Primary pain points" value={scratchForm.primaryPainPoints} onChange={(event) => setScratchForm({ ...scratchForm, primaryPainPoints: event.target.value })} />
          </div>
          <button
            type="submit"
            disabled={isBusy}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/82 px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-blue-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isScratchSubmitting && <Loader2 size={15} className="animate-spin" />}
            {isScratchSubmitting ? 'Saving profile...' : 'Save business profile'}
          </button>
        </form>
      </div>

      {!needsOnboarding && onboardingProfile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="premium-panel rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 text-sm font-[600] text-slate-950">
            <CheckCircle2 size={18} className="text-emerald-600" />
            Workspace profile active
          </div>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Business', onboardingProfile.businessName || 'Not set'],
              ['Industry', onboardingProfile.industry || 'Not set'],
              ['Audience', onboardingProfile.targetCustomer || 'Not set'],
              ['Offer', onboardingProfile.mainOffer || 'Not set'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm">
                <dt className="premium-label text-[10px] font-medium text-blue-700">{label}</dt>
                <dd className="mt-2 line-clamp-2 text-sm font-[600] text-slate-950" title={value}>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm leading-6 text-emerald-800">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <span>Answers can now use this profile as grounding context. Connect live sources when you need source-backed confidence.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
