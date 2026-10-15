"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  Shield,
  UserCheck,
} from "lucide-react";

import { ADMIN_NAV_ITEMS } from "./nav-config";
import { useAdminContext } from "./AdminGuard";

interface AdminHeaderProps {
  onOpenMobileNav: () => void;
}

export default function AdminHeader({ onOpenMobileNav }: AdminHeaderProps) {
  const pathname = usePathname();
  const { adminUser, signOut } = useAdminContext();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Determine current active section title from pathname
  const currentItem =
    ADMIN_NAV_ITEMS.find((item) =>
      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
    ) || { title: "Admin Console" };

  // Close account menu on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAccountMenuOpen(false);
      }
    }

    if (accountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  return (
    <header className="w-full bg-white border-b border-[#EBE2D8] h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Menu Trigger & Section Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-[#554243] hover:text-[#1F1B17] hover:bg-[#FAF6F2] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D1826] cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8C7A78] hidden sm:inline-block">
            Atelier Console
          </span>
          <span className="text-[#A89895] hidden sm:inline-block">/</span>
          <h2 className="text-base font-serif font-semibold text-[#1F1B17]">
            {currentItem.title}
          </h2>
        </div>
      </div>

      {/* Right: Quick Links & Account Menu */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#554243] hover:text-[#4F0012] hover:bg-[#FAF6F2] transition-colors"
        >
          <span>Storefront</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>

        {/* Staff Account Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            id="staff-account-menu-button"
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-[#E6DDD3] hover:border-[#6D1826] bg-[#FAF6F2] transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#6D1826] cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-[#FCF2EB] border border-[#EAE1DB] flex items-center justify-center text-[#6D1826] text-xs font-semibold shrink-0">
              {adminUser.email ? adminUser.email.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-xs font-medium text-[#1F1B17] truncate max-w-[140px]">
                {adminUser.email}
              </span>
              <span className="text-[10px] text-[#059669] font-medium leading-none">
                Verified Admin
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#8C7A78] transition-transform ${
                accountMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Account Menu Dropdown */}
          {accountMenuOpen && (
            <div
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="staff-account-menu-button"
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[#EBE2D8] py-2 z-50 animate-fade-in text-xs"
            >
              {/* Account Header */}
              <div className="px-4 py-2.5 border-b border-[#F2EBE3]">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-[#6D1826]" />
                  <span className="font-semibold text-[#1F1B17] truncate">
                    {adminUser.email}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#059669] font-medium">
                  <Shield className="w-3 h-3" />
                  <span>Administrative Role: {adminUser.role}</span>
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-1">
                <Link
                  href="/admin/settings"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-[#554243] hover:text-[#1F1B17] hover:bg-[#FAF6F2] transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-[#8C7A78]" />
                  <span>Admin Settings</span>
                </Link>

                <Link
                  href="/"
                  role="menuitem"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-[#554243] hover:text-[#1F1B17] hover:bg-[#FAF6F2] transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#8C7A78]" />
                  <span>Open Storefront in New Tab</span>
                </Link>
              </div>

              {/* Sign Out Action */}
              <div className="border-t border-[#F2EBE3] pt-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setAccountMenuOpen(false);
                    await signOut();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[#93000A] hover:bg-[#FFF2F2] transition-colors text-left cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
