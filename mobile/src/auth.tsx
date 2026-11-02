import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, setUnauthorizedHandler, type Me } from "./api";
import { clearToken, getToken, setToken } from "./storage";

type AuthState = {
  ready: boolean;
  token: string | null;
  me: Me | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<Me | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTok] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  const dropSession = useCallback(async () => {
    await clearToken();
    setTok(null);
    setMe(null);
  }, []);

  const loadMe = useCallback(
    async (t: string) => {
      try {
        const m = await api.me(t);
        setMe(m);
        return m;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await dropSession();
        throw e;
      }
    },
    [dropSession],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void dropSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [dropSession]);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) {
        setTok(t);
        try {
          await loadMe(t);
        } catch {
          // Offline or server down: keep the token, screens will show their own errors.
        }
      }
      setReady(true);
    })();
  }, [loadMe]);

  const signIn = useCallback(
    async (t: string) => {
      await setToken(t);
      await loadMe(t);
      setTok(t);
    },
    [loadMe],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // token may already be invalid; clear locally regardless
    }
    await dropSession();
  }, [dropSession]);

  const refreshMe = useCallback(async () => {
    if (!token) return null;
    try {
      return await loadMe(token);
    } catch {
      return null;
    }
  }, [token, loadMe]);

  const value = useMemo(() => ({ ready, token, me, signIn, signOut, refreshMe }), [ready, token, me, signIn, signOut, refreshMe]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
