'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// TODO: XSS 방지를 위해 HttpOnly 쿠키 기반 JWT 저장 고려 (현재 localStorage)
const TOKEN_KEY = 'stockai_token';
const USER_KEY = 'stockai_user';

export interface AuthUser {
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPortfolio: boolean | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setHasPortfolio: (v: boolean) => void;
}

function parseJwt(token: string): { sub?: string; name?: string; email?: string; exp?: number } | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(binary);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadInitialAuth(): { token: string | null; user: AuthUser | null } {
  if (typeof window === 'undefined') return { token: null, user: null };
  const storedToken = localStorage.getItem(TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedToken || !storedUser) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, user: null };
  }

  try {
    const decoded = parseJwt(storedToken);
    if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return { token: null, user: null };
    }
    return { token: storedToken, user: JSON.parse(storedUser) as AuthUser };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, user: null };
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const isAuthenticated = !!token;
  const [isLoading, setIsLoading] = useState(true);
  const [hasPortfolio, setHasPortfolio] = useState<boolean | null>(null);

  const setAuth = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setHasPortfolio(null);
  }, []);

  useEffect(() => {
    const initial = loadInitialAuth();
    if (initial.token) {
      setTimeout(() => {
        setToken(initial.token);
        setUser(initial.user);
        setIsLoading(false);
      }, 0);
    } else {
      setTimeout(() => {
        setIsLoading(false);
      }, 0);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, hasPortfolio, setAuth, clearAuth, setHasPortfolio }}>
      {children}
    </AuthContext.Provider>
  );
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}