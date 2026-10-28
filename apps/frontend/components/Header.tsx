"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthProvider";

export default function Header() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { itemCount, subtotal, openDrawer } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const shopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  useEffect(() => {
    const handleOpenSearch = () => {
      setMobileSearchOpen(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("open-mobile-search", handleOpenSearch);
    return () => window.removeEventListener("open-mobile-search", handleOpenSearch);
  }, []);

  const handleShopEnter = () => {
    if (shopTimeoutRef.current) clearTimeout(shopTimeoutRef.current);
    setShopOpen(true);
  };

  const handleShopLeave = () => {
    shopTimeoutRef.current = setTimeout(() => setShopOpen(false), 180);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const formattedSubtotal = Number(subtotal || 0).toLocaleString("en-IN");

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "bg-surface/98 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-b border-outline-variant/30"
            : "bg-surface/95 backdrop-blur-sm shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/20"
        }`}
      >
        {/* ── Top Announcement Bar ── */}
        <div className="bg-inverse-surface text-secondary-fixed py-1.5 sm:py-2 text-center font-label-caps text-[9px] sm:text-label-caps tracking-wider sm:tracking-widest uppercase px-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2">
          <span className="material-symbols-outlined text-[13px] sm:text-[14px] text-secondary-fixed shrink-0">
            local_shipping
          </span>
          <span className="line-clamp-1">COMPLIMENTARY DOMESTIC SHIPPING ON ORDERS &gt; ₹2,999</span>
          <span className="opacity-40 hidden sm:inline">|</span>
          <span className="hidden sm:inline">EXPRESS DISPATCH ACROSS INDIA</span>
        </div>

        {/* ── Main Navigation Bar ── */}
        <div className="h-14 sm:h-16 md:h-20 max-w-360 mx-auto px-3 sm:px-6 lg:px-12 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          {/* Left: Mobile Menu Trigger + Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-8">
            <button
              type="button"
              aria-label="Open mobile navigation"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-on-surface hover:text-primary transition-colors focus:outline-none"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>

            <Link
              href="/"
              data-path="home"
              className="flex items-center gap-3 shrink-0 py-1 focus:outline-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Closet by Chili Logo"
                className="h-10 sm:h-12 md:h-13 w-auto object-contain transition-transform duration-200 hover:scale-[1.02]"
                src="/assets/brand/logo.png"
              />
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-7">
              <Link
                href="/products?collection=new-arrivals"
                data-path="new-arrivals"
                className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors py-2 relative flex items-center gap-1.5 font-medium"
              >
                <span>New Arrivals</span>
                <span className="bg-primary text-on-primary text-[8px] font-bold px-1.5 py-0.5 leading-none tracking-normal">
                  NEW
                </span>
              </Link>

              {/* Shop Dropdown */}
              <div
                className="relative group py-2"
                onMouseEnter={handleShopEnter}
                onMouseLeave={handleShopLeave}
              >
                <Link
                  href="/products"
                  data-path="shop"
                  className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-medium"
                >
                  <span>Shop</span>
                  <span
                    className={`material-symbols-outlined text-[16px] text-outline transition-transform duration-200 ${
                      shopOpen ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </Link>

                {shopOpen && (
                  <div className="absolute top-full left-0 flex flex-col bg-surface shadow-xl border border-outline-variant/30 py-2 w-52 z-50 rounded-xs animate-fade-in">
                    <Link
                      href="/products?category=dresses"
                      data-path="dresses"
                      onClick={() => setShopOpen(false)}
                      className="px-4 py-2 text-body-sm hover:bg-surface-container hover:text-primary transition-colors"
                    >
                      Dresses &amp; Gowns
                    </Link>
                    <Link
                      href="/products?category=anarkali-sets"
                      data-path="festive-sets"
                      onClick={() => setShopOpen(false)}
                      className="px-4 py-2 text-body-sm hover:bg-surface-container hover:text-primary transition-colors"
                    >
                      Anarkali Sets
                    </Link>
                    <Link
                      href="/products?category=kurtis"
                      data-path="kurtas-and-tunics"
                      onClick={() => setShopOpen(false)}
                      className="px-4 py-2 text-body-sm hover:bg-surface-container hover:text-primary transition-colors"
                    >
                      Kurtas &amp; Tunics
                    </Link>
                    <Link
                      href="/products?category=co-ord-sets"
                      data-path="co-ord-sets"
                      onClick={() => setShopOpen(false)}
                      className="px-4 py-2 text-body-sm hover:bg-surface-container hover:text-primary transition-colors"
                    >
                      Co-ord Sets
                    </Link>
                    <Link
                      href="/categories"
                      data-path="all-categories"
                      onClick={() => setShopOpen(false)}
                      className="px-4 py-2 text-body-sm font-semibold border-t border-outline-variant/30 text-primary hover:bg-surface-container transition-colors flex items-center justify-between"
                    >
                      <span>All Categories</span>
                      <span className="material-symbols-outlined text-[14px]">east</span>
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/products?collection=bestsellers"
                data-path="bestsellers"
                className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors py-2 font-medium"
              >
                Bestsellers
              </Link>

              <Link
                href="/products?collection=festive"
                data-path="festive"
                className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors py-2 relative flex items-center gap-1.5 font-medium"
              >
                <span>Festive</span>
                <span className="bg-secondary text-on-secondary text-[8px] font-bold px-1.5 py-0.5 leading-none tracking-normal">
                  HOT
                </span>
              </Link>

              <Link
                href="/#brand-manifesto"
                data-path="about"
                className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors py-2 font-medium"
              >
                About
              </Link>
            </nav>
          </div>

          {/* Right: Search + Utility Actions */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            {/* Desktop Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="hidden md:flex items-center bg-surface-container-low px-3.5 py-1.5 w-52 lg:w-68 border border-outline-variant/40 rounded-full focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-outline mr-2 shrink-0">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dresses, kurtis..."
                className="bg-transparent text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none w-full"
              />
            </form>

            <div className="flex items-center gap-2.5 sm:gap-4 text-on-surface">
              {/* Mobile Search Toggle */}
              <button
                type="button"
                aria-label="Search"
                onClick={() => setMobileSearchOpen((prev) => !prev)}
                className="md:hidden flex items-center justify-center p-1.5 text-on-surface-variant hover:text-on-surface focus:outline-none"
              >
                <span className="material-symbols-outlined text-[22px]">search</span>
              </button>

              {/* Wishlist Link */}
              <Link
                href="/account?tab=wishlist"
                data-path="wishlist"
                aria-label="Wishlist"
                className="relative p-1.5 text-on-surface-variant hover:text-primary transition-colors flex items-center focus:outline-none"
              >
                <span className="material-symbols-outlined text-[22px]">favorite</span>
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-on-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  0
                </span>
              </Link>

              {/* Shopping Bag Button (Triggers Drawer) */}
              <button
                type="button"
                data-path="cart"
                aria-label="Shopping bag"
                onClick={openDrawer}
                className="relative p-1.5 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 focus:outline-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
                <span className="hidden lg:inline-block font-label-ui text-label-ui text-on-surface font-semibold">
                  ₹{formattedSubtotal} ({itemCount})
                </span>
                <span className="lg:hidden absolute -top-0.5 -right-0.5 bg-primary text-on-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {itemCount}
                </span>
              </button>

              {/* Sign In / Account Link */}
              <Link
                href={user ? "/account" : "/login"}
                data-path="account"
                aria-label="Account"
                className="hidden sm:flex items-center gap-1.5 pl-1 text-on-surface hover:text-primary transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-surface-container border border-outline-variant/50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                    person
                  </span>
                </div>
                <span className="font-label-caps text-[11px] tracking-wider uppercase font-semibold">
                  {user ? "Account" : "Sign In"}
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Mobile Search Bar Expandable ── */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 pb-3 pt-1 border-t border-outline-variant/20 bg-surface">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center bg-surface-container-low px-3 py-2 border border-outline-variant/40 rounded-full"
            >
              <span className="material-symbols-outlined text-[18px] text-outline mr-2">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dresses, kurtis..."
                className="bg-transparent text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none w-full"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-outline text-xs px-1"
                >
                  ✕
                </button>
              )}
            </form>
          </div>
        )}
      </header>

      {/* ── Mobile Navigation Drawer ── */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 z-50 flex lg:hidden animate-fade-in"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Content */}
          <aside className="relative w-5/6 max-w-sm bg-surface h-full shadow-2xl flex flex-col z-10 overflow-y-auto" data-lenis-prevent>
            {/* Drawer Header */}
            <div className="pt-safe px-4 py-3.5 flex items-center justify-between border-b border-outline-variant/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Closet by Chili Logo"
                className="h-9 w-auto object-contain"
                src="/assets/brand/logo.png"
              />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-on-surface hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Curated Collections Section */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="font-label-caps text-[10px] tracking-[0.2em] uppercase text-text-muted mb-2 font-semibold">
                Curated Collections
              </div>

              <div className="flex flex-col">
                <Link
                  href="/products?collection=new-arrivals"
                  data-path="new-arrivals"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 flex items-center justify-between border-b border-outline-variant/20 text-on-surface hover:text-primary transition-colors font-medium text-body-md"
                >
                  <div className="flex items-center gap-2">
                    <span>New Arrivals</span>
                    <span className="bg-primary text-on-primary text-[8.5px] font-bold px-1.5 py-0.5 leading-none">
                      NEW
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
                </Link>

                <Link
                  href="/products?category=co-ord-sets"
                  data-path="co-ord-sets"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 flex items-center justify-between border-b border-outline-variant/20 text-on-surface hover:text-primary transition-colors font-medium text-body-md"
                >
                  <span>Co-ord Sets</span>
                  <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
                </Link>

                <Link
                  href="/products?category=kurtis"
                  data-path="kurtas-and-tunics"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 flex items-center justify-between border-b border-outline-variant/20 text-on-surface hover:text-primary transition-colors font-medium text-body-md"
                >
                  <span>Kurtas &amp; Tunics</span>
                  <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
                </Link>

                <Link
                  href="/products?category=dresses"
                  data-path="dresses"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 flex items-center justify-between border-b border-outline-variant/20 text-on-surface hover:text-primary transition-colors font-medium text-body-md"
                >
                  <span>Dresses &amp; Gowns</span>
                  <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
                </Link>

                <Link
                  href="/products?category=anarkali-sets"
                  data-path="festive-sets"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 flex items-center justify-between border-b border-outline-variant/20 text-primary transition-colors font-medium text-body-md"
                >
                  <div className="flex items-center gap-2">
                    <span>Festive &amp; Anarkalis</span>
                    <span className="bg-secondary text-on-secondary text-[8.5px] font-bold px-1.5 py-0.5 leading-none">
                      HOT
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-primary text-[16px]">arrow_forward</span>
                </Link>

                <Link
                  href="/products?collection=bestsellers"
                  data-path="bestsellers"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 flex items-center justify-between border-b border-outline-variant/20 text-on-surface hover:text-primary transition-colors font-medium text-body-md"
                >
                  <span>Bestsellers</span>
                  <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
                </Link>

                <Link
                  href="/categories"
                  data-path="all-categories"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 flex items-center justify-between border-b border-outline-variant/20 text-primary font-semibold text-body-md"
                >
                  <span>All Categories</span>
                  <span className="material-symbols-outlined text-primary text-[16px]">east</span>
                </Link>
              </div>

              {/* Client Suite Section */}
              <div className="mt-6 pt-4 border-t border-outline-variant/30 flex flex-col gap-2">
                <div className="font-label-caps text-[10px] tracking-[0.2em] uppercase text-text-muted mb-1 font-semibold">
                  Client Suite
                </div>
                <Link
                  href={user ? "/account" : "/login"}
                  data-path="account"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 py-2 text-on-surface hover:text-primary transition-colors text-body-md"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">account_circle</span>
                  <span>{user ? "My Account & Orders" : "Sign In / Register"}</span>
                </Link>

                <Link
                  href="/account?tab=wishlist"
                  data-path="wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 py-2 text-on-surface hover:text-primary transition-colors text-body-md"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">favorite</span>
                  <span>Saved Pieces (Wishlist)</span>
                </Link>

                <Link
                  href="/#brand-manifesto"
                  data-path="about"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 py-2 text-on-surface hover:text-primary transition-colors text-body-md"
                >
                  <span className="material-symbols-outlined text-[20px] text-secondary">auto_stories</span>
                  <span>Our Atelier Story</span>
                </Link>
              </div>
            </div>

            {/* Drawer Footer Perks & Heritage Note */}
            <div className="mt-auto p-4 bg-surface-container-low border-t border-outline-variant/20 flex flex-col gap-2.5 pb-safe">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  local_shipping
                </span>
                <span>Complimentary Shipping &gt; ₹2,999</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  verified
                </span>
                <span>Pure Silk &amp; Handcrafted Weaves</span>
              </div>
              <p className="font-title-editorial text-[11px] italic text-on-surface-variant text-center pt-1 border-t border-outline-variant/20">
                Bespoke Indian heritage tailored for modern silhouettes.
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
