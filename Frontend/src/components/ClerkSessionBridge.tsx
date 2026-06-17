import React, { useEffect, useRef } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession, getStoredAuthProvider, persistAuthSession } from '../lib/authSession';
import { getApiBaseUrl } from '../lib/api';
import { clearClerkAuthHandoffRequest, getClerkRedirectTarget, isClerkAuthHandoffRequest } from '../lib/clerk';

const SYNC_FAILURE_TITLE = 'Google sign-in needs one more step';

export const ClerkSessionBridge: React.FC = () => {
  const { isLoaded, isSignedIn, sessionId, getToken } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const clerk = useClerk();
  const location = useLocation();
  const navigate = useNavigate();
  const syncedSessionRef = useRef<string | null>(null);
  const failedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const handleSignedOut = () => {
      syncedSessionRef.current = null;
      failedSessionRef.current = null;

      if (clerk.session) {
        void clerk.signOut().catch(() => undefined);
      }
    };

    window.addEventListener('brakett-signed-out', handleSignedOut);
    return () => window.removeEventListener('brakett-signed-out', handleSignedOut);
  }, [clerk]);

  useEffect(() => {
    if (!isLoaded || !isUserLoaded) {
      return;
    }

    if (!isSignedIn || !sessionId) {
      syncedSessionRef.current = null;

      if (getStoredAuthProvider() === 'clerk') {
        clearAuthSession();
      }

      return;
    }

    if (syncedSessionRef.current === sessionId || failedSessionRef.current === sessionId) {
      return;
    }

    let isCancelled = false;

    const syncSession = async () => {
      try {
        const clerkToken = await getToken();
        if (!clerkToken) {
          throw new Error('Clerk session token is missing.');
        }

        const workspaceName = user?.firstName ? `${user.firstName}'s Workspace` : undefined;
        const response = await fetch(`${getApiBaseUrl()}/auth/clerk/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${clerkToken}`,
          },
          credentials: 'include',
          body: JSON.stringify(workspaceName ? { workspaceName } : {}),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            typeof payload === 'object' && payload && 'message' in payload
              ? String((payload as { message: unknown }).message)
              : 'Unable to finish Google sign-in.';
          throw new Error(message);
        }

        if (!isCancelled) {
          persistAuthSession(payload);
          syncedSessionRef.current = sessionId;
          failedSessionRef.current = null;

          if (typeof pendo !== 'undefined') {
            pendo.track('google_sign_in_completed', {
              auth_method: 'google',
              workspace_name: workspaceName || '',
              is_new_user: Boolean(workspaceName),
            });
          }

          const redirectTarget = getClerkRedirectTarget();

          if (isClerkAuthHandoffRequest()) {
            clearClerkAuthHandoffRequest();
          }

          if (location.pathname !== redirectTarget) {
            navigate(redirectTarget, { replace: true });
          }
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        failedSessionRef.current = sessionId;
        if (isClerkAuthHandoffRequest()) {
          clearClerkAuthHandoffRequest();
        }
        clearAuthSession();
        window.dispatchEvent(new CustomEvent('show-brackett-alert', {
          detail: {
            title: SYNC_FAILURE_TITLE,
            message: error instanceof Error ? error.message : 'Unable to finish Google sign-in.',
          },
        }));
        window.dispatchEvent(new Event('show-auth-modal'));
      }
    };

    void syncSession();

    return () => {
      isCancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, isUserLoaded, location.pathname, navigate, sessionId, user?.firstName]);

  return null;
};
