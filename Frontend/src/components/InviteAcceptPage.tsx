import React, { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, LogIn, UserPlus } from 'lucide-react';
import { BrackettLogo } from './BrackettLogo';
import { COLORS } from '../theme/tokens';
import { LEGACY_WORKSPACE_ID_KEY, clearAuthSession } from '../lib/authSession';
import { apiRequest } from '../lib/api';
import { buildAppUrl, getCurrentAppSearchParams } from '../lib/routing';

type InviteAcceptPageProps = {
  isAuthenticated: boolean;
  onShowAuth: (mode: 'login' | 'signup') => void;
};

type InviteAcceptState = 'idle' | 'accepting' | 'accepted' | 'error';

export const InviteAcceptPage: React.FC<InviteAcceptPageProps> = ({
  isAuthenticated,
  onShowAuth,
}) => {
  const token = useMemo(() => getCurrentAppSearchParams().get('token') || '', []);
  const [state, setState] = useState<InviteAcceptState>(token ? 'idle' : 'error');
  const [message, setMessage] = useState(
    token
      ? 'Sign in with the invited email to join this brackett workspace.'
      : 'This invite link is missing its token. Ask your workspace owner to send a fresh invite.'
  );

  useEffect(() => {
    if (!token || !isAuthenticated || state === 'accepting' || state === 'accepted') {
      return;
    }

    let isCancelled = false;

    const acceptInvite = async () => {
      setState('accepting');
      setMessage("We're adding you to the workspace now.");

      try {
        const payload = await apiRequest<{
          workspace?: { id?: string; name?: string | null } | null;
          role?: string;
        }>('/workspaces/invites/accept', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });

        if (payload.workspace?.id) {
          localStorage.setItem(LEGACY_WORKSPACE_ID_KEY, payload.workspace.id);
        }

        if (isCancelled) {
          return;
        }

        setState('accepted');
        setMessage(
          payload.workspace?.name
            ? `You're in. Opening ${payload.workspace.name} now.`
            : "You're in. Opening your workspace now."
        );

        window.setTimeout(() => {
          window.location.replace(buildAppUrl('/').toString());
        }, 900);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setState('error');
        setMessage(error instanceof Error ? error.message : 'We could not accept this invite yet.');
      }
    };

    void acceptInvite();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, state, token]);

  const handleDifferentAccount = () => {
    clearAuthSession();
    onShowAuth('login');
  };

  const actionButtons = isAuthenticated ? (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
      <button
        type="button"
        onClick={handleDifferentAccount}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/82 px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm hover:bg-white"
      >
        <LogIn size={16} />
        Use a different account
      </button>
      <button
        type="button"
        onClick={() => window.location.replace(buildAppUrl('/').toString())}
        className="premium-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
      >
        Open home
      </button>
    </div>
  ) : (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
      <button
        type="button"
        onClick={() => onShowAuth('login')}
        className="premium-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
      >
        <LogIn size={16} />
        Sign in to join
      </button>
      <button
        type="button"
        onClick={() => onShowAuth('signup')}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/82 px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm hover:bg-white"
      >
        <UserPlus size={16} />
        Create account
      </button>
    </div>
  );

  return (
    <div 
      style={{ background: `linear-gradient(180deg, ${COLORS.neutral.white}, ${COLORS.neutral.porcelain})` }}
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16"
    >
      <div className="aura-flow-layer subtle" aria-hidden="true" />
      <div className="liquid-grid opacity-60" aria-hidden="true" />
      <div className="premium-panel w-full max-w-xl rounded-3xl p-8 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <BrackettLogo size={32} color={COLORS.logo.dark} />
          <p className="premium-label mt-4 text-[10px] font-semibold text-blue-700">
            Workspace invite
          </p>
          <h1 className="mt-3 text-3xl font-[750] tracking-[-0.045em] text-slate-950">Join brackett</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            {message}
          </p>

          {state === 'accepting' && (
            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-blue-100 bg-blue-50/80 px-4 py-2 text-sm font-medium text-blue-900">
              <LoaderCircle size={16} className="animate-spin" />
              Finalizing your access
            </div>
          )}

          {state !== 'accepting' && actionButtons}
        </div>
      </div>
    </div>
  );
};
