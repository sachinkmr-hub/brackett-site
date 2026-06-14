import { beforeEach, describe, expect, it } from 'vitest';
import { applySpaPathRedirect, buildAppUrl, getAppBasePath } from './routing';

describe('routing helpers', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('restores GitHub Pages spa_path redirects into the intended app route', () => {
    window.history.replaceState({}, '', '/brackett/?spa_path=%2Faccept-invite%3Ftoken%3Dabc');

    applySpaPathRedirect();

    expect(window.location.pathname).toBe('/brackett/accept-invite');
    expect(window.location.search).toBe('?token=abc');
    expect(getAppBasePath()).toBe('/brackett');
  });

  it('builds app URLs with the inferred project base path', () => {
    window.history.replaceState({}, '', '/brackett/dashboard');

    const url = buildAppUrl('/dashboard');

    expect(url.pathname).toBe('/brackett/dashboard');
  });

  it('uses root paths on root-domain routes', () => {
    window.history.replaceState({}, '', '/accept-invite?token=abc');

    expect(getAppBasePath()).toBe('/');
    expect(buildAppUrl('/dashboard').pathname).toBe('/dashboard');
  });
});
