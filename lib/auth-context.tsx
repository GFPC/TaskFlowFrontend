"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { auth, users, getTokens, setTokens, clearTokens, type User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  register: (data: {
    first_name: string;
    last_name: string;
    username: string;
    password: string;
    email?: string;
    tg_username?: string;
  }) => Promise<{ user_id: number; tg_code: string }>;
  verifyTelegram: (userId: number, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

type LoginResult =
  | { type: "success"; user: User }
  | { type: "verification_required"; user_id: number; tg_code: string };

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const tokens = getTokens();
      if (!tokens?.access_token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const me = await users.me();
      setUser(me);
    } catch {
      setUser(null);
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      const res = await auth.login({ username, password });

      if (res.requires_verification) {
        return {
          type: "verification_required",
          user_id: res.user_id!,
          tg_code: res.tg_code!,
        };
      }

      setTokens({
        access_token: res.access_token!,
        refresh_token: res.refresh_token!,
        expires_at: res.expires_at!,
      });

      const me = res.user || (await users.me());
      setUser(me);
      return { type: "success", user: me };
    },
    []
  );

  const register = useCallback(
    async (data: {
      first_name: string;
      last_name: string;
      username: string;
      password: string;
      email?: string;
      tg_username?: string;
    }) => {
      const res = await auth.register(data);
      return { user_id: res.user_id, tg_code: res.tg_code };
    },
    []
  );

  const verifyTelegram = useCallback(
    async (userId: number, code: string) => {
      const res = await auth.verifyTelegram({ user_id: userId, code });
      setTokens({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        expires_at: res.expires_at,
      });
      setUser(res.user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // ignore
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyTelegram,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
