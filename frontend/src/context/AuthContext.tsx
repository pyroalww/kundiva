import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiClient } from '../api/client';
import { configureClientAuth } from '../api/client';
import type { AuthUser } from '../types';

type AuthPayload = {
  token: string;
  user: AuthUser;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (payload: AuthPayload, remember?: boolean) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => { },
  logout: () => { }
});

const STORAGE_KEY = 'kundiva_auth';

const readStorage = (): AuthPayload | null => {
  const raw =
    localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthPayload;
  } catch {
    return null;
  }
};

const writeStorage = (payload: AuthPayload, persistent: boolean) => {
  const target = persistent ? localStorage : sessionStorage;
  const other = persistent ? sessionStorage : localStorage;
  other.removeItem(STORAGE_KEY);
  target.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const clearStorage = () => {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((token: string | null) => {
    configureClientAuth(token);
  }, []);

  // On mount, read stored auth and verify with the backend
  useEffect(() => {
    const init = async () => {
      const stored = readStorage();
      if (!stored) {
        setLoading(false);
        return;
      }

      applyToken(stored.token);

      try {
        // Verify the token and get fresh user data from backend
        const { data } = await apiClient.get<AuthUser>('/auth/me');
        const freshUser = { ...stored.user, ...data };
        setUser(freshUser);

        // Update storage with fresh user data
        const persistent = !!localStorage.getItem(STORAGE_KEY);
        writeStorage({ token: stored.token, user: freshUser }, persistent);
      } catch {
        // Token is invalid/expired, clear everything
        applyToken(null);
        clearStorage();
        setUser(null);
      }

      setLoading(false);
    };

    void init();
  }, [applyToken]);

  const login = useCallback(
    (payload: AuthPayload, remember = true) => {
      applyToken(payload.token);
      writeStorage(payload, remember);
      setUser(payload.user);
    },
    [applyToken]
  );

  const logout = useCallback(() => {
    applyToken(null);
    clearStorage();
    setUser(null);
  }, [applyToken]);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
