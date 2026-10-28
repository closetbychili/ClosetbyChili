"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthProvider";

interface MobileBottomNavProps {
  onSearchClick?: () => void;
}

export default function MobileBottomNav({ onSearchClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useCart();
  const { user } = useAuth();

  const isHome = pathname === "/";
  const isCouture = pathname.startsWith("/categories") || pathname.startsWith("/products");
  const isAccount = pathname.startsWith("/account") || pathname.startsWith("/login");

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] pb-safe transition-all"
    >
      <div className="h-15 px-2 flex items-center justify-around max-w-md mx-auto">
        {/* 1. Shop / Home */}
        <Link
          href="/"
          data-path="home-storefront"
          className={`flex flex-col items-center justify-center min-w-13 h-full transition-colors ${
            isHome ? "text-primary font-semibold" : "text-on-surface-variant hover:text-primary"
          }`}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: isHome ? "'FILL' 1" : "'FILL' 0" }}
          >
            storefront
          </span>
          <span className="font-label-caps text-[9.5px] tracking-wider uppercase mt-0.5">
            Shop
          </span>
        </Link>

        {/* 2. Couture / Categories */}
        <Link
          href="/categories"
          data-path="category-listing"
          className={`flex flex-col items-center justify-center min-w-13 h-full transition-colors ${
            isCouture ? "text-primary font-semibold" : "text-on-surface-variant hover:text-primary"
          }`}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: isCouture ? "'FILL' 1" : "'FILL' 0" }}
          >
            auto_awesome
          </span>
          <span className="font-label-caps text-[9.5px] tracking-wider uppercase mt-0.5">
            Couture
          </span>
        </Link>

        {/* 3. Search */}
        <button
          type="button"
          onClick={onSearchClick}
          aria-label="Search Catalog"
          className="flex flex-col items-center justify-center min-w-13 h-full text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
        >
          <span className="material-symbols-outlined text-[22px]">search</span>
          <span className="font-label-caps text-[9.5px] tracking-wider uppercase mt-0.5">
            Search
          </span>
        </button>

        {/* 4. Bag / Cart */}
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Shopping Bag"
          className="relative flex flex-col items-center justify-center min-w-13 h-full text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
        >
          <div className="relative">
            <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary text-on-primary font-label-caps text-[9px] flex items-center justify-center font-bold">
                {itemCount}
              </span>
            )}
          </div>
          <span className="font-label-caps text-[9.5px] tracking-wider uppercase mt-0.5">
            Bag
          </span>
        </button>

        {/* 5. Account */}
        <Link
          href={user ? "/account" : "/login"}
          data-path="my-account"
          className={`flex flex-col items-center justify-center min-w-13 h-full transition-colors ${
            isAccount ? "text-primary font-semibold" : "text-on-surface-variant hover:text-primary"
          }`}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: isAccount ? "'FILL' 1" : "'FILL' 0" }}
          >
            person
          </span>
          <span className="font-label-caps text-[9.5px] tracking-wider uppercase mt-0.5">
            {user ? "Account" : "Sign In"}
          </span>
        </Link>
      </div>
    </nav>
  );
}
