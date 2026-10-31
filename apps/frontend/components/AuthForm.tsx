"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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

  // Mobile Perks drawer state
  const [mobilePerksOpen, setMobilePerksOpen] = useState(false);

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
      setOtpSent(true);
      setCountdown(30);
      setMessage(`One-time verification code has been dispatched to +91 ${cleanPhone}.`);
    } else {
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
    <div className="w-full min-h-[calc(100vh-80px)] bg-[#FAF7F5] text-neutral-800 antialiased pt-28 sm:pt-32 lg:pt-36 pb-16 px-4 sm:px-6 lg:px-10 flex flex-col items-center justify-center">
      {/* ── Main Split-Screen Container ── */}
      <div className="w-full max-w-6xl min-h-[720px] bg-white rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-neutral-200/70 relative">
        {/* ── BEGIN: LeftHeroEditorialPanel (Desktop: md:w-5/12) ── */}
        <aside
          aria-label="Brand Overview"
          className="relative hidden md:flex md:w-5/12 bg-[#141414] text-white flex-col justify-between p-8 sm:p-10 lg:p-12 overflow-hidden min-h-[580px] md:min-h-full"
        >
          {/* Background Photography with subtle crimson undertone & black glass effect */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/about/manifesto-editorial.jpg"
              alt="Closet by Chili Signature Edition Editorial"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-top filter brightness-90"
            />
            {/* Black glass gradient overlay matching Indian luxury aesthetic */}
            <div
              className="absolute inset-0 backdrop-blur-[1.5px]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(20, 20, 20, 0.45) 0%, rgba(20, 20, 20, 0.85) 60%, rgba(15, 15, 15, 0.98) 100%)",
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(179,19,23,0.35),transparent_65%)]" />
          </div>

          {/* Top Headline & Editorial Intro */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center space-x-2.5">
              <span className="h-0.5 w-6 bg-[#c99e58] inline-block" />
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#c99e58]">
                The Atelier Experience
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-[1.15]">
              Bold. Feminine.<br />
              <span className="italic font-normal text-[#c99e58]">Timeless.</span>
            </h1>
            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed max-w-xs font-normal pt-1">
              Modern Indian fashion crafted with care and elegance.
            </p>
          </div>

          {/* Bottom Content: Membership Perks & Craftsmanship Marks */}
          <div className="relative z-10 pt-8 mt-auto space-y-7">
            {/* Perks Container: Black Glass Box */}
            <div className="bg-black/50 backdrop-blur-md rounded-xl p-5 border border-white/10 space-y-3.5 shadow-xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#c99e58]/90">
                Member Privileges
              </p>
              <ul className="space-y-3 text-xs sm:text-sm text-neutral-200">
                <li className="flex items-center space-x-3">
                  <svg className="w-4 h-4 text-[#c99e58] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Free doorstep delivery &amp; tracking</span>
                </li>
                <li className="flex items-center space-x-3">
                  <svg className="w-4 h-4 text-[#c99e58] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Early access to new seasonal collections</span>
                </li>
                <li className="flex items-center space-x-3">
                  <svg className="w-4 h-4 text-[#c99e58] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Dedicated personal styling support</span>
                </li>
              </ul>
            </div>

            {/* Craftsmanship & Authenticity Footprint */}
            <div className="pt-2 flex items-center justify-between text-neutral-400 font-sans text-[11px] uppercase tracking-wider border-t border-white/10">
              <span>Jaipur &amp; Delhi Craftsmanship</span>
              <span>100% Authentic Indian Wear</span>
            </div>
          </div>
        </aside>
        {/* ── END: LeftHeroEditorialPanel ── */}

        {/* ── BEGIN: RightAuthContentPanel (w-full md:w-7/12) ── */}
        <main className="w-full md:w-7/12 bg-[#FCFAF8] p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            {/* Top Header Row with Closet by Chili & Close / Back Home button */}
            <header className="flex items-center justify-between pb-6">
              <div className="flex items-center gap-2.5">
                <Link
                  href="/"
                  className="text-xs font-bold tracking-[0.2em] uppercase text-[#b31317] hover:opacity-85 transition-opacity"
                >
                  Closet by Chili
                </Link>
                <span className="hidden sm:inline-block text-neutral-300">/</span>
                <span className="hidden sm:inline-block text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                  {mode === "login" ? "Sign In" : "Register"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-900 inline-flex items-center space-x-1 transition-colors"
                  href="mailto:support@closetbychili.com"
                >
                  <span>Help</span>
                  <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>

                {/* Desktop Close / Back Home Button */}
                <button
                  type="button"
                  onClick={goBack}
                  aria-label="Back to home"
                  title="Back to home"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-neutral-300 hover:border-neutral-500 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 transition-all shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            </header>

            {/* Mobile Compact Atelier Card (< md) with manifesto-editorial.jpg background & black glass overlay */}
            <section className="md:hidden mb-6 w-full rounded-xl p-5 relative overflow-hidden shadow-xl border border-neutral-800 text-white">
              {/* Background Photography with subtle crimson undertone & black glass effect */}
              <div className="absolute inset-0 z-0">
                <Image
                  src="/images/about/manifesto-editorial.jpg"
                  alt="Closet by Chili Signature Edition Editorial"
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover object-top filter brightness-90"
                />
                <div
                  className="absolute inset-0 backdrop-blur-[1.5px]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(20, 20, 20, 0.55) 0%, rgba(20, 20, 20, 0.88) 60%, rgba(15, 15, 15, 0.98) 100%)",
                  }}
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(179,19,23,0.35),transparent_65%)]" />
              </div>

              {/* Decorative Paisley Silhouette */}
              <div className="absolute -right-8 -bottom-10 opacity-10 pointer-events-none text-white z-0">
                <svg fill="currentColor" height="180" viewBox="0 0 100 100" width="180">
                  <path d="M50 0 C65 20, 90 35, 90 60 C90 82, 72 100, 50 100 C28 100, 10 82, 10 60 C10 42, 24 30, 36 22 C42 18, 48 10, 50 0 Z M50 25 C45 32, 30 40, 30 60 C30 71, 39 80, 50 80 C61 80, 70 71, 70 60 C70 45, 55 35, 50 25 Z" />
                </svg>
              </div>

              <div className="relative z-10 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#735c00]/90 text-white text-[10px] uppercase font-bold tracking-widest border border-[#ffe088]/20">
                    THE ATELIER EXPERIENCE
                  </span>
                  <span className="text-[#ffe088] text-xs font-semibold">✦</span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl text-white font-semibold tracking-tight mt-1">
                  Bold. Feminine. <span className="italic font-normal text-[#ffe088]">Timeless.</span>
                </h2>
                <p className="text-xs text-neutral-300 font-light leading-relaxed">
                  Modern Indian fashion crafted with care and elegance.
                </p>

                {/* Mobile Perks Collapsible Strip (Black Glass) */}
                <div className="mt-3 pt-2 bg-black/55 backdrop-blur-md rounded-lg p-2.5 flex items-center justify-between border border-white/15 shadow-sm">
                  <div className="flex items-center gap-2 overflow-hidden text-xs text-neutral-200">
                    <span className="material-symbols-outlined text-[#ffe088] text-[18px] shrink-0">
                      local_mall
                    </span>
                    <span className="text-[11px] uppercase tracking-wider truncate font-medium">
                      Free delivery &bull; Early drops &bull; Personal styling
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobilePerksOpen((prev) => !prev)}
                    aria-label="Toggle perks details"
                    className="text-[#ffe088] text-xs shrink-0 pl-2 focus:outline-none cursor-pointer"
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] transition-transform duration-200 inline-block ${
                        mobilePerksOpen ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                </div>

                {mobilePerksOpen && (
                  <div className="flex flex-col gap-1.5 pt-2 text-xs text-neutral-200 bg-black/45 backdrop-blur-md rounded-lg p-3 border border-white/10 mt-1.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[#ffe088]">✓</span>
                      <span>Inspected hand-draped luxury packaging with zero plastic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#ffe088]">✓</span>
                      <span>Priority access to crimson festive drops and bridal trunk shows</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#ffe088]">✓</span>
                      <span>One-on-one virtual blouse &amp; drape fit consultations</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Welcome Headings */}
            <div className="mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 font-semibold mb-2">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-sm text-neutral-500 font-normal">
                {mode === "login"
                  ? "View your saved orders, wishlist, and recommendations."
                  : "Join Closet by Chili for exclusive new drops, personalized sizing profiles, and tailored member privileges."}
              </p>
            </div>

            {/* Status & Feedback Alerts */}
            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5"
              >
                <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0 mt-0.5">
                  error
                </span>
                <p className="font-medium">{error}</p>
              </div>
            )}

            {message && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5"
              >
                <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0 mt-0.5">
                  check_circle
                </span>
                <p className="font-medium">{message}</p>
              </div>
            )}

            {/* Authentication Tabs (Mobile OTP vs Email & Password) */}
            <div className="flex border border-neutral-200/90 rounded-lg p-1 bg-neutral-100/70 mb-6" role="tablist">
              <button
                role="tab"
                type="button"
                aria-selected={authTab === "mobile" && mode === "login"}
                onClick={() => {
                  setAuthTab("mobile");
                  setError(null);
                  setMessage(null);
                }}
                className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-md transition-all text-center cursor-pointer ${
                  authTab === "mobile" && mode === "login"
                    ? "shadow-sm bg-white text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Mobile OTP
              </button>
              <button
                role="tab"
                type="button"
                aria-selected={authTab === "email" || mode === "register"}
                onClick={() => {
                  setAuthTab("email");
                  setError(null);
                  setMessage(null);
                }}
                className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-md transition-all text-center cursor-pointer ${
                  authTab === "email" || mode === "register"
                    ? "shadow-sm bg-white text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Email &amp; Password
              </button>
            </div>

            {/* ── Sign-in Form: Mobile OTP ── */}
            <form
              id="auth-otp-form"
              onSubmit={handleOtpSubmit}
              className={authTab === "mobile" && mode === "login" ? "space-y-4" : "hidden space-y-4"}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700" htmlFor="mobile-number">
                    Mobile Number
                  </label>
                  <span className="text-[11px] text-neutral-400">SMS OTP will be sent</span>
                </div>
                {/* Country Prefix + Phone Input */}
                <div className="relative flex rounded-md shadow-sm border border-neutral-300 focus-within:border-[#b31317] focus-within:ring-1 focus-within:ring-[#b31317] bg-white">
                  <div className="inline-flex items-center px-3.5 border-r border-neutral-200 bg-neutral-50/70 text-xs font-semibold text-neutral-700 select-none">
                    <span className="mr-1.5 font-bold tracking-tight">🇮🇳</span> +91
                  </div>
                  <input
                    id="mobile-number"
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Enter 10-digit mobile number"
                    disabled={otpSent}
                    className="block w-full border-0 py-2.5 px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-0 focus:outline-none disabled:opacity-60"
                    required
                  />
                </div>
              </div>

              {otpSent && (
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700" htmlFor="otp-input">
                      Enter 6-Digit OTP
                    </label>
                    {countdown > 0 ? (
                      <span className="text-[11px] text-neutral-400">Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCountdown(30);
                          setMessage(`New code re-sent to +91 ${phone}.`);
                        }}
                        className="text-[11px] text-[#b31317] hover:underline font-semibold cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <input
                    id="otp-input"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="••••••"
                    className="block w-full rounded-md border border-neutral-300 py-2.5 px-3.5 text-sm tracking-widest text-neutral-900 placeholder:text-neutral-400 focus:border-[#b31317] focus:ring-1 focus:ring-[#b31317] focus:outline-none"
                    required
                  />
                </div>
              )}

              {/* WhatsApp Notification Consent Checkbox */}
              <div className="flex items-start space-x-2.5 pt-1">
                <input
                  id="whatsapp-updates"
                  name="whatsapp-updates"
                  type="checkbox"
                  checked={whatsappUpdates}
                  onChange={(e) => setWhatsappUpdates(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-[#b31317] focus:ring-[#b31317] focus:ring-offset-0 mt-0.5 cursor-pointer accent-[#b31317]"
                />
                <label htmlFor="whatsapp-updates" className="text-xs text-neutral-600 leading-snug cursor-pointer select-none">
                  Get order updates on WhatsApp
                </label>
              </div>

              {/* Primary Submit Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-5 rounded-md text-sm font-semibold tracking-wide text-white bg-[#b31317] hover:bg-[#8f0f13] active:scale-[0.99] transition-all duration-150 shadow-sm mt-3 disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? "Processing..." : otpSent ? "Verify & Enter Atelier" : "Send One-Time Password"}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </form>

            {/* ── Sign-in Form: Email & Password ── */}
            <form
              id="auth-email-form"
              onSubmit={submitEmail}
              className={authTab === "email" || mode === "register" ? "space-y-4" : "hidden space-y-4"}
            >
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5" htmlFor="auth-name">
                    Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="block w-full rounded-md border border-neutral-300 py-2.5 px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#b31317] focus:ring-1 focus:ring-[#b31317] focus:outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5" htmlFor="auth-email">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  autoComplete="email"
                  className="block w-full rounded-md border border-neutral-300 py-2.5 px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#b31317] focus:ring-1 focus:ring-[#b31317] focus:outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700" htmlFor="auth-password">
                    Password
                  </label>
                  {mode === "login" && (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setMessage("Password reset instructions will be sent to your registered email address.");
                      }}
                      className="text-xs text-[#b31317] hover:underline"
                    >
                      Forgot?
                    </a>
                  )}
                </div>
                <div className="relative flex rounded-md shadow-sm border border-neutral-300 focus-within:border-[#b31317] focus-within:ring-1 focus-within:ring-[#b31317] bg-white">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder="Your password"
                    className="block w-full border-0 py-2.5 px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-0 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    aria-label="Toggle visibility"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="px-3 flex items-center text-neutral-400 hover:text-neutral-700 focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {mode === "register" && (
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Use at least 8 characters with a mix of letters and numbers.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center space-x-2 text-xs text-neutral-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-neutral-300 text-[#b31317] focus:ring-[#b31317] accent-[#b31317]"
                  />
                  <span>Remember this workstation</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-5 rounded-md text-sm font-semibold tracking-wide text-white bg-[#b31317] hover:bg-[#8f0f13] active:scale-[0.99] transition-all duration-150 shadow-sm mt-3 disabled:opacity-60 cursor-pointer"
              >
                <span>{loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </form>

            {/* Fast Track Sign-in Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <span className="relative bg-[#FCFAF8] px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                or sign in with
              </span>
            </div>

            {/* Google Fast Track Button */}
            <div>
              <button
                type="button"
                onClick={() => handleSocialSignIn("google")}
                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-neutral-300 rounded-md bg-white hover:bg-neutral-50 text-xs sm:text-sm font-medium text-neutral-700 shadow-sm transition-colors space-x-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <span>Google</span>
              </button>
            </div>

            {/* Account Switcher Banner Card */}
            <div className="mt-6 p-4 rounded-lg bg-neutral-100/90 border border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-neutral-900">
                  {mode === "login" ? "New to Closet by Chili?" : "Already have an account?"}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {mode === "login"
                    ? "Sign up to get welcome vouchers and track orders."
                    : "Sign in to view your orders and curations."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="inline-flex items-center justify-center px-3.5 py-1.5 rounded border border-[#b31317] text-[#b31317] text-xs font-semibold hover:bg-[#b31317] hover:text-white transition-colors duration-150 uppercase tracking-wider shrink-0 cursor-pointer"
              >
                {mode === "login" ? "Create an Account" : "Sign In"}
              </button>
            </div>

            {/* Boutique & Wholesale Portal Link */}
            <div className="mt-5 text-center">
              <Link
                href="/#wholesale"
                className="inline-flex items-center text-xs text-neutral-600 hover:text-neutral-900 space-x-1.5 transition-colors"
              >
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
                <span>
                  Boutique &amp; Wholesale Partners?{" "}
                  <span className="font-medium underline underline-offset-2">Sign in here</span>
                </span>
              </Link>
            </div>
          </div>

          {/* Trust Badges Footer */}
          <div>
            <footer className="pt-6 mt-6 border-t border-neutral-200/80 grid grid-cols-2 gap-4 text-neutral-600">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-neutral-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span className="text-[11px] font-medium leading-tight">256-Bit Secure Encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-neutral-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span className="text-[11px] font-medium leading-tight">100% Authentic Indian Wear</span>
              </div>
            </footer>

            {/* Atelier Fineprint */}
            <div className="text-center pt-3">
              <p className="text-[11px] text-neutral-400 leading-tight">
                By proceeding, you agree to our{" "}
                <Link className="underline hover:text-neutral-700" href="/#terms">
                  Terms of Service
                </Link>{" "}
                &amp;{" "}
                <Link className="underline hover:text-neutral-700" href="/#privacy">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </main>
        {/* ── END: RightAuthContentPanel ── */}
      </div>
    </div>
  );
}
