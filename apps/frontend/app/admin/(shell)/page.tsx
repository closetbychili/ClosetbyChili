"use client";

import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  Diamond,
  FolderTree,
  Image,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  TicketPercent,
  UserCheck,
  Users,
  Warehouse,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminContext } from "@/components/admin/AdminGuard";

export default function AdminOverviewPage() {
  const { adminUser } = useAdminContext();

  const quickLinks = [
    { title: "Products", href: "/admin/products", icon: Package, count: "Catalog" },
    { title: "Categories", href: "/admin/categories", icon: FolderTree, count: "Taxonomy" },
    { title: "Collections", href: "/admin/collections", icon: Sparkles, count: "Curations" },
    { title: "Media Library", href: "/admin/media", icon: Image, count: "Assets" },
    { title: "Inventory", href: "/admin/inventory", icon: Warehouse, count: "Stock Ledger" },
    { title: "Orders", href: "/admin/orders", icon: ClipboardList, count: "Fulfillment" },
    { title: "Coupons", href: "/admin/coupons", icon: TicketPercent, count: "Promotions" },
    { title: "Customers", href: "/admin/customers", icon: Users, count: "Patrons" },
    { title: "Analytics", href: "/admin/analytics", icon: BarChart3, count: "Reports" },
    { title: "Settings", href: "/admin/settings", icon: Settings, count: "Configuration" },
  ];

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Atelier Operations Overview"
        description="Closet by Chilli administrative management console."
      />

      {/* Verified Admin Session Card */}
      <div className="bg-white rounded-2xl shadow-[0_10px_35px_-4px_rgba(79,0,18,0.04)] border border-[#EBE2D8] p-6 sm:p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-semibold text-[#1F1B17]">
              Active Administrator Session
            </h2>
            <p className="text-xs text-[#554243] mt-0.5">
              Authenticated and verified via Supabase Auth & Django REST Framework
            </p>
          </div>
        </div>

        <div className="bg-[#FAF6F2] rounded-xl border border-[#E6DDD3] p-5">
          <h3 className="text-xs font-semibold text-[#1F1B17] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-[#6D1826]" />
            <span>Identity Details</span>
          </h3>

          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <dt className="text-[#8C7A78]">Account Email</dt>
              <dd className="font-medium text-[#1F1B17] mt-0.5 truncate">{adminUser.email}</dd>
            </div>
            <div>
              <dt className="text-[#8C7A78]">Assigned Role</dt>
              <dd className="font-semibold text-[#6D1826] uppercase font-mono mt-0.5">
                {adminUser.role}
              </dd>
            </div>
            <div>
              <dt className="text-[#8C7A78]">Privilege Status</dt>
              <dd className="font-medium text-[#059669] mt-0.5">IsAdminUser Enforced</dd>
            </div>
            <div>
              <dt className="text-[#8C7A78]">Atelier Access</dt>
              <dd className="font-medium text-[#1F1B17] mt-0.5">Full Operations Shell</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Module Navigation Grid */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1F1B17] mb-4 flex items-center gap-2">
          <Diamond className="w-3.5 h-3.5 text-[#6D1826] fill-current" />
          <span>Management Modules</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-xl border border-[#EBE2D8] hover:border-[#6D1826] p-4 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-[#FCF2EB] group-hover:bg-[#6D1826] group-hover:text-white flex items-center justify-center text-[#6D1826] transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8C7A78] bg-[#FAF6F2] px-2 py-0.5 rounded-md">
                    {item.count}
                  </span>
                </div>
                <div>
                  <h3 className="font-serif text-sm font-semibold text-[#1F1B17] group-hover:text-[#6D1826] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-[#554243] mt-0.5">
                    Access {item.title.toLowerCase()} console
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
