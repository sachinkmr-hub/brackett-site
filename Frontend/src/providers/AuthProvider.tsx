import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { configureApi, getApiBaseUrl, refreshAccessToken } from '../lib/api';
import { LEGACY_ACCESS_TOKEN_KEY, clearAuthSession, type AuthPayload } from '../lib/authSession';
import { useModal } from './ModalProvider';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const tokenRef = useRef<string | null>(null);
  const { showAuthModal, showAlert } = useModal();

  const applyAccessToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    setIsAuthenticated(Boolean(token));
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  }, []);

  const applyAuthPayload = useCallback((payload: AuthPayload) => {
    if (payload.accessToken) {
      applyAccessToken(payload.accessToken);
    }
  }, [applyAccessToken]);

  useEffect(() => {
    let isMounted = true;

    configureApi(
      () => tokenRef.current,
      () => {
        applyAccessToken(null);
        showAlert('Session Expired', 'Your session is no longer active. Please sign in again.');
        showAuthModal('login');
      },
      (token) => {
        if (isMounted) {
          applyAccessToken(token);
        }
      }
    );

    const handleAuthenticated = (event: Event) => {
      applyAuthPayload((event as CustomEvent<AuthPayload>).detail || {});
    };

    const handleSignedOut = () => {
      applyAccessToken(null);
    };

    window.addEventListener('brakett-authenticated', handleAuthenticated);
    window.addEventListener('brakett-signed-out', handleSignedOut);

    // Migration: move legacy localStorage tokens into memory once, then delete them.
    const storedToken = localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
    if (storedToken) {
      applyAccessToken(storedToken);
      localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    }

    void refreshAccessToken().then((token) => {
      if (!token && !storedToken && isMounted && !tokenRef.current) {
        applyAccessToken(null);
      }
    }).catch(() => undefined).finally(() => {
      if (isMounted) setIsLoadingSession(false);
    });

    return () => {
      isMounted = false;
      window.removeEventListener('brakett-authenticated', handleAuthenticated);
      window.removeEventListener('brakett-signed-out', handleSignedOut);
    };
  }, [applyAccessToken, applyAuthPayload, showAuthModal, showAlert]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${getApiBaseUrl()}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Local sign-out must still complete if the backend is unreachable.
    } finally {
      clearAuthSession();
      applyAccessToken(null);
    }
  }, [applyAccessToken]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoadingSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
