export type AuthPayload = {
  accessToken?: string;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    authProvider?: string;
  } | null;
  workspace?: {
    id?: string;
    name?: string;
    slug?: string;
    role?: string;
  } | null;
};

// Legacy key names are intentionally misspelled for compatibility with existing sessions.
export const LEGACY_ACCESS_TOKEN_KEY = 'brakett_access_token';
export const LEGACY_WORKSPACE_ID_KEY = 'brakett_workspace_id';
export const LEGACY_AUTH_PROVIDER_KEY = 'brakett_auth_provider';

export const persistAuthSession = (payload: AuthPayload) => {
  if (payload.user?.authProvider) {
    localStorage.setItem(LEGACY_AUTH_PROVIDER_KEY, payload.user.authProvider);
  } else if (payload.accessToken) {
    localStorage.setItem(LEGACY_AUTH_PROVIDER_KEY, 'local');
  }

  if (payload.workspace?.id) {
    localStorage.setItem(LEGACY_WORKSPACE_ID_KEY, payload.workspace.id);
  }

  if (payload.user?.id) {
    pendo.identify({
      visitor: {
        id: payload.user.id,
        email: payload.user.email,
        full_name: payload.user.name,
        authProvider: payload.user.authProvider,
        workspaceRole: payload.workspace?.role,
      },
      account: {
        id: payload.workspace?.id,
        name: payload.workspace?.name,
        slug: payload.workspace?.slug,
      },
    });
  }

  window.dispatchEvent(new CustomEvent('brakett-authenticated', { detail: payload }));
};

export const clearAuthSession = () => {
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_WORKSPACE_ID_KEY);
  localStorage.removeItem(LEGACY_AUTH_PROVIDER_KEY);
  pendo.clearSession();
  window.dispatchEvent(new CustomEvent('brakett-signed-out'));
};

export const getStoredAuthProvider = () => localStorage.getItem(LEGACY_AUTH_PROVIDER_KEY);
