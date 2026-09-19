"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import { getCurrentUser, type CurrentUser } from "@/lib/api/auth";

type AuthContextValue = {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  user: CurrentUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadApplicationUser = useCallback(async (currentSession?: Session | null) => {
    const activeSession =
      currentSession ?? (await supabase.auth.getSession()).data.session;

    if (!activeSession?.access_token) {
      setUser(null);
      return;
    }

    try {
      const current = await getCurrentUser();
      setUser(current);
    } catch (error) {
      console.error("Failed to load application user:", error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(initialSession);

      if (initialSession) {
        await loadApplicationUser(initialSession);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);

      if (!nextSession) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      await loadApplicationUser(nextSession);

      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadApplicationUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      supabaseUser: session?.user ?? null,
      user,
      loading,
      signOut,
      refreshUser: loadApplicationUser,
    }),
    [session, user, loading, signOut, loadApplicationUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}