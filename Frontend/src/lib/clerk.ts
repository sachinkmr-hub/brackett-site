import { buildAppUrl, getCurrentAppSearchParams } from './routing';

const CLERK_PUBLISHABLE_PLACEHOLDER = 'pk_test_replace_me';
const DEFAULT_CLERK_REDIRECT_TARGET = '/dashboard';

export const getClerkPublishableKey = () => import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export const isClerkFrontendConfigured = () => {
  const key = getClerkPublishableKey();
  return Boolean(key && key !== CLERK_PUBLISHABLE_PLACEHOLDER);
};

export const getClerkCallbackUrl = () => {
  const url = buildAppUrl('/');
  url.searchParams.set('clerk_callback', '1');
  return url.toString();
};

export const getClerkBridgeUrl = (redirectTo = DEFAULT_CLERK_REDIRECT_TARGET) => {
  const url = buildAppUrl('/');
  url.searchParams.set('clerk_bridge', '1');
  url.searchParams.set('redirect_to', redirectTo);
  return url.toString();
};

export const isClerkCallbackRequest = () => {
  const params = getCurrentAppSearchParams();
  return params.get('clerk_callback') === '1';
};

export const isClerkBridgeRequest = () => {
  const params = getCurrentAppSearchParams();
  return params.get('clerk_bridge') === '1';
};

export const getClerkRedirectTarget = () => {
  const params = getCurrentAppSearchParams();
  const redirectTo = params.get('redirect_to');

  if (!redirectTo || !redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
    return DEFAULT_CLERK_REDIRECT_TARGET;
  }

  return redirectTo;
};

export const isClerkAuthHandoffRequest = () => isClerkCallbackRequest() || isClerkBridgeRequest();

export const clearClerkAuthHandoffRequest = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('clerk_callback');
  url.searchParams.delete('clerk_bridge');
  url.searchParams.delete('redirect_to');
  const nextSearch = url.searchParams.toString();
  const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
  window.history.replaceState({}, '', nextUrl);
};
