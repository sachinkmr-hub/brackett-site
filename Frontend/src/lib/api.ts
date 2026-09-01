import { clearAuthSession } from './authSession';

const LOCAL_API_BASE_URL = '/api';
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (!configuredApiBaseUrl && import.meta.env.PROD) {
  console.warn(
    'VITE_API_BASE_URL is not configured for production. Falling back to /api, which only works when the host proxies /api to the backend (see vercel.json).'
  );
}

// A trailing slash would produce request paths like `https://api.example.com//auth/login`.
const API_BASE_URL = (configuredApiBaseUrl || LOCAL_API_BASE_URL).replace(/\/+$/, '');

// A single-page-app host that rewrites every unmatched path to index.html answers
// API calls with the app shell and a 200, which otherwise looks like a successful
// but empty response. Name that failure instead of letting it pass silently.
export const API_HTML_RESPONSE_MESSAGE =
  `The brackett API at "${API_BASE_URL}" returned a web page instead of JSON. ` +
  'Set VITE_API_BASE_URL to the backend URL (or proxy /api to the backend) and redeploy.';

type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export const getApiBaseUrl = () => API_BASE_URL;

let getAccessToken: () => string | null = () => null;
let handleAuthFailure: () => void = () => {
  window.dispatchEvent(new Event('show-auth-modal')); // fallback
};
let handleTokenRefresh: (accessToken: string) => void = () => undefined;

export const configureApi = (
  tokenGetter: () => string | null,
  authFailureHandler: () => void,
  tokenRefreshHandler: (accessToken: string) => void = () => undefined
) => {
  getAccessToken = tokenGetter;
  handleAuthFailure = authFailureHandler;
  handleTokenRefresh = tokenRefreshHandler;
};

// The backend runs on a Render free plan, which sleeps after ~15 minutes idle.
// The request that wakes it can take the better part of a minute, so a refresh
// that times out means "server asleep", not "no session" — the two need to be
// told apart or every returning visitor gets signed out by a cold start.
const REFRESH_TIMEOUT_MS = 8000;
export const COLD_START_TIMEOUT_MS = 75000;

export type RefreshOutcome =
  | { status: 'authenticated'; accessToken: string }
  | { status: 'unauthenticated' }
  | { status: 'unreachable' };

let refreshPromise: Promise<RefreshOutcome> | null = null;

export const readPayload = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }

  const body = await response.text();
  if (contentType.includes('text/html') || /^\s*<(!doctype|html)/i.test(body)) {
    throw new Error(API_HTML_RESPONSE_MESSAGE);
  }

  return body;
};

export const refreshSession = async (timeoutMs = REFRESH_TIMEOUT_MS): Promise<RefreshOutcome> => {
  if (!refreshPromise) {
    refreshPromise = (async (): Promise<RefreshOutcome> => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;

      try {
        response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
        });
      } catch {
        // Aborted or network failure — the server may just be waking up.
        return { status: 'unreachable' };
      } finally {
        window.clearTimeout(timeout);
      }

      let payload: unknown;
      try {
        payload = await readPayload(response);
      } catch (error) {
        // A refresh that cannot be read is simply "no session"; callers handle that.
        console.warn('Unable to read the refresh response.', error);
        return { status: 'unauthenticated' };
      }

      if (!response.ok || typeof payload !== 'object' || !payload || !('accessToken' in payload)) {
        return { status: 'unauthenticated' };
      }

      const accessToken = String((payload as { accessToken: unknown }).accessToken || '');
      if (!accessToken) {
        return { status: 'unauthenticated' };
      }

      handleTokenRefresh(accessToken);
      return { status: 'authenticated', accessToken };
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

export const refreshAccessToken = async (timeoutMs?: number) => {
  const outcome = await refreshSession(timeoutMs);
  return outcome.status === 'authenticated' ? outcome.accessToken : null;
};

export const apiFetch = async (path: string, options: ApiRequestOptions = {}): Promise<Response> => {
  const sendRequest = async (accessTokenOverride?: string | null) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    if (!options.skipAuth) {
      const accessToken = accessTokenOverride || getAccessToken();
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      cache: options.cache ?? 'no-store',
      headers,
      credentials: 'include',
    });

    return response;
  };

  let response = await sendRequest();
  if (!response.ok) {
    if (!options.skipAuth && response.status === 401) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        response = await sendRequest(refreshedToken);
        if (response.ok) {
          return response;
        }
      }

      clearAuthSession();
      handleAuthFailure();
      throw new Error('Your session is no longer active. Please sign in again.');
    }

    const payload = await readPayload(response);
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : response.statusText;

    throw new Error(message || 'Request failed');
  }

  return response;
};

export const apiRequest = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const response = await apiFetch(path, options);
  const payload = await readPayload(response);
  return payload as T;
};
