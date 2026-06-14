import { describe, expect, it, beforeEach, vi } from 'vitest';
import { clearAuthSession, persistAuthSession, type AuthPayload } from './authSession';

describe('auth session persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('keeps access tokens out of localStorage and dispatches the auth payload', () => {
    const listener = vi.fn();
    window.addEventListener('brakett-authenticated', listener as EventListener);

    persistAuthSession({
      accessToken: 'secret-access-token',
      user: { authProvider: 'local' },
      workspace: { id: 'workspace-1' },
    });

    expect(localStorage.getItem('brakett_access_token')).toBeNull();
    expect(localStorage.getItem('brakett_auth_provider')).toBe('local');
    expect(localStorage.getItem('brakett_workspace_id')).toBe('workspace-1');
    expect(listener).toHaveBeenCalledTimes(1);

    const event = listener.mock.calls[0][0] as CustomEvent<AuthPayload>;
    expect(event.detail.accessToken).toBe('secret-access-token');

    window.removeEventListener('brakett-authenticated', listener as EventListener);
  });

  it('clears local session metadata and announces sign-out', () => {
    localStorage.setItem('brakett_auth_provider', 'clerk');
    localStorage.setItem('brakett_workspace_id', 'workspace-1');
    const listener = vi.fn();
    window.addEventListener('brakett-signed-out', listener as EventListener);

    clearAuthSession();

    expect(localStorage.getItem('brakett_auth_provider')).toBeNull();
    expect(localStorage.getItem('brakett_workspace_id')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener('brakett-signed-out', listener as EventListener);
  });
});
