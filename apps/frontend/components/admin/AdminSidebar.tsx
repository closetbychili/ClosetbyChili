"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Diamond, LogOut, Shield } from "lucide-react";

import { ADMIN_NAV_ITEMS, isRouteActive } from "./nav-config";
import { useAdminContext } from "./AdminGuard";

interface AdminSidebarProps {
  onNavigate?: () => void;
  className?: string;
}

export default function AdminSidebar({ onNavigate, className = "" }: AdminSidebarProps) {
  const pathname = usePathname();
  const { adminUser, signOut } = useAdminContext();

  const coreItems = ADMIN_NAV_ITEMS.filter((i) => i.section === "core");
  const catalogItems = ADMIN_NAV_ITEMS.filter((i) => i.section === "catalog");
  const operationsItems = ADMIN_NAV_ITEMS.filter((i) => i.section === "operations");
  const managementItems = ADMIN_NAV_ITEMS.filter((i) => i.section === "management");

  const renderNavSection = (label: string | null, items: typeof ADMIN_NAV_ITEMS) => (
    <div className="flex flex-col gap-1 mb-4">
      {label && (
        <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#8C7A78] mb-1">
          {label}
        </span>
      )}
      {items.map((item) => {
        const active = isRouteActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
              active
                ? "bg-[#6D1826] text-white font-medium shadow-xs"
                : "text-[#554243] hover:text-[#1F1B17] hover:bg-[#FAF6F2]"
            }`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-[#8C7A78]"}`}
            />
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <aside
      className={`w-64 bg-white border-r border-[#EBE2D8] flex flex-col justify-between shrink-0 h-full overflow-y-auto ${className}`}
    >
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#EBE2D8]">
          <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FCF2EB] flex items-center justify-center shadow-xs">
              <Diamond className="text-[#4F0012] w-4 h-4 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-sm font-semibold text-[#4F0012] leading-tight tracking-tight">
                Closet by Chilli
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6D1826]">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav aria-label="Admin Sidebar Navigation" className="p-3.5 flex flex-col">
          {renderNavSection(null, coreItems)}
          {renderNavSection("Catalog", catalogItems)}
          {renderNavSection("Operations", operationsItems)}
          {renderNavSection("Management", managementItems)}
        </nav>
      </div>

      {/* Footer Area: Storefront Link & Account Summary */}
      <div className="p-4 border-t border-[#EBE2D8] bg-[#FAF6F2] flex flex-col gap-3">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-[#E6DDD3] text-[#554243] hover:text-[#1F1B17] text-xs font-medium transition-colors shadow-2xs"
        >
          <span>View Storefront</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#8C7A78]" />
        </Link>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#FCF2EB] border border-[#EAE1DB] flex items-center justify-center text-[#6D1826] text-xs font-semibold shrink-0">
              {adminUser.email ? adminUser.email.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-[#1F1B17] truncate">
                {adminUser.email}
              </span>
              <span className="text-[10px] text-[#059669] flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                <span>Admin</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            title="Sign Out"
            aria-label="Sign out of admin console"
            className="p-1.5 rounded-md hover:bg-[#EBE2D8] text-[#8C7A78] hover:text-[#6D1826] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
