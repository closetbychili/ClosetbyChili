"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Mode = "login" | "register";

export default function AuthForm({ mode: initialMode }: { mode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
    if (next === "login") setName("");
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.push("/account");
          router.refresh();
        } else {
          setMessage("Account created. Check your email to verify your address.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/account");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8f7] px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            title="Back"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#680007]/15 bg-white px-3 py-2 text-[11px] font-medium uppercase tracking-[0.15em] text-[#680007] transition-colors hover:bg-[#680007] hover:text-white"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back
          </button>
          <span className="sr-only">
            {mode === "login" ? "Sign In" : "Create Account"}
          </span>
        </div>

        <div className="mb-6 text-center">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8b000a]">
            Closet by Chili
          </p>
          <h1 className="font-[var(--font-cinzel)] text-3xl sm:text-4xl">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="mt-3 text-sm text-black/55">
            {mode === "login"
              ? "Sign in to track your orders, save wishlists and shop faster."
              : "Join Closet by Chili for exclusive new drops and a tailored shopping experience."}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          {/* ─── Toggle Tabs ─── */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="mb-6 grid grid-cols-2 rounded-lg bg-[#fff8f7] p-1 text-xs font-medium uppercase tracking-[0.15em]"
          >
            <button
              role="tab"
              aria-selected={mode === "login"}
              type="button"
              onClick={() => switchMode("login")}
              className={
                "rounded-md px-3 py-2.5 transition-colors duration-200 " +
                (mode === "login"
                  ? "bg-white text-[#680007] shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                  : "text-black/55 hover:text-black/80")
              }
            >
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={mode === "register"}
              type="button"
              onClick={() => switchMode("register")}
              className={
                "rounded-md px-3 py-2.5 transition-colors duration-200 " +
                (mode === "register"
                  ? "bg-white text-[#680007] shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                  : "text-black/55 hover:text-black/80")
              }
            >
              Create Account
            </button>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {mode === "register" && (
              <label htmlFor="auth-name" className="block text-sm">
                <span className="font-medium text-black/80">Name</span>
                <input
                  id="auth-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="e.g. Ananya Sharma"
                  className="mt-2 w-full rounded-md border border-black/15 bg-white px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-[#8b000a] focus:ring-2 focus:ring-[#8b000a]/10"
                />
              </label>
            )}
            <label htmlFor="auth-email" className="block text-sm">
              <span className="font-medium text-black/80">Email Address</span>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-md border border-black/15 bg-white px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-[#8b000a] focus:ring-2 focus:ring-[#8b000a]/10"
              />
            </label>
            <label htmlFor="auth-password" className="block text-sm">
              <span className="font-medium text-black/80">Password</span>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="Minimum 8 characters"
                className="mt-2 w-full rounded-md border border-black/15 bg-white px-3.5 py-3 text-[14px] outline-none transition-colors focus:border-[#8b000a] focus:ring-2 focus:ring-[#8b000a]/10"
              />
              {mode === "register" && (
                <p className="mt-1.5 text-[11px] text-black/45">
                  We recommend a mix of letters, numbers and symbols.
                </p>
              )}
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
              >
                {error}
              </div>
            )}
            {message && (
              <div
                role="status"
                className="rounded-md border border-green-200 bg-green-50 px-3.5 py-2.5 text-xs text-green-700"
              >
                {message}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full rounded-md bg-[#680007] px-4 py-3 text-[13px] font-medium uppercase tracking-[0.18em] text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-black/55">
            {mode === "login" ? "New to Closet by Chili? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              className="font-medium text-[#8b000a] underline-offset-2 hover:underline"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.25em] text-black/35">
          Bold · Feminine · Timeless
        </p>
      </div>
    </main>
  );
}
