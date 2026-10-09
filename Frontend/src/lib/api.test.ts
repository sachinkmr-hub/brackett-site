import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, configureApi, refreshSession } from './api';

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

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it.each([429, 500, 502, 503, 504])('preserves the session when refresh returns HTTP %s', async (status) => {
    const onAuthFailure = vi.fn();
    configureApi(() => 'expired-token', onAuthFailure);
    localStorage.setItem('brakett_workspace_id', 'workspace-1');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({}, { status })));

    await expect(apiFetch('/workspaces')).rejects.toThrow(/temporarily unavailable/i);
    expect(localStorage.getItem('brakett_workspace_id')).toBe('workspace-1');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('preserves the session on a network failure during refresh', async () => {
    const onAuthFailure = vi.fn();
    configureApi(() => 'expired-token', onAuthFailure);
    localStorage.setItem('brakett_workspace_id', 'workspace-1');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch')));

    await expect(apiFetch('/workspaces')).rejects.toThrow(/temporarily unavailable/i);
    expect(localStorage.getItem('brakett_workspace_id')).toBe('workspace-1');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('preserves the session when the refresh request times out', async () => {
    vi.useFakeTimers();
    const onAuthFailure = vi.fn();
    configureApi(() => 'expired-token', onAuthFailure);
    localStorage.setItem('brakett_workspace_id', 'workspace-1');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 }))
      .mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      })));

    const result = apiFetch('/workspaces').catch((error: Error) => error);
    await vi.advanceTimersByTimeAsync(8000);
    expect(await result).toEqual(expect.objectContaining({ message: expect.stringMatching(/temporarily unavailable/i) }));
    expect(localStorage.getItem('brakett_workspace_id')).toBe('workspace-1');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it.each([
    ['HTML', () => new Response('<html>Gateway unavailable</html>', { headers: { 'Content-Type': 'text/html' } })],
    ['invalid JSON', () => new Response('{', { headers: { 'Content-Type': 'application/json' } })],
    ['missing token', () => jsonResponse({})],
    ['non-string token', () => jsonResponse({ accessToken: {} })],
  ])('does not mistake a %s refresh response for rejected credentials', async (_name, response) => {
    const onTokenRefresh = vi.fn();
    configureApi(() => null, vi.fn(), onTokenRefresh);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response()));

    await expect(refreshSession()).resolves.toEqual({ status: 'unreachable' });
    expect(onTokenRefresh).not.toHaveBeenCalled();
  });

  it.each([403, 500, 503])('does not log out when the retried resource returns HTTP %s', async (status) => {
    const onAuthFailure = vi.fn();
    configureApi(() => 'expired-token', onAuthFailure);
    localStorage.setItem('brakett_workspace_id', 'workspace-1');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'fresh-token' }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Resource unavailable' }, { status })));

    await expect(apiFetch('/workspaces')).rejects.toThrow('Resource unavailable');
    expect(localStorage.getItem('brakett_workspace_id')).toBe('workspace-1');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('logs out when the resource rejects the refreshed token too', async () => {
    const onAuthFailure = vi.fn();
    configureApi(() => 'expired-token', onAuthFailure);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'fresh-token' }))
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 })));

    await expect(apiFetch('/workspaces')).rejects.toThrow('Your session is no longer active');
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
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
