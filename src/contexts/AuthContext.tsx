import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getAuthToken, setAuthToken, removeAuthToken } from "@/services/api";

interface User {
  user_id: string;
  username: string;
  email: string;
  email_verified: number | boolean;
  full_name?: string;
  phone_number?: string;
  country_code?: string;
  country?: string;
  currency?: string;
  has_wallet_pin?: boolean;
  avatar?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  refreshUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "sendcash_auth";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      const storedToken = getAuthToken();
      if (stored && storedToken) {
        const authData = JSON.parse(stored);
        setIsLoggedIn(true);
        setUser(authData.user);
        setToken(storedToken);
      }
    } catch (error) {
      console.error("Error loading auth state:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: User, authToken: string) => {
    setIsLoggedIn(true);
    setUser(userData);
    setToken(authToken);
    setAuthToken(authToken);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: userData }));
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setToken(null);
    removeAuthToken();
    // Clear all localStorage (cache)
    localStorage.clear();
    // Clear sessionStorage as well
    sessionStorage.clear();
  };

  const refreshUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: userData }));
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, user, token, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
