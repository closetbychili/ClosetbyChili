"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Diamond, Loader2, LogIn, ShieldAlert } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { verifyAdminAuth, type AdminUser } from "@/lib/api/admin";

interface AdminGuardProps {
  children: ReactNode;
}

type AuthStatus = "checking" | "authorized" | "unauthorized" | "unauthenticated";

export interface AdminContextValue {
  adminUser: AdminUser;
  signOut: () => Promise<void>;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdminContext(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) {
    return {
      adminUser: {
        id: "",
        email: "",
        role: "admin",
        is_admin: true,
        is_staff: true,
        is_active: true,
        created_at: "",
      },
      signOut: async () => {},
    };
  }
  return context;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] = useState<AuthStatus>("checking");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  useEffect(() => {
    let isCancelled = false;

    async function checkAuthorization() {
      setStatus("checking");
      setErrorMessage(null);

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          if (!isCancelled) {
            setStatus("unauthenticated");
            const redirectParam = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
            router.replace(`/admin/login${redirectParam}`);
          }
          return;
        }

        // Verify against backend API to guarantee server-enforced authorization
        const verifiedAdmin = await verifyAdminAuth(sessionData.session.access_token);

        if (!isCancelled) {
          setAdminUser(verifiedAdmin);
          setStatus("authorized");
        }
      } catch (err: unknown) {
        if (isCancelled) return;

        const errorStatus =
          typeof err === "object" && err !== null && "status" in err
            ? (err as { status: number }).status
            : undefined;

        if (errorStatus === 403) {
          setStatus("unauthorized");
          setErrorMessage(
            "Administrator privileges are required to access this area. Your current account is authenticated as a customer without administrative authorization."
          );
        } else if (errorStatus === 401) {
          setStatus("unauthenticated");
          const redirectParam = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
          router.replace(`/admin/login${redirectParam}`);
        } else {
          setStatus("unauthorized");
          setErrorMessage("Failed to verify administrative authorization. Please try again.");
        }
      }
    }

    void checkAuthorization();

    return () => {
      isCancelled = true;
    };
  }, [pathname, router]);

  if (status === "checking") {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#F7F1E8] antialiased">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-[#FCF2EB] border border-[#EAE1DB] flex items-center justify-center shadow-xs">
            <Diamond className="text-[#4F0012] w-6 h-6 fill-current animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-[#4F0012] font-semibold text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying Admin Authorization...</span>
          </div>
          <p className="text-xs text-[#8C7A78] leading-relaxed">
            Secure server handshake in progress with Closet by Chilli Atelier.
          </p>
        </div>
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#F7F1E8] antialiased">
        <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-[0_10px_35px_-4px_rgba(79,0,18,0.06)] border border-[#EBE2D8] p-8 sm:p-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#FFF2F2] border border-[#FAD2D2] flex items-center justify-center mb-4 text-[#93000A]">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#93000A] bg-[#FFF2F2] px-2.5 py-1 rounded-full">
            403 • Access Restricted
          </span>

          <h2 className="text-xl font-serif text-[#1F1B17] font-semibold mt-3 mb-2">
            Administrator Privileges Required
          </h2>

          <p className="text-xs text-[#554243] leading-relaxed mb-6">
            {errorMessage ||
              "Your account is authenticated, but does not possess the administrative role required to access the console."}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Link
              href="/"
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-[#E6DDD3] text-[#1F1B17] hover:bg-[#FAF6F2] font-medium text-xs tracking-wide transition-colors inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Store</span>
            </Link>

            <Link
              href="/admin/login"
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#6D1826] hover:bg-[#4F0012] text-white font-medium text-xs tracking-wide transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Switch Account</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "authorized" && adminUser) {
    return (
      <AdminContext.Provider value={{ adminUser, signOut: handleSignOut }}>
        {children}
      </AdminContext.Provider>
    );
  }

  return null;
}
