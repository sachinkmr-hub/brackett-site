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
