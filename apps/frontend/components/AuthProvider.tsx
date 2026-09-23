"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  const cachedUserRef = useRef<CurrentUser | null>(null);
  const inFlightPromiseRef = useRef<Promise<CurrentUser | null> | null>(null);
  const lastFetchedTokenRef = useRef<string | null>(null);

  const loadApplicationUser = useCallback(async (currentSession?: Session | null) => {
    let activeSession = currentSession;
    if (activeSession === undefined) {
      const { data } = await supabase.auth.getSession();
      activeSession = data.session;
    }

    const token = activeSession?.access_token;
    if (!token) {
      lastFetchedTokenRef.current = null;
      inFlightPromiseRef.current = null;
      cachedUserRef.current = null;
      setUser(null);
      return;
    }

    // Skip if user is already loaded for this exact token
    if (token === lastFetchedTokenRef.current && cachedUserRef.current) {
      return;
    }

    // If a request for this token is currently in-flight, await it to prevent duplicate network calls
    if (token === lastFetchedTokenRef.current && inFlightPromiseRef.current) {
      try {
        await inFlightPromiseRef.current;
      } catch {
        // Handled within inFlight promise
      }
      return;
    }

    lastFetchedTokenRef.current = token;
    const fetchPromise = (async () => {
      try {
        const current = await getCurrentUser(token);
        cachedUserRef.current = current;
        setUser(current);
        return current;
      } catch (error) {
        console.error("Failed to load application user:", error);
        cachedUserRef.current = null;
        setUser(null);
        return null;
      } finally {
        inFlightPromiseRef.current = null;
      }
    })();

    inFlightPromiseRef.current = fetchPromise;
    await fetchPromise;
  }, []);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      if (event === "INITIAL_SESSION" && lastFetchedTokenRef.current) {
        return;
      }

      setSession(nextSession);

      if (!nextSession) {
        lastFetchedTokenRef.current = null;
        inFlightPromiseRef.current = null;
        cachedUserRef.current = null;
        setUser(null);
        setLoading(false);
        return;
      }

      await loadApplicationUser(nextSession);
      if (mounted) setLoading(false);
    });

    const initialize = async () => {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(initialSession);

      if (initialSession) {
        await loadApplicationUser(initialSession);
      }

      if (mounted) setLoading(false);
    };

    void initialize();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadApplicationUser]);

  const signOut = useCallback(async () => {
    lastFetchedTokenRef.current = null;
    inFlightPromiseRef.current = null;
    cachedUserRef.current = null;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    lastFetchedTokenRef.current = null;
    inFlightPromiseRef.current = null;
    cachedUserRef.current = null;
    await loadApplicationUser();
  }, [loadApplicationUser]);

  const value = useMemo(
    () => ({
      session,
      supabaseUser: session?.user ?? null,
      user,
      loading,
      signOut,
      refreshUser,
    }),
    [session, user, loading, signOut, refreshUser]
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
