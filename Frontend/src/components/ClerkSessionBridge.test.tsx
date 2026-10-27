import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ClerkSessionBridge } from './ClerkSessionBridge';
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), persist: vi.fn(), clear: vi.fn(), getToken: vi.fn(async () => 'clerk-token'), clerk: { session: null } }));
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, sessionId: 'session-1', getToken: mocks.getToken }),
  useUser: () => ({ isLoaded: true, user: { firstName: 'Test' } }),
  useClerk: () => mocks.clerk,
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate, useLocation: () => ({ pathname: '/' }) }));
vi.mock('../lib/authSession', () => ({ persistAuthSession: mocks.persist, clearAuthSession: mocks.clear, getStoredAuthProvider: () => null }));
vi.mock('../lib/clerk', () => ({ clearClerkAuthHandoffRequest: vi.fn(), getClerkRedirectTarget: () => '/dashboard', isClerkAuthHandoffRequest: () => true }));
beforeEach(() => { vi.clearAllMocks(); });
it('leaves the handoff spinner through router navigation when the exchange fails', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Service unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } })));
  render(<ClerkSessionBridge />);
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true }));
  expect(mocks.persist).not.toHaveBeenCalled();
});
it('persists the application session before navigating to the dashboard', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ accessToken: 'app-token' }), { headers: { 'content-type': 'application/json' } })));
  render(<ClerkSessionBridge />);
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
  expect(mocks.persist).toHaveBeenCalledWith({ accessToken: 'app-token' });
  expect(mocks.persist.mock.invocationCallOrder[0]).toBeLessThan(mocks.navigate.mock.invocationCallOrder[0]);
});
