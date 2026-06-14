import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

const apiMocks = vi.hoisted(() => ({
  configureApi: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  configureApi: apiMocks.configureApi,
  getApiBaseUrl: () => 'http://localhost:4000',
  refreshAccessToken: apiMocks.refreshAccessToken,
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
    apiMocks.refreshAccessToken.mockReset();
  });

  it('does not let a stale refresh response clear a newly bridged Clerk session', async () => {
    const refresh = deferred<string | null>();
    apiMocks.refreshAccessToken.mockReturnValue(refresh.promise);

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
      refresh.resolve(null);
      await refresh.promise;
    });

    expect(screen.getByTestId('auth-state')).toHaveTextContent('signed-in');
  });
});
