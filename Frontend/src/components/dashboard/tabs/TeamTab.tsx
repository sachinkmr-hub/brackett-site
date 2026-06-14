import React, { useState } from 'react';
import { Copy, ExternalLink, Plus, UserPlus, Users } from 'lucide-react';
import { useDashboard } from '../DashboardContext';

export const TeamTab: React.FC = () => {
  const { workspace, members, invites, createInvite } = useDashboard();
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [latestInviteLink, setLatestInviteLink] = useState('');

  const canManageWorkspace = workspace?.role === 'owner' || workspace?.role === 'admin';
  const pendingInvites = invites.filter((invite) => !invite.acceptedAt && new Date(invite.expiresAt) > new Date());
  const inviteRoleOptions = ['member', 'admin', 'viewer'];

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    const link = await createInvite(inviteForm);
    if (link) {
      setLatestInviteLink(link);
      setInviteForm({ email: '', role: 'member' });
    }
  };

  return (
    <div className="grid gap-6 pb-16 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="premium-panel rounded-2xl p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
              <Users size={20} />
            </div>
            <p className="premium-label text-[10px] font-medium text-blue-700">People</p>
            <h2 className="mt-2 text-3xl font-[640] tracking-[-0.025em] text-slate-950">Workspace members</h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-white/72 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
            {members.length} member{members.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.userId} className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/72 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-[600] text-slate-950">{member.name}</p>
                <p className="text-xs text-slate-500">{member.email}</p>
              </div>
              <span className="self-start rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 sm:self-auto">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="premium-panel rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-700 shadow-sm">
              <UserPlus size={20} />
            </div>
            <div>
              <p className="premium-label text-[10px] font-medium text-cyan-700">Invite flow</p>
              <h2 className="mt-2 text-2xl font-[620] tracking-[-0.02em] text-slate-950">Invite teammate</h2>
            </div>
          </div>

          {canManageWorkspace ? (
            <form onSubmit={handleCreateInvite} className="mt-6">
              <div className="grid gap-3">
                <input className="rounded-2xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10" placeholder="teammate@company.com" value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} />
                <select className="rounded-2xl border border-slate-200/80 bg-white/82 px-4 py-3 text-sm capitalize shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10" value={inviteForm.role} onChange={(event) => setInviteForm({ ...inviteForm, role: event.target.value })}>
                  {inviteRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              <button type="submit" className="premium-button mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition">
                <Plus size={16} />
                Create invite
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white/70 p-4">
              <p className="text-sm font-[600] text-slate-950">Invite access is limited</p>
              <p className="mt-1 text-sm text-slate-500">Owners and admins can invite teammates and manage workspace roles.</p>
            </div>
          )}

          {latestInviteLink && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="premium-label text-[10px] font-medium text-blue-700">Invite link ready</p>
              <p className="mt-2 break-all text-sm leading-6 text-slate-700">{latestInviteLink}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(latestInviteLink).catch(() => undefined)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/82 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-white"
                >
                  <Copy size={15} />
                  Copy link
                </button>
                <a
                  href={latestInviteLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/82 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-white"
                >
                  <ExternalLink size={15} />
                  Open link
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="premium-panel rounded-2xl p-6">
          <h2 className="text-xl font-[620] tracking-[-0.02em] text-slate-950">Pending invites</h2>
          <div className="mt-4 space-y-3">
            {pendingInvites.length ? (
              pendingInvites.map((invite) => (
                <div key={invite.id} className="rounded-2xl border border-slate-200/80 bg-white/72 px-4 py-4 shadow-sm">
                  <p className="text-sm font-[600] text-slate-950">{invite.email}</p>
                  <p className="mt-1 text-xs text-slate-500">{invite.role} - expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-sm text-slate-500">No pending invites right now.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
