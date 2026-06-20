import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { clearToken, getToken, setToken } from "@/lib/api";
import { login as loginApi, AdminProfile } from "@/services/admin";

interface AuthState {
  admin: AdminProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);
const ADMIN_KEY = "admin_profile";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_KEY);
    if (stored && getToken()) {
      try {
        setAdmin(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await loginApi(email, password);
      if (res.data?.token) {
        setToken(res.data.token);
        setAdmin(res.data.admin);
        localStorage.setItem(ADMIN_KEY, JSON.stringify(res.data.admin));
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(ADMIN_KEY);
    setAdmin(null);
  };

  const value = useMemo<AuthState>(
    () => ({ admin, isAuthenticated: !!admin && !!getToken(), loading, login, logout }),
    [admin, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
