"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import {
  NAV_LINKS,
  SHOP_BY_TYPE,
  SHOP_BY_SET_NAV,
} from "@/lib/homepage-data";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthProvider";

export interface HeaderProps {
  variant?: "solid" | "transparent";
}

export default function Header() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [wishlistCount] = useState(0);
  const { itemCount, openDrawer } = useCart();
  const shopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function getInitials(name: string, fallback: string): string {
    const trimmed = (name || "").trim();
    const source = trimmed.length > 0 ? trimmed : fallback;
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "C";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  async function handleSignOutMobile() {
    setMobileOpen(false);
    try {
      await signOut();
    } catch {
      // ignore — at worst, session already cleared client-side
    }
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleShopEnter = () => {
    if (shopTimeoutRef.current) clearTimeout(shopTimeoutRef.current);
    setShopOpen(true);
  };

  const handleShopLeave = () => {
    shopTimeoutRef.current = setTimeout(() => setShopOpen(false), 200);
  };

  // Always solid — ivory background, dark text, dark logo
  const headerContainerClasses = scrolled
    ? "bg-[#fff8f7] border-b border-[#111111]/10 shadow-[0_2px_18px_rgba(0,0,0,0.07)]"
    : "bg-[#fff8f7] border-b border-[#111111]/8 shadow-[0_1px_6px_rgba(0,0,0,0.04)]";

  const navLinkClasses = "text-[#111111]/85 hover:text-[#8b000a]";
  const iconClasses = "text-[#111111]/80 hover:text-[#8b000a]";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300 ease-in-out ${headerContainerClasses}`}
      >
        {/* Main Header Bar: Logo on LEFT, Navigation in CENTER, Icons on RIGHT */}
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 h-[72px] sm:h-[80px] lg:h-[88px] flex items-center justify-between relative">
          {/* ── LEFT ZONE: hamburger + desktop logo ── */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {/* Mobile Hamburger Button */}
            <button
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className={`lg:hidden p-1.5 -ml-1 transition-colors duration-300 ${iconClasses}`}
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>

            {/* Logo — Desktop only, stays in left zone */}
            <Link
              href="/"
              aria-label="Closet by Chili Home"
              className="hidden lg:flex items-center group focus:outline-none"
            >
              <div className="relative w-[136px] h-[74px]">
                <Image
                  src="/assets/brand/logo.png"
                  alt="Closet by Chili"
                  fill
                  sizes="155px"
                  className="object-contain object-center"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Logo — Mobile only, absolutely centered in the viewport */}
          <Link
            href="/"
            aria-label="Closet by Chili Home"
            className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center group focus:outline-none z-10"
          >
            <div className="relative w-[110px] h-[60px]">
              <Image
                src="/assets/brand/logo.png"
                alt="Closet by Chili"
                fill
                sizes="120px"
                className="object-contain object-center"
                priority
              />
            </div>
          </Link>

          {/* ── CENTER ZONE: DESKTOP NAVIGATION ── */}
          <nav className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 mx-auto px-4">
            {NAV_LINKS.map((link) =>
              link.label === "Shop" ? (
                <div
                  key={link.label}
                  className="relative flex items-center"
                  onMouseEnter={handleShopEnter}
                  onMouseLeave={handleShopLeave}
                >
                  <Link
                    href={link.href}
                    className={`inline-flex items-center text-[12px] font-medium uppercase tracking-[0.18em] transition-colors duration-300 py-2 whitespace-nowrap ${navLinkClasses}`}
                  >
                    Shop
                  </Link>

                  {/* Mega Menu Dropdown */}
                  {shopOpen && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 top-full pt-3 animate-fade-in z-50"
                      onMouseEnter={handleShopEnter}
                      onMouseLeave={handleShopLeave}
                    >
                      <div className="w-[420px] bg-[#fff8f7] border border-ink/10 shadow-2xl p-6 grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b000a] mb-3.5 border-b border-ink/8 pb-2">
                            Shop by Type
                          </p>
                          <ul className="space-y-2">
                            {SHOP_BY_TYPE.map((item) => (
                              <li key={item.label}>
                                <Link
                                  href={item.href}
                                  onClick={() => setShopOpen(false)}
                                  className="text-[12px] text-ink/75 hover:text-[#8b000a] transition-colors block py-0.5"
                                >
                                  {item.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b000a] mb-3.5 border-b border-ink/8 pb-2">
                            Shop by Set
                          </p>
                          <ul className="space-y-2">
                            {SHOP_BY_SET_NAV.map((item) => (
                              <li key={item.label}>
                                <Link
                                  href={item.href}
                                  onClick={() => setShopOpen(false)}
                                  className="text-[12px] text-ink/75 hover:text-[#8b000a] transition-colors block py-0.5"
                                >
                                  {item.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`inline-flex items-center text-[12px] font-medium uppercase tracking-[0.18em] transition-colors duration-300 py-2 whitespace-nowrap ${navLinkClasses}`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* ── RIGHT ZONE: ICONS (Search, Wishlist, Account, Shopping Bag) ── */}
          <div className="flex items-center justify-end gap-3.5 sm:gap-5 flex-shrink-0">
            {/* Search */}
            <button
              aria-label="Search collection"
              className={`p-1.5 transition-colors duration-300 ${iconClasses}`}
            >
              <Search size={19} strokeWidth={1.5} />
            </button>

            {/* Wishlist */}
            <button
              aria-label="View wishlist"
              className={`relative p-1.5 transition-colors duration-300 hidden sm:block ${iconClasses}`}
            >
              <Heart size={19} strokeWidth={1.5} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#8b000a] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Account */}
            <Link
              href={user ? "/account" : "/login"}
              aria-label={user ? "Customer account" : "Sign in to your account"}
              title={user ? "My Account" : "Sign In"}
              className={`inline-flex items-center justify-center transition-colors duration-300 ${iconClasses} ${
                user
                  ? "relative p-0 -my-0.5"
                  : "p-1.5"
              }`}
            >
              {user ? (
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/70 bg-[#fff8f7] font-[var(--font-cinzel)] text-[12px] text-[#680007] shadow-sm ring-1 ring-black/10"
                >
                  {getInitials(user.profile.display_name ?? "", user.email)}
                </span>
              ) : (
                <User size={19} strokeWidth={1.5} />
              )}
            </Link>

            {/* Shopping Bag */}
            <button
              aria-label="Shopping bag"
              onClick={openDrawer}
              className={`relative p-1.5 transition-colors duration-300 ${iconClasses}`}
            >
              <ShoppingBag size={19} strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#8b000a] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE SLIDE-IN DRAWER ───────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <nav className="absolute inset-y-0 left-0 w-[320px] max-w-[85vw] bg-[#fff8f7] animate-slide-in flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink/8">
              <div className="relative w-[105px] h-[56px]">
                <Image
                  src="/assets/brand/logo.png"
                  alt="Closet by Chili"
                  fill
                  sizes="105px"
                  className="object-contain object-left"
                />
              </div>
              <button
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
                className="text-ink/60 hover:text-[#8b000a] p-1 transition-colors"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            {/* Links List */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Primary links */}
              <ul className="space-y-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-2.5 text-[13px] font-medium uppercase tracking-[0.18em] text-ink hover:text-[#8b000a] transition-colors border-b border-ink/6"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Shop by Type */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b000a] mb-2.5">
                  Categories
                </p>
                <ul className="space-y-1.5 pl-2 border-l border-ink/10">
                  {SHOP_BY_TYPE.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="text-[12px] text-ink/70 hover:text-[#8b000a] transition-colors block py-1"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shop by Set */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b000a] mb-2.5">
                  Sets & Co-ords
                </p>
                <ul className="space-y-1.5 pl-2 border-l border-ink/10">
                  {SHOP_BY_SET_NAV.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="text-[12px] text-ink/70 hover:text-[#8b000a] transition-colors block py-1"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Drawer Account */}
            <div className="px-6 pt-5 border-t border-ink/8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b000a] mb-3">
                Account
              </p>
              {user ? (
                <div className="space-y-3">
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 p-3 -mx-2 rounded-md hover:bg-white transition-colors"
                  >
                    <span
                      aria-hidden
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/70 bg-[#fff8f7] font-[var(--font-cinzel)] text-[14px] text-[#680007] shadow-sm ring-1 ring-black/10"
                    >
                      {getInitials(user.profile.display_name ?? "", user.email)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {user.profile.display_name || "My Profile"}
                      </p>
                      <p className="truncate text-[11px] text-ink/50">
                        {user.email}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOutMobile}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#680007]/15 bg-ivory px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#680007] transition-colors hover:bg-[#680007] hover:text-white"
                  >
                    <LogOut size={14} strokeWidth={1.75} />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center rounded-md border border-[#680007]/20 bg-white px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-[#680007] transition-colors hover:bg-[#680007] hover:text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center rounded-md bg-[#680007] px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-white shadow-sm transition-opacity hover:opacity-95"
                  >
                    Join
                  </Link>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-5 border-t border-ink/8 bg-blush-soft">
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-ink/60">
                Bold · Feminine · Timeless
              </p>
              <p className="text-[9px] text-ink/40 mt-1">
                Handcrafted Luxury Indian Fashion
              </p>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
