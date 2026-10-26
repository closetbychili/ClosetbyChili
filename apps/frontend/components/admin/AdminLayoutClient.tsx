"use client";

import { useEffect, useState, type ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminMobileDrawer from "./AdminMobileDrawer";

interface AdminLayoutClientProps {
  children: ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Global Admin Modal / Drawer Scroll Lock Observer:
  // Automatically prevents the background dashboard page from scrolling whenever
  // any modal, drawer, or dialog overlay is opened across the entire admin console.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const syncBodyScroll = () => {
      const activeModal = document.querySelector(
        '[role="dialog"], [aria-modal="true"], .fixed.inset-0.z-50, .fixed.inset-0.z-60'
      );
      if (activeModal) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };

    syncBodyScroll();

    const observer = new MutationObserver(syncBodyScroll);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F1E8] flex antialiased text-[#1F1B17]">
      {/* Desktop Sidebar (hidden on mobile) */}
      <AdminSidebar className="hidden lg:flex fixed top-0 left-0 bottom-0 z-30" />

      {/* Mobile Drawer (visible when open) */}
      <AdminMobileDrawer
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <AdminHeader onOpenMobileNav={() => setMobileNavOpen(true)} />

        {/* Page Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
