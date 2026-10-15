"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowUpRight, Diamond, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { verifyAdminAuth } from "@/lib/api/admin";

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const getSafeRedirectUrl = (): string => {
    const rawRedirect = searchParams.get("redirect") || searchParams.get("next");
    if (rawRedirect && rawRedirect.startsWith("/admin") && !rawRedirect.startsWith("//")) {
      return rawRedirect;
    }
    return "/admin";
  };

  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Work email is required.");
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError || !authData.session) {
        setErrorMessage("Invalid email or password. Please verify your credentials.");
        setLoading(false);
        return;
      }

      // Verify administrative authorization server-side
      try {
        await verifyAdminAuth(authData.session.access_token);
        const destination = getSafeRedirectUrl();
        router.push(destination);
        router.refresh();
      } catch (adminVerifyError: unknown) {
        // Authenticated customer without administrative privileges
        await supabase.auth.signOut();
        const status = typeof adminVerifyError === "object" && adminVerifyError !== null && "status" in adminVerifyError
          ? (adminVerifyError as { status: number }).status
          : undefined;

        if (status === 403) {
          setErrorMessage("Access denied. Your account does not have administrative privileges.");
        } else {
          setErrorMessage(
            "Access verification failed. Only authorized administrators may sign in."
          );
        }
        setLoading(false);
      }
    } catch {
      setErrorMessage("An unexpected authentication error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-[#F7F1E8] antialiased selection:bg-[#6D1826] selection:text-white">
      <div className="w-full max-w-[440px] flex flex-col items-center">
        <div className="w-full bg-white rounded-2xl shadow-[0_10px_35px_-4px_rgba(79,0,18,0.06),0_2px_10px_-2px_rgba(79,0,18,0.03)] border border-[#EBE2D8] p-8 sm:p-10">
          
          {/* Brand & Context Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#FCF2EB] flex items-center justify-center shadow-xs">
                <Diamond className="text-[#4F0012] w-4 h-4 fill-current" />
              </div>
              <span className="font-serif text-lg text-[#4F0012] font-semibold tracking-tight">
                Closet by Chilli
              </span>
            </div>

            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F6ECE6] border border-[#EAE1DB] mb-5">
              <span className="text-[11px] tracking-widest uppercase text-[#6D1826] font-semibold">
                Admin Console
              </span>
            </div>

            <h1 className="text-2xl sm:text-[26px] text-[#1F1B17] font-normal tracking-tight font-serif">
              Sign In
            </h1>
            <p className="text-sm text-[#554243] mt-2 leading-relaxed">
              Enter your credentials to access the admin console.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-3.5 rounded-lg bg-[#FFF2F2] border border-[#FAD2D2] flex items-start gap-2.5 text-[#93000A] text-xs leading-relaxed animate-fade-in"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form id="admin-login-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* Work Email */}
            <div className="flex flex-col gap-1.5 text-left">
              <label
                htmlFor="work-email"
                className="text-xs font-semibold text-[#1F1B17] tracking-wide uppercase"
              >
                Work Email
              </label>
              <div className="relative flex items-center">
                <input
                  id="work-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="admin@closetbychilli.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  className={`w-full h-11 px-3.5 rounded-lg bg-[#FAF6F2] border text-[#1F1B17] placeholder:text-[#A89895] text-sm transition-all focus:outline-none focus:bg-white focus:ring-1 ${
                    emailError
                      ? "border-[#BA1A1A] focus:border-[#BA1A1A] focus:ring-[#BA1A1A]"
                      : "border-[#E6DDD3] focus:border-[#4F0012] focus:ring-[#4F0012]"
                  }`}
                />
              </div>
              {emailError && (
                <p className="text-[11px] text-[#BA1A1A] font-medium mt-0.5">{emailError}</p>
              )}
            </div>

            {/* Staff Password */}
            <div className="flex flex-col gap-1.5 text-left">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="staff-password"
                  className="text-xs font-semibold text-[#1F1B17] tracking-wide uppercase"
                >
                  Password
                </label>
              </div>
              <div className="relative flex items-center">
                <input
                  id="staff-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  className={`w-full h-11 pl-3.5 pr-11 rounded-lg bg-[#FAF6F2] border text-[#1F1B17] placeholder:text-[#A89895] text-sm transition-all focus:outline-none focus:bg-white focus:ring-1 ${
                    passwordError
                      ? "border-[#BA1A1A] focus:border-[#BA1A1A] focus:ring-[#BA1A1A]"
                      : "border-[#E6DDD3] focus:border-[#4F0012] focus:ring-[#4F0012]"
                  }`}
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 p-1 rounded-md text-[#554243] hover:text-[#1F1B17] transition-colors focus:outline-none focus:ring-1 focus:ring-[#4F0012]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" id="pwd-toggle-icon" />
                  ) : (
                    <Eye className="w-4 h-4" id="pwd-toggle-icon" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-[11px] text-[#BA1A1A] font-medium mt-0.5">{passwordError}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="submit-auth-btn"
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#6D1826] hover:bg-[#4F0012] text-white text-sm font-medium tracking-wide transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4F0012] focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Notice & Return Link */}
          <div className="mt-8 pt-6 border-t border-[#F2EBE3] flex items-center justify-between text-xs text-[#554243]">
            <span className="text-[#8C7A78]">Authorized personnel only</span>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[#6D1826] hover:underline font-medium transition-colors"
            >
              <span>Return to store</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Console Copyright */}
        <div className="mt-6 text-center text-xs text-[#9E8E8B]">
          © 2024 Closet by Chilli. Atelier Operations.
        </div>
      </div>
    </main>
  );
}
