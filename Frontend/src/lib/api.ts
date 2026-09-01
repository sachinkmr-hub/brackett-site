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

let refreshPromise: Promise<string | null> | null = null;

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

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4500);
      let response: Response;

      try {
        response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
        });
      } catch {
        return null;
      } finally {
        window.clearTimeout(timeout);
      }

      let payload: unknown;
      try {
        payload = await readPayload(response);
      } catch (error) {
        // A refresh that cannot be read is simply "no session"; callers handle that.
        console.warn('Unable to read the refresh response.', error);
        return null;
      }

      if (!response.ok || typeof payload !== 'object' || !payload || !('accessToken' in payload)) {
        return null;
      }

      const accessToken = String((payload as { accessToken: unknown }).accessToken || '');
      if (!accessToken) {
        return null;
      }

      handleTokenRefresh(accessToken);
      return accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
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
