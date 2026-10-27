import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, configureApi } from './api';

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

describe('api client auth refresh', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores refreshed access tokens in the configured token refresh handler', async () => {
    let currentToken = 'expired-token';
    const onAuthFailure = vi.fn();

    configureApi(
      () => currentToken,
      onAuthFailure,
      (token) => {
        currentToken = token;
      },
    );

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'fresh-token' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    vi.stubGlobal('fetch', fetchMock);

    const response = await apiFetch('/workspaces');

    expect(response.ok).toBe(true);
    expect(currentToken).toBe('fresh-token');
    expect(onAuthFailure).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const retryOptions = fetchMock.mock.calls[2][1] as RequestInit;
    const retryHeaders = retryOptions.headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer fresh-token');
  });

  it('clears auth and calls the failure handler when refresh is rejected', async () => {
    configureApi(() => 'expired-token', vi.fn(), () => undefined);
    localStorage.setItem('brakett_workspace_id', 'workspace-1');
    const onAuthFailure = vi.fn();
    configureApi(() => 'expired-token', onAuthFailure, () => undefined);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ message: 'refresh expired' }, { status: 401 }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/workspaces')).rejects.toThrow('Your session is no longer active');
    expect(localStorage.getItem('brakett_workspace_id')).toBeNull();
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });
});

describe('session resilience', () => {
  it('preserves the current session when the refresh service is unavailable', async () => {
    const onAuthFailure = vi.fn();
    configureApi(() => 'existing-token', onAuthFailure);
    localStorage.setItem('brakett_workspace_id', 'workspace-1');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ message: 'database unavailable' }, { status: 503 })));
    await expect(apiFetch('/workspaces')).rejects.toThrow('could not refresh');
    expect(localStorage.getItem('brakett_workspace_id')).toBe('workspace-1');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });
  it('preserves a valid refreshed session when a retried request returns 403', async () => {
    let token = 'expired';
    const onAuthFailure = vi.fn();
    configureApi(() => token, onAuthFailure, next => { token = next; });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'new-token' }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Access denied' }, { status: 403 })));
    await expect(apiFetch('/workspaces')).rejects.toThrow('Access denied');
    expect(token).toBe('new-token');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });
  it('does not overwrite a newer sign-in with an older refresh response', async () => {
    let token: string | null = null;
    let resolveFetch!: (response: Response) => void;
    const pending = new Promise<Response>(resolve => { resolveFetch = resolve; });
    const onRefresh = vi.fn((next: string) => { token = next; });
    configureApi(() => token, vi.fn(), onRefresh);
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending));
    const { refreshSession } = await import('./api');
    const refresh = refreshSession();
    token = 'new-login';
    window.dispatchEvent(new Event('brakett-authenticated'));
    resolveFetch(jsonResponse({ accessToken: 'old-refresh' }));
    await expect(refresh).resolves.toEqual({ status: 'authenticated', accessToken: 'new-login' });
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
