"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import AdminSidebar from "./AdminSidebar";

interface AdminMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminMobileDrawer({ isOpen, onClose }: AdminMobileDrawerProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Admin Navigation Menu"
      id="mobile-nav-drawer"
      className="fixed inset-0 z-50 lg:hidden flex"
    >
      {/* Backdrop */}
      <div
        data-testid="admin-drawer-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-fade-in cursor-pointer"
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative z-10 w-72 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col justify-between animate-slide-in-right">
        {/* Close Button Header */}
        <div className="absolute top-4 right-3 z-20">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-[#554243] hover:text-[#1F1B17] hover:bg-[#FAF6F2] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D1826] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Content */}
        <AdminSidebar onNavigate={onClose} className="w-full border-r-0" />
      </div>
    </div>
  );
}
