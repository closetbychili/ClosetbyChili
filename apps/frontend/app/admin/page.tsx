"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Diamond, LogOut, ShieldCheck, UserCheck } from "lucide-react";

import AdminGuard from "@/components/admin/AdminGuard";
import { supabase } from "@/lib/supabase/client";
import { verifyAdminAuth, type AdminUser } from "@/lib/api/admin";

function AdminConsoleContent() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    async function loadAdmin() {
      try {
        const user = await verifyAdminAuth();
        setAdminUser(user);
      } catch {
        // Handled by AdminGuard
      }
    }
    void loadAdmin();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#F7F1E8] text-[#1F1B17] flex flex-col justify-between">
      {/* Top Admin Navigation Bar */}
      <header className="w-full bg-white border-b border-[#EBE2D8] px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FCF2EB] flex items-center justify-center">
              <Diamond className="text-[#4F0012] w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="font-serif text-lg text-[#4F0012] font-semibold tracking-tight">
                Closet by Chilli
              </span>
              <span className="ml-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#6D1826] bg-[#F6ECE6] border border-[#EAE1DB] px-2 py-0.5 rounded-full">
                Admin Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-[#554243] hover:text-[#4F0012] inline-flex items-center gap-1 font-medium transition-colors"
            >
              <span>View Storefront</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-md border border-[#E6DDD3] hover:border-[#6D1826] hover:text-[#6D1826] text-xs font-medium text-[#1F1B17] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content Body */}
      <main className="max-w-4xl mx-auto w-full px-6 py-12 flex-1">
        <div className="bg-white rounded-2xl shadow-[0_10px_35px_-4px_rgba(79,0,18,0.06)] border border-[#EBE2D8] p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-semibold text-[#1F1B17]">
                Authenticated Administrator Foundation
              </h1>
              <p className="text-xs text-[#554243] mt-0.5">
                Sprint A1.1 Authentication & Authorization Verification
              </p>
            </div>
          </div>

          <div className="bg-[#FAF6F2] rounded-xl border border-[#E6DDD3] p-5 mb-6">
            <h2 className="text-xs font-semibold text-[#1F1B17] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#6D1826]" />
              <span>Verified Identity Session</span>
            </h2>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-[#8C7A78]">Account Email</dt>
                <dd className="font-medium text-[#1F1B17] mt-0.5">
                  {adminUser?.email || "Loading..."}
                </dd>
              </div>
              <div>
                <dt className="text-[#8C7A78]">Assigned Role</dt>
                <dd className="font-medium text-[#6D1826] uppercase font-mono mt-0.5">
                  {adminUser?.role || "admin"}
                </dd>
              </div>
              <div>
                <dt className="text-[#8C7A78]">Server Privileges</dt>
                <dd className="font-medium text-[#059669] mt-0.5">
                  Enforced via DRF IsAdminUser
                </dd>
              </div>
              <div>
                <dt className="text-[#8C7A78]">Authorization Level</dt>
                <dd className="font-medium text-[#1F1B17] mt-0.5">
                  Atelier Operations Staff & Admin
                </dd>
              </div>
            </dl>
          </div>

          <p className="text-xs text-[#8C7A78] leading-relaxed">
            Administrative route protection is active. Unauthorized customer access is rejected
            at both the API gateway and client router level. Subsequent admin modules will be
            mounted under this authorized root.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-xs text-[#9E8E8B] border-t border-[#EBE2D8] bg-white">
        © 2024 Closet by Chilli. Atelier Operations Console.
      </footer>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminConsoleContent />
    </AdminGuard>
  );
}
