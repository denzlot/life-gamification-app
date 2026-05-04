import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, ApiError } from "../api/http";
import type { AuthUser } from "../api/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
      return me;
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) {
        console.warn(err);
      }
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshMe().finally(() => setLoading(false));
  }, [refreshMe]);

  const login = useCallback(async (username: string, password: string) => {
    const logged = await api.auth.login({ username, password });
    setUser(logged);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    await api.auth.register({ username, password });
    const logged = await api.auth.login({ username, password });
    setUser(logged);
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => undefined);
    setUser(null);
    document.documentElement.setAttribute("data-hp-state", "normal");
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshMe }),
    [user, loading, login, register, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return context;
}
