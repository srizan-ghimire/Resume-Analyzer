import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { ApiError, tokenStore } from "@/api/client";
import { auth } from "@/api/endpoints";
import type { User } from "@/api/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRecruiter: boolean;
  isSeeker: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (payload: Parameters<typeof auth.register>[0]) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within <AuthProvider>");
  return context;
}

/**
 * Holds the session.
 *
 * No credential is ever persisted. The refresh token is the only thing in
 * localStorage; the access token lives in memory and is restored by exchanging
 * the refresh token on mount.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const queryClient = useQueryClient();

  const clearSession = React.useCallback(() => {
    tokenStore.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Refresh failure anywhere in the app resets the session here.
  React.useEffect(() => {
    tokenStore.onAuthLost(() => {
      setUser(null);
      queryClient.clear();
    });
  }, [queryClient]);

  // Restore the session on load.
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!tokenStore.refresh) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        // Any authenticated call triggers the client's refresh-and-retry.
        const me = await auth.me();
        if (!cancelled) setUser(me);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) tokenStore.clear();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      isRecruiter: user?.role === "RECRUITER",
      isSeeker: user?.role === "SEEKER",

      async login(username, password) {
        const tokens = await auth.login({ username, password });
        tokenStore.set(tokens);
        setUser(tokens.user);
        return tokens.user;
      },

      async register(payload) {
        const tokens = await auth.register(payload);
        tokenStore.set(tokens);
        setUser(tokens.user);
        return tokens.user;
      },

      async logout() {
        const refresh = tokenStore.refresh;
        if (refresh) {
          // Best effort: the local session is cleared regardless.
          await auth.logout(refresh).catch(() => undefined);
        }
        clearSession();
      },

      async refreshUser() {
        setUser(await auth.me());
      },
    }),
    [user, isLoading, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
