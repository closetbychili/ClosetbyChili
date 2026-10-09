"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Mode = "login" | "register";
type AuthTab = "mobile" | "email";

export default function AuthForm({ mode: initialMode }: { mode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [authTab, setAuthTab] = useState<AuthTab>(initialMode === "register" ? "email" : "mobile");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
    if (next === "register") {
      setAuthTab("email");
    }
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
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

  function handleOtpSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!otpSent) {
      // Simulate sending OTP
      setOtpSent(true);
      setCountdown(30);
      setMessage(`One-time verification code has been dispatched to +91 ${cleanPhone}.`);
    } else {
      // Verify OTP
      if (otp.length < 4) {
        setError("Please enter the verification code sent to your phone.");
        return;
      }
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setMessage("Mobile verification successful. Redirecting to your atelier dashboard...");
        router.push("/account");
        router.refresh();
      }, 700);
    }
  }

  async function handleSocialSignIn(provider: "google" | "apple") {
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/account` : undefined,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : `${provider} sign-in failed.`);
    }
  }

  return (
    <main className="w-full pt-24 sm:pt-28 pb-16 bg-background">
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-12">
        {/* Back navigation action */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-surface border border-outline-variant/40 hover:border-primary text-on-surface hover:text-primary font-label-caps text-[11px] uppercase tracking-wider transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Store</span>
          </button>
          <span className="font-label-caps text-[11px] tracking-widest text-outline uppercase">
            Closet by Chili / {mode === "login" ? "Sign In" : "Register"}
          </span>
        </div>

        {/* ── Main Two-Column Luxury Architecture ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[760px] shadow-xl shadow-on-surface/5 bg-surface-container-lowest border border-outline-variant/30">
          
          {/* ── Left Column: Editorial Imagery & Brand Philosophy (5 Cols) ── */}
          <div className="lg:col-span-5 relative flex flex-col justify-between p-8 sm:p-12 lg:p-14 overflow-hidden bg-inverse-surface text-inverse-on-surface">
            {/* Background Campaign Photography & Rich Gradients */}
            <div className="absolute inset-0 z-0">
              <div
                className="w-full h-full bg-cover bg-center opacity-45 transform scale-105 transition-transform duration-1000"
                style={{ backgroundImage: "url('/assets/hero/hero-1.webp')" }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-inverse-surface via-inverse-surface/85 to-inverse-surface/40" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(179,19,23,0.35),transparent_65%)]" />
            </div>

            {/* Narrative Header */}
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-secondary-fixed" />
                <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary-fixed">
                  The Atelier Experience
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="font-headline-lg text-headline-lg text-on-primary leading-tight">
                  Bold. Feminine.<br />
                  <span className="italic font-normal font-title-editorial text-secondary-fixed">
                    Timeless.
                  </span>
                </h2>
                <p className="font-body-md text-body-md text-inverse-on-surface/80 max-w-sm leading-relaxed">
                  We do not simply design attire; we craft an enduring narrative of courage, drape, and sovereign Indian luxury.
                </p>
              </div>
            </div>

            {/* Privileges Strip */}
            <div className="relative z-10 mt-12 pt-8 flex flex-col gap-5 bg-inverse-surface/40 backdrop-blur-md p-6 border border-outline-variant/15">
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary-fixed-dim font-semibold">
                Muse Membership Privileges
              </span>
              <div className="grid grid-cols-1 gap-4 font-body-sm text-body-sm text-inverse-on-surface/90">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary-fixed text-[18px] shrink-0 mt-0.5">
                    local_shipping
                  </span>
                  <span>Express real-time consignment dispatch &amp; doorstep tracking</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary-fixed text-[18px] shrink-0 mt-0.5">
                    diamond
                  </span>
                  <span>Exclusive first preview access to limited seasonal capsule drops</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary-fixed text-[18px] shrink-0 mt-0.5">
                    support_agent
                  </span>
                  <span>Dedicated bespoke styling advisory &amp; festive concierge</span>
                </div>
              </div>
            </div>

            {/* Subtle Watermark Credential */}
            <div className="relative z-10 pt-8 flex items-center justify-between text-inverse-on-surface/50 font-label-caps text-[10px] tracking-wider uppercase border-t border-inverse-on-surface/10 mt-8">
              <span>Rooted in Jaipur &amp; Delhi</span>
              <span>Guaranteed Authentic</span>
            </div>
          </div>

          {/* ── Right Column: Authentication Panel (7 Cols) ── */}
          <div className="lg:col-span-7 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-surface-container-lowest">
            <div className="w-full max-w-xl mx-auto flex flex-col gap-8">
              
              {/* Header Area */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps tracking-widest text-primary font-semibold uppercase">
                    Closet by Chili Account
                  </span>
                  <a
                    className="font-label-caps text-[11px] uppercase tracking-wider text-outline hover:text-primary transition-colors flex items-center gap-1"
                    href="mailto:support@closetbychili.com"
                  >
                    <span>Assistance</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                  </a>
                </div>

                <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">
                  {mode === "login" ? "Welcome Back, Muse" : "Create Account, Muse"}
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {mode === "login"
                    ? "Access your saved silhouettes, order archives, and complimentary personal curations."
                    : "Join Closet by Chili for exclusive new drops, personalized sizing profiles, and tailored member privileges."}
                </p>
              </div>

              {/* Mode & Channel Feedback Alerts */}
              {error && (
                <div
                  role="alert"
                  className="p-4 bg-error-container/40 border-l-4 border-error text-on-surface flex items-start gap-3"
                >
                  <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">
                    error
                  </span>
                  <p className="font-body-sm text-body-sm text-error font-medium">{error}</p>
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="p-4 bg-surface-container-low border-l-4 border-secondary text-on-surface flex items-start gap-3"
                >
                  <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">{message}</p>
                </div>
              )}

              {/* Auth Mode Toggle Bar (Tabs) */}
              <div
                className="flex items-center bg-surface-container-low p-1 w-full border border-outline-variant/30"
                role="tablist"
                aria-label="Authentication Method"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-mobile"
                  aria-selected={authTab === "mobile" && mode === "login"}
                  onClick={() => {
                    setAuthTab("mobile");
                    setError(null);
                    setMessage(null);
                  }}
                  className={`flex-1 py-3 px-4 font-label-caps text-label-caps tracking-widest uppercase transition-all duration-200 text-center ${
                    authTab === "mobile" && mode === "login"
                      ? "bg-surface-container-lowest text-primary shadow-xs font-semibold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Instant OTP / Mobile
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-email"
                  aria-selected={authTab === "email" || mode === "register"}
                  onClick={() => {
                    setAuthTab("email");
                    setError(null);
                    setMessage(null);
                  }}
                  className={`flex-1 py-3 px-4 font-label-caps text-label-caps tracking-widest uppercase transition-all duration-200 text-center ${
                    authTab === "email" || mode === "register"
                      ? "bg-surface-container-lowest text-primary shadow-xs font-semibold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Email &amp; Password
                </button>
              </div>

              {/* ── Interactive Form Pane: Mobile OTP ── */}
              <form
                id="pane-mobile"
                onSubmit={handleOtpSubmit}
                className={authTab === "mobile" && mode === "login" ? "flex flex-col gap-5" : "hidden flex-col gap-5"}
              >
                <div className="flex flex-col gap-2">
                  <label
                    className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold flex items-center justify-between"
                    htmlFor="phone-input"
                  >
                    <span>Mobile Number</span>
                    <span className="text-[10px] text-tertiary lowercase tracking-normal font-normal">
                      SMS OTP will be delivered
                    </span>
                  </label>
                  <div className="flex items-stretch bg-surface-container-low focus-within:bg-surface-container-lowest border border-outline-variant/40 focus-within:border-primary transition-colors">
                    <div className="flex items-center gap-1.5 px-3.5 py-3.5 bg-surface-container text-on-surface shrink-0 select-none border-r border-outline-variant/30">
                      <span className="text-[13px] font-bold">🇮🇳</span>
                      <span className="font-body-md text-body-md font-medium text-on-surface">+91</span>
                      <span className="material-symbols-outlined text-[16px] text-outline">arrow_drop_down</span>
                    </div>
                    <input
                      id="phone-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={10}
                      pattern="[0-9]{10}"
                      placeholder="Enter 10-digit mobile number"
                      disabled={otpSent}
                      className="w-full px-4 py-3.5 bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none disabled:opacity-60"
                      required
                    />
                  </div>
                </div>

                {otpSent && (
                  <div className="flex flex-col gap-2 pt-1 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label htmlFor="otp-input" className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">
                        Enter 6-Digit OTP
                      </label>
                      {countdown > 0 ? (
                        <span className="font-body-sm text-[11px] text-outline">Resend code in {countdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCountdown(30);
                            setMessage(`New code re-sent to +91 ${phone}.`);
                          }}
                          className="font-body-sm text-[11px] text-primary hover:underline font-semibold"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                    <div className="flex items-center bg-surface-container-low focus-within:bg-surface-container-lowest border border-outline-variant/40 focus-within:border-primary transition-colors px-4 py-3.5">
                      <span className="material-symbols-outlined text-[20px] text-outline mr-3">pin</span>
                      <input
                        id="otp-input"
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="••••••"
                        className="w-full bg-transparent font-body-md text-body-md text-on-surface tracking-widest placeholder:text-outline focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    id="whatsapp-updates"
                    type="checkbox"
                    checked={whatsappUpdates}
                    onChange={(e) => setWhatsappUpdates(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-primary cursor-pointer"
                  />
                  <label
                    htmlFor="whatsapp-updates"
                    className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer select-none"
                  >
                    Get order tracking alerts and dispatch confirmations instantly via WhatsApp.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-container text-on-primary hover:bg-primary py-4 px-6 font-label-caps text-label-caps tracking-widest uppercase flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm mt-2 font-semibold disabled:opacity-60"
                >
                  <span>{loading ? "Processing..." : otpSent ? "Verify & Enter Atelier" : "Send One-Time Password (OTP)"}</span>
                  <span className="material-symbols-outlined text-[18px]">east</span>
                </button>
              </form>

              {/* ── Interactive Form Pane: Email & Password ── */}
              <form
                id="pane-email"
                onSubmit={submitEmail}
                className={authTab === "email" || mode === "register" ? "flex flex-col gap-5" : "hidden flex-col gap-5"}
              >
                {mode === "register" && (
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="auth-name"
                      className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold"
                    >
                      Name
                    </label>
                    <div className="flex items-center bg-surface-container-low focus-within:bg-surface-container-lowest border border-outline-variant/40 focus-within:border-primary transition-colors px-4 py-3.5">
                      <span className="material-symbols-outlined text-[20px] text-outline mr-3">person</span>
                      <input
                        id="auth-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ananya Sharma"
                        autoComplete="name"
                        className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="auth-email"
                    className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold"
                  >
                    Email Address
                  </label>
                  <div className="flex items-center bg-surface-container-low focus-within:bg-surface-container-lowest border border-outline-variant/40 focus-within:border-primary transition-colors px-4 py-3.5">
                    <span className="material-symbols-outlined text-[20px] text-outline mr-3">mail</span>
                    <input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@luxury-domain.com"
                      autoComplete="email"
                      className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="auth-password"
                      className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold"
                    >
                      Password
                    </label>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setMessage("Password reset instructions will be sent to your registered email address.");
                      }}
                      className="font-body-sm text-body-sm text-tertiary hover:underline"
                    >
                      Forgot Password?
                    </a>
                  </div>
                  <div className="flex items-center bg-surface-container-low focus-within:bg-surface-container-lowest border border-outline-variant/40 focus-within:border-primary transition-colors px-4 py-3.5">
                    <span className="material-symbols-outlined text-[20px] text-outline mr-3">lock</span>
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder="Enter your confidential passcode"
                      className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      aria-label="Toggle visibility"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-outline hover:text-on-surface focus:outline-none"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  {mode === "register" && (
                    <p className="font-body-sm text-[11px] text-outline pt-0.5">
                      Use at least 8 characters with a mix of letters and numbers.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary cursor-pointer" />
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Remember this workstation</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-container text-on-primary hover:bg-primary py-4 px-6 font-label-caps text-label-caps tracking-widest uppercase flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm mt-2 font-semibold disabled:opacity-60"
                >
                  <span>{loading ? "Please wait…" : mode === "login" ? "Sign In to Account" : "Create Account"}</span>
                  <span className="material-symbols-outlined text-[18px]">east</span>
                </button>
              </form>

              {/* ── Divider Separator ── */}
              <div className="relative flex items-center justify-center py-2">
                <div className="w-full h-px bg-surface-container-high" />
                <span className="absolute bg-surface-container-lowest px-4 font-label-caps text-[10px] uppercase tracking-widest text-outline">
                  Or Fast Track Access
                </span>
              </div>

              {/* ── Social Authentications ── */}
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => handleSocialSignIn("google")}
                  className="flex items-center justify-center gap-3 py-3 px-4 bg-surface-container-low hover:bg-surface-container transition-colors font-label-ui text-label-ui text-on-surface border border-outline-variant/30"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialSignIn("apple")}
                  className="flex items-center justify-center gap-3 py-3 px-4 bg-surface-container-low hover:bg-surface-container transition-colors font-label-ui text-label-ui text-on-surface border border-outline-variant/30"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.64 1.34-.56.65-.99 1.71-.86 2.72 1.01.08 1.98-.51 2.58-1.21z" />
                  </svg>
                  <span>Apple ID</span>
                </button>
              </div>

              {/* ── Registration / Login Toggle Card ── */}
              <div className="bg-surface-container-low/70 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left border border-outline-variant/30">
                <div className="flex flex-col">
                  <span className="font-label-caps text-[11px] uppercase tracking-wider text-on-surface font-semibold">
                    {mode === "login" ? "New to Closet by Chili?" : "Already have a Muse account?"}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {mode === "login"
                      ? "Unlock personalized sizing profile & member benefits."
                      : "Sign in to access your order archives and saved curations."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => switchMode(mode === "login" ? "register" : "login")}
                  className="px-4 py-2.5 bg-surface-container text-primary hover:bg-primary hover:text-on-primary font-label-caps text-label-caps uppercase tracking-wider transition-colors shrink-0 font-semibold"
                >
                  {mode === "login" ? "Register as a Muse" : "Sign in as a Muse"}
                </button>
              </div>

              {/* ── B2B & Wholesale Direct Access Link ── */}
              <div className="flex items-center justify-center pt-2">
                <Link
                  href="/#wholesale"
                  className="font-body-sm text-body-sm text-outline hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">storefront</span>
                  <span>Boutique &amp; Wholesale Partner Portal? Sign in here</span>
                </Link>
              </div>
            </div>

            {/* ── Footnote / Trust Credentials ── */}
            <div className="w-full max-w-xl mx-auto pt-10 mt-8 border-t border-surface-container-high/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-outline font-label-caps text-[10px] tracking-wider uppercase">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-tertiary">lock</span>
                <span>256-Bit Encrypted Secure Session</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-secondary">verified</span>
                <span>Authentic Indian Haute Couture</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Supplementary Brand Values Mosaic Strip ── */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 p-8 bg-surface-container-low text-center border border-outline-variant/20 shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">design_services</span>
            <h4 className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface font-semibold">
              Bespoke Fit
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
              Customized sleeve, drape, and hem alterations upon request.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">all_inclusive</span>
            <h4 className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface font-semibold">
              Pure Textiles
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
              Ethically sourced tussar, raw silk, organza, and velvet weaves.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">package_2</span>
            <h4 className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface font-semibold">
              Signature Packaging
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
              Each ensemble encased in breathable garment covers and satin ribbons.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">published_with_changes</span>
            <h4 className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface font-semibold">
              Easy Exchanges
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
              Complimentary reverse pickups across 19,000+ Indian postal codes.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
