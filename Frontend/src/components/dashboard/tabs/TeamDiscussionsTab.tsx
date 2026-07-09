import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Link2,
  MessageSquare,
  Plus,
  Search,
  UserRoundCheck,
} from 'lucide-react';
import { useDashboard } from '../DashboardContext';

const isOpenStatus = (status: string) => !['answered', 'archived', 'closed', 'done'].includes(status);
const easeOut = [0.16, 1, 0.3, 1] as const;

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: easeOut } },
};

export const TeamDiscussionsTab: React.FC = () => {
  const { questions, boards, submitQuestion } = useDashboard();
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    longDescription: '',
    sourceUrl: '',
    sourceLabel: '',
    priority: 'medium',
    boardId: '',
  });

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return questions
      .filter((question) => isOpenStatus(question.status))
      .filter((question) => {
        if (!query) return true;
        return [
          question.title,
          question.longDescription,
          question.sourceLabel,
          question.category,
          question.board?.name,
        ].filter(Boolean).join(' ').toLowerCase().includes(query);
      });
  }, [questions, search]);

  const sourceBacked = filteredQuestions.filter((question) => question.sourceUrl || question.sourceLabel || question.sourceExcerpt || question.board).length;
  const highPriority = filteredQuestions.filter((question) => ['high', 'critical'].includes(question.priority || '')).length;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title || isSubmitting) return;

    setIsSubmitting(true);
    const didSubmit = await submitQuestion({
      title,
      longDescription: form.longDescription.trim() || undefined,
      sourceUrl: form.sourceUrl.trim() || undefined,
      sourceLabel: form.sourceLabel.trim() || undefined,
      priority: form.priority,
      boardId: form.boardId || undefined,
    });
    if (didSubmit) {
      if (typeof pendo !== 'undefined') {
        pendo.track('question_created', {
          priority: form.priority,
          has_source_url: Boolean(form.sourceUrl.trim()),
          has_source_label: Boolean(form.sourceLabel.trim()),
          has_board: Boolean(form.boardId),
          has_description: Boolean(form.longDescription.trim()),
          board_id: form.boardId || '',
        });
      }
      setForm({
        title: '',
        longDescription: '',
        sourceUrl: '',
        sourceLabel: '',
        priority: 'medium',
        boardId: '',
      });
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div
      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
      initial="hidden"
      animate="show"
      className="grid gap-5 pb-16 xl:grid-cols-[360px_1fr]"
    >
      <motion.aside variants={itemVariants} className="space-y-5">
        <form onSubmit={handleSubmit} className="quiet-surface rounded-2xl p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
              <Plus size={19} />
            </div>
            <div>
              <p className="premium-label text-[10px] font-medium text-blue-700">Capture</p>
              <h2 className="text-xl font-[650] text-slate-950">New decision loop</h2>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="premium-label mb-1.5 block text-[10px] font-medium text-slate-500">Question</span>
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="w-full rounded-xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
                placeholder="What needs a clear answer?"
                required
              />
            </label>

            <label className="block">
              <span className="premium-label mb-1.5 block text-[10px] font-medium text-slate-500">Context</span>
              <textarea
                value={form.longDescription}
                onChange={(event) => setForm({ ...form, longDescription: event.target.value })}
                className="min-h-[92px] w-full rounded-xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Why does this matter right now?"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block">
                <span className="premium-label mb-1.5 block text-[10px] font-medium text-slate-500">Priority</span>
                <select
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm capitalize shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
                >
                  {['low', 'medium', 'high', 'critical'].map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="premium-label mb-1.5 block text-[10px] font-medium text-slate-500">Board</span>
                <select
                  value={form.boardId}
                  onChange={(event) => setForm({ ...form, boardId: event.target.value })}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="">No board yet</option>
                  {boards.filter((board) => !board.isArchived).map((board) => (
                    <option key={board.id} value={board.id}>{board.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="premium-label mb-1.5 block text-[10px] font-medium text-slate-500">Source label</span>
              <input
                value={form.sourceLabel}
                onChange={(event) => setForm({ ...form, sourceLabel: event.target.value })}
                className="w-full rounded-xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Slack thread, PRD, meeting note..."
              />
            </label>

            <label className="block">
              <span className="premium-label mb-1.5 block text-[10px] font-medium text-slate-500">Source URL</span>
              <input
                value={form.sourceUrl}
                onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })}
                className="w-full rounded-xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
                placeholder="https://..."
                type="url"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !form.title.trim()}
            className="premium-button mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            {isSubmitting ? 'Capturing...' : 'Capture question'}
          </button>
        </form>

        <div className="quiet-surface rounded-2xl p-5">
          <p className="premium-label text-[10px] font-medium text-slate-500">Routing lanes</p>
          <div className="mt-4 space-y-2">
            {boards.slice(0, 5).map((board) => (
              <div key={board.id} className="rounded-xl border border-slate-200/80 bg-white/74 p-3 shadow-sm">
                <p className="text-sm font-[650] text-slate-950">{board.name}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{board.description || 'No description yet'}</p>
              </div>
            ))}
            {!boards.length && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-900">
                Boards appear here when you create routing lanes in Sources.
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      <motion.section variants={itemVariants} className="quiet-surface rounded-2xl p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="premium-label text-[10px] font-medium text-blue-700">Decision room</p>
            <h2 className="mt-2 text-3xl font-[650] leading-tight text-slate-950">
              {filteredQuestions.length ? `${filteredQuestions.length} open loop${filteredQuestions.length === 1 ? '' : 's'}` : 'No open loops yet'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Each record should explain the question, the owner, the source, and the final answer once the team decides.
            </p>
          </div>

          <div className="grid min-w-[260px] grid-cols-3 gap-2">
            {[
              ['Source-backed', sourceBacked],
              ['High', highPriority],
              ['Boards', boards.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200/80 bg-white/74 p-3 text-center shadow-sm">
                <p className="text-lg font-[700] text-slate-950">{value}</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions, boards, or sources..."
            className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-3 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="space-y-3">
          {filteredQuestions.map((question) => (
            <motion.div
              key={question.id}
              variants={itemVariants}
              className="motion-rise rounded-2xl border border-slate-200/80 bg-white/76 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">{question.status}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">{question.priority || 'medium'}</span>
                    {question.board && (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">{question.board.name}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-[650] leading-snug text-slate-950">{question.title}</h3>
                  {question.longDescription && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{question.longDescription}</p>}
                </div>
                <ArrowRight size={18} className="shrink-0 text-blue-500" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200/80 bg-white/74 p-3">
                  <UserRoundCheck size={15} className="mb-2 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-500">Owner</p>
                  <p className="mt-1 text-sm font-[650] text-slate-950">{question.assignees?.length ? `${question.assignees.length} assigned` : 'Unassigned'}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white/74 p-3">
                  <Link2 size={15} className="mb-2 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-500">Source trail</p>
                  <p className="mt-1 text-sm font-[650] text-slate-950">{question.sourceUrl || question.sourceLabel || question.sourceExcerpt ? 'Attached' : 'Missing'}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white/74 p-3">
                  <FileText size={15} className="mb-2 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-500">Decision</p>
                  <p className="mt-1 text-sm font-[650] text-slate-950">{question.latestDecision?.newValue?.decisionText ? 'Logged' : 'Open'}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {!filteredQuestions.length && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-8 text-center">
              <MessageSquare size={28} className="mx-auto mb-3 text-blue-600" />
              <h3 className="text-xl font-[650] text-slate-950">Nothing is stuck right now.</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Capture the next unresolved question with a source trail before it becomes another memory task.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={14} />
                Decision room clear
              </div>
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
};
