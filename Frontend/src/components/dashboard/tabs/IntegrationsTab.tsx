import React, { useState } from 'react';
import { Blocks, CheckCircle2, Link2, ShieldAlert, Sparkles } from 'lucide-react';
import { useDashboard } from '../DashboardContext';

const isLiveStatus = (status: string) => ['ready', 'connected'].includes(status);

export const IntegrationsTab: React.FC = () => {
  const { workspace, boards, createBoard, toggleBoardArchive, integrationCatalog, integrations, connectPlaceholderIntegration } = useDashboard();
  const [boardForm, setBoardForm] = useState({ name: '', description: '' });

  const canManageWorkspace = workspace?.role === 'owner' || workspace?.role === 'admin';

  const getIntegrationStatus = (provider: string) => {
    return integrations.find((integration) => integration.provider === provider)?.status || 'not_connected';
  };

  const handleCreateBoard = async (event: React.FormEvent) => {
    event.preventDefault();
    const didCreate = await createBoard(boardForm);
    if (didCreate) {
      setBoardForm({ name: '', description: '' });
    }
  };

  return (
    <div className="grid gap-6 pb-16 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="premium-panel rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
              <Blocks size={20} />
            </div>
            <p className="premium-label text-[10px] font-medium text-blue-700">Workspace structure</p>
            <h2 className="mt-2 text-2xl font-[620] tracking-[-0.02em] text-slate-950">Boards and project groupings</h2>
          </div>
        </div>

        {canManageWorkspace ? (
          <form onSubmit={handleCreateBoard} className="mt-6 space-y-3">
            <input className="w-full rounded-2xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10" placeholder="Board name" value={boardForm.name} onChange={(event) => setBoardForm({ ...boardForm, name: event.target.value })} />
            <textarea className="min-h-[96px] w-full rounded-2xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10" placeholder="What work lives here?" value={boardForm.description} onChange={(event) => setBoardForm({ ...boardForm, description: event.target.value })} />
            <button type="submit" className="premium-button rounded-2xl px-5 py-3 text-sm font-semibold text-white transition">
              Create board
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white/70 p-4">
            <p className="text-sm font-[600] text-slate-950">Board setup is limited</p>
            <p className="mt-1 text-sm text-slate-500">Owners and admins manage boards.</p>
          </div>
        )}

        <div className="mt-8 max-h-[500px] space-y-3 overflow-y-auto pr-1">
          {boards.map((board) => (
            <div key={board.id} className={`rounded-2xl border px-4 py-4 shadow-sm ${board.isArchived ? 'border-slate-200/60 bg-white/45 opacity-70' : 'border-slate-200/80 bg-white/72'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-[600] text-slate-950">{board.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{board.description || 'No description'}</p>
                </div>
                {canManageWorkspace && (
                  <button
                    onClick={() => toggleBoardArchive(board)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {board.isArchived ? 'Restore' : 'Archive'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="premium-panel rounded-2xl p-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-700 shadow-sm">
              <Link2 size={20} />
            </div>
            <p className="premium-label text-[10px] font-medium text-cyan-700">Source readiness</p>
            <h2 className="mt-2 text-2xl font-[620] tracking-[-0.02em] text-slate-950">Connected tools</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Saving a setup checklist is different from connecting a live source. brackett only counts validated sources as signal.
            </p>
          </div>
          <Sparkles size={18} className="mt-2 text-blue-500" />
        </div>

        <div className="max-h-[620px] space-y-4 overflow-y-auto pr-1">
          {integrationCatalog.map((item) => {
            const status = getIntegrationStatus(item.provider);
            const isLive = isLiveStatus(status);
            const isSetupRequired = status === 'setup_required';

            return (
              <div key={item.provider} className="rounded-2xl border border-slate-200/80 bg-white/72 p-5 shadow-sm transition hover:border-blue-200 hover:bg-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-[600] tracking-[-0.015em] text-slate-950">{item.label}</p>
                      {isLive && <CheckCircle2 size={16} className="text-emerald-600" />}
                      {isSetupRequired && <ShieldAlert size={16} className="text-amber-600" />}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.category} - {item.connectionType === 'oauth2' ? 'OAuth source' : 'Webhook source'}</p>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                      {isLive
                        ? item.supportsSync ? 'Validated source. Sync-ready for status and context updates.' : 'Validated delivery source.'
                        : isSetupRequired
                          ? 'Setup checklist saved. Add provider credentials before this counts as live signal.'
                          : item.supportsSync ? 'Connect this source when you are ready to sync workspace context.' : 'Configure this source when you are ready to deliver announcements.'}
                    </p>
                  </div>
                  {!isLive && !isSetupRequired ? (
                    <button
                      onClick={() => connectPlaceholderIntegration(item.provider, false)}
                      className="rounded-2xl border border-slate-200 bg-white/82 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-blue-200 hover:bg-white"
                    >
                      Save setup checklist
                    </button>
                  ) : (
                    <span className={`self-start rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                      isLive
                        ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border border-amber-100 bg-amber-50 text-amber-700'
                    }`}>
                      {isLive ? 'Live source' : 'Setup needed'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
