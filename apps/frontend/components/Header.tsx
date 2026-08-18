"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
} from "lucide-react";
import {
  NAV_LINKS,
  SHOP_BY_TYPE,
  SHOP_BY_SET_NAV,
} from "@/lib/homepage-data";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [wishlistCount] = useState(0);
  const [cartCount] = useState(0);
  const shopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // State-dependent styles
  const headerContainerClasses = scrolled
    ? "bg-[#fff8f7]/96 backdrop-blur-[12px] border-b border-[#111111]/8 shadow-[0_2px_14px_rgba(0,0,0,0.05)]"
    : "bg-black/[0.08] backdrop-blur-[8px] border-b border-white/10 shadow-none";

  const navLinkClasses = scrolled
    ? "text-[#111111]/85 hover:text-[#8b000a]"
    : "text-white/95 hover:text-gold drop-shadow-sm";

  const iconClasses = scrolled
    ? "text-[#111111]/80 hover:text-[#8b000a]"
    : "text-white/95 hover:text-gold drop-shadow-sm";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300 ease-in-out ${headerContainerClasses}`}
      >
        {/* Main Header Bar: Logo on LEFT, Navigation in CENTER, Icons on RIGHT */}
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 h-[72px] sm:h-[80px] lg:h-[88px] flex items-center justify-between">
          {/* ── LEFT ZONE: LOGO ON THE LEFT ── */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {/* Mobile Hamburger Button */}
            <button
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className={`lg:hidden p-1.5 -ml-1 transition-colors duration-300 ${iconClasses}`}
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>

            {/* Closet by Chili Logo */}
            <Link
              href="/"
              aria-label="Closet by Chili Home"
              className="flex items-center group focus:outline-none"
            >
              <div className="relative w-[136px] h-[74px] flex items-center">
                {/* White logo — transparent hero state */}
                <Image
                  src="/assets/brand/logo_white.png"
                  alt="Closet by Chili"
                  fill
                  sizes="155px"
                  className={`object-contain object-left transition-opacity duration-300 ${scrolled
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100"
                    }`}
                  priority
                />

                {/* Full-color logo — scrolled state */}
                <Image
                  src="/assets/brand/logo.png"
                  alt="Closet by Chili"
                  fill
                  sizes="155px"
                  className={`object-contain object-left transition-opacity duration-300 ${scrolled
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                    }`}
                  priority
                />
              </div>
            </Link>
          </div>

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
            <button
              aria-label="Customer account"
              className={`p-1.5 transition-colors duration-300 hidden lg:block ${iconClasses}`}
            >
              <User size={19} strokeWidth={1.5} />
            </button>

            {/* Shopping Bag */}
            <button
              aria-label="Shopping bag"
              className={`relative p-1.5 transition-colors duration-300 ${iconClasses}`}
            >
              <ShoppingBag size={19} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#8b000a] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
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
            <div className="flex items-center justify-between px-6 py-5 border-b border-ink/8">
              <div className="relative w-[145px]">
                <Image
                  src="/assets/brand/logo.png"
                  alt="Closet by Chili"
                  width={145}
                  height={99}
                  className="w-full h-auto object-contain object-left"
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
