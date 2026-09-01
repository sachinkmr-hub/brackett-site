import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

const apiMocks = vi.hoisted(() => ({
  configureApi: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  COLD_START_TIMEOUT_MS: 75000,
  configureApi: apiMocks.configureApi,
  getApiBaseUrl: () => 'http://localhost:4000',
  refreshSession: apiMocks.refreshSession,
}));

vi.mock('./ModalProvider', () => ({
  useModal: () => ({
    showAlert: vi.fn(),
    showAuthModal: vi.fn(),
  }),
}));

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
};

const AuthProbe = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      <span data-testid="auth-state">{isAuthenticated ? 'signed-in' : 'signed-out'}</span>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    apiMocks.configureApi.mockReset();
    apiMocks.refreshSession.mockReset();
  });

  it('does not let a stale refresh response clear a newly bridged Clerk session', async () => {
    const refresh = deferred<{ status: string }>();
    apiMocks.refreshSession.mockReturnValue(refresh.promise);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent('brakett-authenticated', {
        detail: { accessToken: 'clerk-session-token' },
      }));
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('signed-in');

    await act(async () => {
      refresh.resolve({ status: 'unauthenticated' });
      await refresh.promise;
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('signed-in');
  });

  it('keeps waiting on a sleeping backend instead of signing the visitor out', async () => {
    const coldStart = deferred<{ status: string; accessToken?: string }>();
    apiMocks.refreshSession.mockImplementation(async (timeoutMs?: number) =>
      timeoutMs === 75000 ? coldStart.promise : { status: 'unreachable' }
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    // The short attempt timed out, so a longer retry is in flight rather than
    // the session being dropped.
    await act(async () => {});
    expect(apiMocks.refreshSession).toHaveBeenCalledWith(75000);

    await act(async () => {
      coldStart.resolve({ status: 'authenticated', accessToken: 'woken-token' });
      await coldStart.promise;
    });

    // configureApi's refresh handler is what applies the token in the real app;
    // here the point is that the session was never discarded mid cold start.
    // configureApi overwrites its handlers on each registration, so the live
    // one is the most recent call's.
    const refreshHandler = apiMocks.configureApi.mock.calls.at(-1)![2] as (token: string) => void;
    await act(async () => {
      refreshHandler('woken-token');
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('signed-in');
  });
});
