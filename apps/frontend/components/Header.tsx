"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import {
  NAV_LINKS,
  SHOP_BY_TYPE,
  SHOP_BY_SET,
} from "@/lib/homepage-data";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const shopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
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

  const headerBg = scrolled
    ? "bg-cream/95 backdrop-blur-md border-b border-ink/8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    : "bg-transparent border-b border-transparent";

  const textColor = scrolled ? "text-ink" : "text-white";
  const iconColor = scrolled
    ? "text-ink/70 hover:text-ink"
    : "text-white/80 hover:text-white";

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${headerBg}`}
      >
        <div className="mx-auto flex h-20 sm:h-[84px] lg:h-[92px] max-w-[1400px] items-center justify-between px-5 lg:px-10">
          {/* ── Left: Logo ───────────────────────────────── */}
          <Link href="/" className="relative z-10 flex-shrink-0 flex items-center py-1" aria-label="Closet by Chili Home">
            <div className="relative overflow-hidden flex items-center justify-center h-[56px] w-[96px] sm:h-[64px] sm:w-[110px] lg:h-[74px] lg:w-[126px]">
              <Image
                src="/assets/brand/logo.png"
                alt="Closet by Chili"
                width={240}
                height={240}
                className={`h-[126px] w-[126px] sm:h-[144px] sm:w-[144px] lg:h-[166px] lg:w-[166px] max-w-none object-contain transition-all duration-300 ${
                  scrolled ? "" : "brightness-0 invert"
                }`}
                priority
              />
            </div>
          </Link>

          {/* ── Center: Desktop Nav ──────────────────────── */}
          <nav className="hidden lg:flex items-center gap-8">
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
                    className={`inline-flex items-center text-[11px] font-medium uppercase tracking-[0.18em] transition-colors ${textColor} hover:text-chili`}
                  >
                    Shop
                  </Link>

                  {/* ── Mega Menu ──────────────────────── */}
                  {shopOpen && (
                    <div
                      className="absolute left-1/2 top-full pt-4 -translate-x-1/2 animate-fade-in"
                      onMouseEnter={handleShopEnter}
                      onMouseLeave={handleShopLeave}
                    >
                      <div className="w-[480px] bg-cream border border-ink/8 shadow-lg p-8 grid grid-cols-2 gap-10">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-chili mb-4">
                            Shop by Type
                          </p>
                          <ul className="space-y-2.5">
                            {SHOP_BY_TYPE.map((item) => (
                              <li key={item.label}>
                                <Link
                                  href={item.href}
                                  className="text-xs text-ink/65 hover:text-chili transition-colors"
                                >
                                  {item.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-chili mb-4">
                            Shop by Set
                          </p>
                          <ul className="space-y-2.5">
                            {SHOP_BY_SET.map((item) => (
                              <li key={item.label}>
                                <Link
                                  href={item.href}
                                  className="text-xs text-ink/65 hover:text-chili transition-colors"
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
                  className={`inline-flex items-center text-[11px] font-medium uppercase tracking-[0.18em] transition-colors ${textColor} hover:text-chili`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* ── Right: Icons ─────────────────────────────── */}
          <div className="flex items-center gap-4">
            <button
              aria-label="Search"
              className={`hidden lg:block transition-colors ${iconColor}`}
            >
              <Search size={18} strokeWidth={1.5} />
            </button>

            <button
              aria-label="Shopping bag"
              className={`transition-colors ${iconColor}`}
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
            </button>

            {/* Mobile hamburger */}
            <button
              aria-label="Open navigation menu"
              className={`lg:hidden transition-colors ${iconColor}`}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ───────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <nav className="absolute inset-y-0 left-0 w-[300px] max-w-[85vw] bg-cream animate-slide-in flex flex-col">
            {/* Close */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink/8">
              <div className="relative overflow-hidden flex items-center justify-center h-[52px] w-[90px]">
                <Image
                  src="/assets/brand/logo.png"
                  alt="Closet by Chili"
                  width={160}
                  height={160}
                  className="h-[116px] w-[116px] max-w-none object-contain"
                />
              </div>
              <button
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
                className="text-ink/60 hover:text-ink p-1"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            {/* Links */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <ul className="space-y-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-3 text-sm font-medium uppercase tracking-[0.12em] text-ink/80 hover:text-chili transition-colors border-b border-ink/6"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Shop by Type */}
              <div className="mt-8">
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-chili mb-3">
                  Shop by Type
                </p>
                <ul className="space-y-2">
                  {SHOP_BY_TYPE.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="text-xs text-ink/55 hover:text-chili transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shop by Set */}
              <div className="mt-6">
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-chili mb-3">
                  Shop by Set
                </p>
                <ul className="space-y-2">
                  {SHOP_BY_SET.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="text-xs text-ink/55 hover:text-chili transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="px-6 py-4 border-t border-ink/8">
              <p className="text-[9px] uppercase tracking-[0.3em] text-ink/35">
                Bold · Feminine · Timeless
              </p>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
