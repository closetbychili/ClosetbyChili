"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/api/auth";

function sanitizeNextUrl(rawUrl: string | null): string {
  if (!rawUrl) return "/account";
  // Protect against open redirect attacks: only allow internal relative paths
  if (rawUrl.startsWith("/") && !rawUrl.startsWith("//") && !rawUrl.startsWith("/\\")) {
    return rawUrl;
  }
  return "/account";
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    async function handleAuthCallback() {
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const code = searchParams.get("code");
      const storedNext =
        typeof window !== "undefined"
          ? sessionStorage.getItem("auth_redirect_next")
          : null;
      const rawNext = searchParams.get("next") || storedNext;
      const targetNext = sanitizeNextUrl(rawNext);

      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("auth_redirect_next");
        } catch {
          // ignore sessionStorage cleanup error
        }
      }

      // 1. Handle error returned by OAuth provider (e.g. user cancelled Google sign-in)
      if (errorParam || errorDescription) {
        const friendlyMessage =
          errorParam === "access_denied" || errorDescription?.includes("denied")
            ? "Google sign-in was cancelled. Please try again."
            : errorDescription || errorParam || "Authentication with Google failed.";
        router.replace(`/login?error=${encodeURIComponent(friendlyMessage)}`);
        return;
      }

      // 2. PKCE code exchange flow
      if (code) {
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setErrorMsg(exchangeError.message);
            router.replace(`/login?error=${encodeURIComponent(exchangeError.message)}`);
            return;
          }

          const accessToken = data?.session?.access_token;
          if (accessToken) {
            // Synchronize with Django backend: provision / resolve User and CustomerProfile
            try {
              await getCurrentUser(accessToken);
            } catch (syncError) {
              console.error("Django account synchronization error on OAuth callback:", syncError);
            }
          }

          router.replace(targetNext);
          router.refresh();
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to exchange authorization code.";
          setErrorMsg(message);
          router.replace(`/login?error=${encodeURIComponent(message)}`);
          return;
        }
      }

      // 3. Fallback: inspect existing session if token was detected in URL by Supabase client
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData?.session) {
          router.replace("/login");
          return;
        }

        const token = sessionData.session.access_token;
        if (token) {
          try {
            await getCurrentUser(token);
          } catch (syncError) {
            console.error("Django account synchronization error on existing session:", syncError);
          }
        }

        router.replace(targetNext);
        router.refresh();
      } catch {
        router.replace("/login");
      }
    }

    void handleAuthCallback();
  }, [router, searchParams]);

  if (errorMsg) {
    return (
      <div className="w-full max-w-md p-8 bg-white border border-neutral-200/80 rounded-2xl shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-[#b31317] mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">error</span>
        </div>
        <h2 className="font-serif text-xl font-semibold text-neutral-900">
          Authentication Notice
        </h2>
        <p className="text-sm text-neutral-600 leading-relaxed">
          {errorMsg}
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center py-2.5 px-6 rounded-md bg-[#b31317] hover:bg-[#8f0f13] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-white border border-neutral-200/80 rounded-2xl shadow-xl text-center space-y-5">
      <div className="flex flex-col items-center gap-3">
        <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#b31317]">
          Closet by Chili
        </span>
        <div className="w-10 h-10 border-2 border-[#b31317] border-t-transparent rounded-full animate-spin" />
      </div>
      <div>
        <h2 className="font-serif text-xl font-semibold text-neutral-900 tracking-tight">
          Authenticating Atelier Session
        </h2>
        <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
          Verifying your Google credentials and preparing your curation archive...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F5] flex items-center justify-center p-4 sm:p-6">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 bg-white border border-neutral-200/80 rounded-2xl shadow-xl text-center">
            <div className="w-10 h-10 border-2 border-[#b31317] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-500 mt-4 uppercase tracking-widest font-medium">
              Connecting to Atelier...
            </p>
          </div>
        }
      >
        <AuthCallbackContent />
      </Suspense>
    </main>
  );
}

