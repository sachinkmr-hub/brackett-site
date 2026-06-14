import { beforeEach, describe, expect, it } from 'vitest';
import {
  getClerkBridgeUrl,
  getClerkCallbackUrl,
  getClerkRedirectTarget,
  isClerkBridgeRequest,
  isClerkCallbackRequest,
} from './clerk';

describe('clerk redirect helpers', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('builds separate OAuth callback and app bridge URLs', () => {
    const callbackUrl = new URL(getClerkCallbackUrl());
    const bridgeUrl = new URL(getClerkBridgeUrl('/dashboard'));

    expect(callbackUrl.pathname).toBe('/');
    expect(callbackUrl.searchParams.get('clerk_callback')).toBe('1');
    expect(callbackUrl.searchParams.get('clerk_bridge')).toBeNull();

    expect(bridgeUrl.pathname).toBe('/');
    expect(bridgeUrl.searchParams.get('clerk_bridge')).toBe('1');
    expect(bridgeUrl.searchParams.get('redirect_to')).toBe('/dashboard');
  });

  it('detects bridge requests and defaults unsafe targets to the dashboard', () => {
    window.history.replaceState({}, '', '/?clerk_bridge=1&redirect_to=https%3A%2F%2Fevil.test');

    expect(isClerkBridgeRequest()).toBe(true);
    expect(isClerkCallbackRequest()).toBe(false);
    expect(getClerkRedirectTarget()).toBe('/dashboard');
  });
});
