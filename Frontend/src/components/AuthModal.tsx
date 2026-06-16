import React, { useEffect, useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrackettLogo } from './BrackettLogo';
import { COLORS } from '../theme/tokens';
import { persistAuthSession } from '../lib/authSession';
import { getApiBaseUrl } from '../lib/api';
import { getClerkBridgeUrl, getClerkCallbackUrl, isClerkFrontendConfigured } from '../lib/clerk';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

type AuthStatus = { type: 'success' | 'error' | 'info'; message: string } | null;

const AUTH_REQUEST_TIMEOUT_MS = 15000;

const fetchWithTimeout = async (url: string, options: RequestInit) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill={COLORS.social.googleBlue}/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill={COLORS.social.googleGreen}/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill={COLORS.social.googleYellow}/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill={COLORS.social.googleRed}/>
  </svg>
);

const ClerkGoogleButton: React.FC<{
  disabled: boolean;
  isLoading: boolean;
  onLoadingChange: (value: boolean) => void;
  onStatus: (value: AuthStatus) => void;
}> = ({ disabled, isLoading, onLoadingChange, onStatus }) => {
  const { isLoaded, signIn } = useSignIn();

  const handleClick = async () => {
    if (!isLoaded || !signIn) {
      onStatus({
        type: 'info',
        message: 'Google sign-in is still warming up. Try again in a second.',
      });
      return;
    }

    onStatus(null);
    onLoadingChange(true);

    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: getClerkCallbackUrl(),
        redirectUrlComplete: getClerkBridgeUrl('/dashboard'),
      });
    } catch (error) {
      onStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to open Google sign-in.',
      });
      onLoadingChange(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-950 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-70"
    >
      <GoogleIcon />
      {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
    </button>
  );
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');
  const [workspaceName, setWorkspaceName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<AuthStatus>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();
  const isClerkPublishableConfigured = isClerkFrontendConfigured();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setIsLogin(initialMode !== 'signup');
    setStatus(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const setFriendlyAuthStatus = (responseStatus: number | undefined, message: string) => {
    const normalized = message.toLowerCase();
    const looksLikeMissingUser =
      responseStatus === 404 ||
      responseStatus === 401 ||
      normalized.includes('invalid credentials') ||
      normalized.includes('user not found') ||
      normalized.includes("couldn't find") ||
      normalized.includes('could not find') ||
      normalized.includes('no account') ||
      normalized.includes('password is not provisioned');

    setStatus({
      type: looksLikeMissingUser || isLogin ? 'info' : 'error',
      message: looksLikeMissingUser
        ? "We couldn't find a matching account yet. Try signing up to create your workspace."
        : message,
    });
  };

  const getNetworkAuthMessage = (error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'brackett API did not respond in time. Check that the backend is running, then try again.';
    }

    return error instanceof Error && error.message
      ? `Unable to reach brackett API: ${error.message}`
      : 'Unable to reach brackett API. Check that the backend is running, then try again.';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const response = await fetchWithTimeout(`${apiBaseUrl}/auth/${isLogin ? 'login' : 'signup'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          isLogin
            ? { email, password }
            : { email, password, name, workspaceName }
        ),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFriendlyAuthStatus(
          response.status,
          typeof payload === 'object' && payload && 'message' in payload
            ? String((payload as { message: unknown }).message)
            : 'Authentication failed'
        );
        return;
      }

      persistAuthSession(payload);
      setStatus({
        type: 'success',
        message: payload.message || (isLogin ? 'Signed in successfully.' : 'Workspace created successfully.'),
      });

      if (payload.accessToken) {
        setTimeout(() => {
          onClose();
          // Use client-side navigation to preserve the React tree and in-memory
          // accessToken. window.location.assign() causes a full page reload,
          // wiping the token before AuthProvider can use it.
          navigate('/dashboard');
        }, 700);
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: getNetworkAuthMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleInfo = () => {
    setStatus({
      type: 'info',
      message: 'Google sign-in is unavailable right now. Use email to continue.',
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/45 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.1 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          className="relative w-full max-w-md overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20"
        >
          <button
            onClick={onClose}
            aria-label="Close sign-in dialog"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-950"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="p-8 sm:p-10">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-4">
                <BrackettLogo size={32} color={COLORS.logo.dark} />
              </div>
              <h2 id="auth-modal-title" className="mb-2 font-sans text-2xl font-bold text-zinc-950">
                {isLogin ? 'Welcome back' : 'Create your workspace'}
              </h2>
              <p className="text-sm text-zinc-500">
                {isLogin
                  ? 'Sign in to your team context.'
                  : 'Start with a private workspace.'}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {isClerkPublishableConfigured ? (
                <ClerkGoogleButton
                  disabled={isGoogleLoading || isSubmitting}
                  isLoading={isGoogleLoading}
                  onLoadingChange={setIsGoogleLoading}
                  onStatus={setStatus}
                />
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <button
                    type="button"
                    onClick={handleGoogleInfo}
                    disabled
                    className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-500 opacity-70 shadow-sm"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>
                  <p className="mt-2 text-xs text-zinc-500">
                    Google sign-in is unavailable right now.
                  </p>
                </div>
              )}
            </div>

            <div className="relative flex items-center mb-6">
              <div className="flex-grow border-t border-zinc-200"></div>
              <span className="mx-4 flex-shrink-0 text-xs font-medium uppercase tracking-widest text-zinc-400">
                or
              </span>
              <div className="flex-grow border-t border-zinc-200"></div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div>
                    <label htmlFor="auth-name" className="mb-1.5 ml-1 block text-xs font-semibold text-zinc-700">Your name</label>
                    <input
                      id="auth-name"
                      type="text"
                      placeholder="Jane Cooper"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required={!isLogin}
                      minLength={2}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-zinc-950"
                    />
                  </div>
                  <div>
                    <label htmlFor="auth-workspace-name" className="mb-1.5 ml-1 block text-xs font-semibold text-zinc-700">Workspace name</label>
                    <input
                      id="auth-workspace-name"
                      type="text"
                      placeholder="Acme Corp"
                      value={workspaceName}
                      onChange={(event) => setWorkspaceName(event.target.value)}
                      required={!isLogin}
                      minLength={2}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-zinc-950"
                    />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="auth-email" className="mb-1.5 ml-1 block text-xs font-semibold text-zinc-700">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-zinc-950"
                />
              </div>
              <div>
                <label htmlFor="auth-password" className="mb-1.5 ml-1 block text-xs font-semibold text-zinc-700">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm transition-shadow focus:border-transparent focus:outline-none focus:ring-2 focus:ring-zinc-950"
                />
              </div>

              {status && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm ${
                    status.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : status.type === 'info'
                        ? 'bg-zinc-50 text-zinc-700 border border-zinc-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {status.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-lg bg-zinc-950 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-70 disabled:hover:bg-zinc-950"
              >
                {isSubmitting ? (isLogin ? 'Signing in...' : 'Creating workspace...') : isLogin ? 'Sign in' : 'Create workspace'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setStatus(null);
                }}
                className="text-sm font-medium text-zinc-700 hover:text-zinc-950 hover:underline focus:outline-none"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
