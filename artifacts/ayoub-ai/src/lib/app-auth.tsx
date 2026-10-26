import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppUser = {
  openId: string;
  name: string | null;
  email: string | null;
  role: "admin" | "member";
};

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: string; message?: string };
    return body.error || body.message || `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (response.status === 401) {
        setUser(null);
        return;
      }
      if (!response.ok) throw new Error(await readError(response));
      const result = await response.json() as { user?: AppUser | null };
      setUser(result.user ?? null);
    } catch (cause) {
      setUser(null);
      setError(cause instanceof Error ? cause.message : "Could not check your sign-in status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-App-Request": "1" },
      body: JSON.stringify({ origin: window.location.origin }),
    });
    if (!response.ok) throw new Error(await readError(response));
    const result = await response.json() as { authorizationUrl?: string; url?: string };
    const authorizationUrl = result.authorizationUrl || result.url;
    if (!authorizationUrl) throw new Error("The sign-in service did not return an authorization URL.");
    window.location.assign(authorizationUrl);
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-App-Request": "1" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(await readError(response));
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, error, refresh, login, logout }), [user, loading, error, refresh, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAppAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAppAuth must be used inside AuthProvider.");
  return context;
}
