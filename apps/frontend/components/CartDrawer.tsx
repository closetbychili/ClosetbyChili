"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "./CartContext";
import { PRODUCT_IMAGE_MAP } from "@/lib/adapters/catalog-adapter";

export default function CartDrawer() {
  const router = useRouter();
  const {
    cart,
    itemCount,
    subtotal,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    isLoading,
    error,
    clearError,
  } = useCart();

  const drawerRef = useRef<HTMLDivElement>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>("CHILI10");
  const [couponSuccess, setCouponSuccess] = useState(true);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  if (!isDrawerOpen) return null;

  const items = cart?.items || [];
  const parsedSubtotal = parseFloat(subtotal) || 0;

  // Free shipping progress calculations
  const FREE_SHIPPING_GOAL = 2999;
  const isFreeShipping = parsedSubtotal >= FREE_SHIPPING_GOAL;
  const progressPercent = Math.min(
    100,
    Math.round((parsedSubtotal / FREE_SHIPPING_GOAL) * 100)
  );
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_GOAL - parsedSubtotal);

  // Voucher discount calculation
  const couponDiscount = appliedCoupon ? Math.round(parsedSubtotal * 0.1) : 0;
  const finalPayable = Math.max(0, parsedSubtotal - couponDiscount);
  const calculatedSavings = Math.round(parsedSubtotal * 0.28) + couponDiscount;

  const handleApplyCoupon = () => {
    const clean = couponCode.trim().toUpperCase();
    if (clean === "CHILI10" || clean === "MUSE10" || clean.length > 2) {
      setAppliedCoupon(clean || "CHILI10");
      setCouponSuccess(true);
    } else {
      setAppliedCoupon(null);
      setCouponSuccess(false);
    }
  };

  const handleProceedToCheckout = () => {
    closeDrawer();
    router.push("/checkout");
  };

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      {/* ── Fixed Backdrop Overlay ────────────────────────────── */}
      <div
        id="drawer-backdrop"
        onClick={closeDrawer}
        aria-hidden="true"
        className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in cursor-pointer"
      />

      {/* ── Slide-Out Cart Drawer ─────────────────────────────── */}
      <aside
        id="bag-drawer"
        ref={drawerRef}
        role="dialog"
        aria-label="Shopping Bag Drawer"
        aria-modal="true"
        className="relative z-10 w-full sm:w-[470px] md:w-[490px] max-w-full h-full bg-surface-card text-on-surface shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in-right border-l border-outline-variant/30"
      >
        {/* ── 1. DRAWER HEADER ───────────────────────────────── */}
        <div className="shrink-0 bg-surface-card px-6 pt-5 pb-4 shadow-sm z-10 border-b border-outline-variant/30">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">
                Shopping Bag
              </h2>
              <span
                id="bag-count-badge"
                className="font-label-caps text-label-caps text-primary font-bold tracking-widest"
              >
                ({itemCount} {itemCount === 1 ? "Item" : "Items"})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                id="close-drawer-btn"
                onClick={closeDrawer}
                aria-label="Close Shopping Bag"
                className="w-9 h-9 flex items-center justify-center bg-surface-container-low text-on-surface hover:bg-primary-container hover:text-on-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Free Shipping Dynamic Progress Tier */}
          <div className="bg-surface-container-low p-3.5 space-y-2 mt-1 border border-outline-variant/20">
            <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface">
              <span className="flex items-center gap-1.5 font-medium text-terracotta">
                <span
                  className="material-symbols-outlined text-[17px] text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_shipping
                </span>
                {isFreeShipping ? (
                  <span className="text-emerald-800 font-semibold">
                    Free Express Delivery &amp; Packaging Unlocked!
                  </span>
                ) : (
                  <span>
                    Add{" "}
                    <span className="font-bold text-primary font-price-regular text-body-sm">
                      ₹{remainingForFreeShipping.toLocaleString("en-IN")}
                    </span>{" "}
                    more to unlock Express Delivery
                  </span>
                )}
              </span>
              <span className="font-label-caps text-label-caps text-on-surface-variant font-semibold">
                {progressPercent}%
              </span>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full h-1.5 bg-surface-container-highest overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-terracotta via-primary-container to-secondary-fixed-dim transition-all duration-700 ease-in-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="font-label-caps text-[10px] tracking-wider text-text-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim inline-block" />
              Complimentary domestic shipping on orders above ₹2,999
            </p>
          </div>
        </div>

        {/* Global Error Notice if any */}
        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-body-sm font-body-sm rounded flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-rose-900 font-bold ml-2 text-base cursor-pointer"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* ── 2. BAG ITEMS LIST (SCROLLABLE AREA) ─────────────── */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
          data-lenis-prevent
        >
          {items.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[32px]">
                  shopping_bag
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  Your bag is empty
                </p>
                <p className="font-body-sm text-body-sm text-text-muted max-w-xs">
                  Explore our luxury handcrafted ethnic silhouettes and find your statement piece.
                </p>
              </div>
              <Link
                href="/products"
                onClick={closeDrawer}
                className="mt-3 inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-widest hover:bg-primary-container transition-colors shadow-md cursor-pointer"
              >
                <span>Shop Collections</span>
                <span className="material-symbols-outlined text-[16px]">east</span>
              </Link>
            </div>
          ) : (
            /* Populated Items */
            <div className="space-y-4">
              {items.map((item) => {
                const product = item.variant.product;
                const imageUrl =
                  PRODUCT_IMAGE_MAP[product.slug] ||
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuDQoAbBdXqUQcuZ9y3LcGYtk3_Rq9dTVsqCnk0_Qn7f4muvE5Dgdoi4PQPuT1qb2TS0mDjI5mfiL6bc3r5AThNP39D-4TIrBUNohIQ2B-Ogc01eOcNTrkimHchXGx7OQJ-dvGzGxggkBG0REbSvDtJ1IZoErp0LQ6EaBJrLu1mg9Bti_1vyIbpKi1LiaJPJwhlik9bDzdtgjJCCAcAtWYXp4ZfMwx6VCpph9GpAEu6sgdRnZvq5JCph5A";
                const unitPriceNum = parseFloat(item.unit_price) || 0;
                const lineTotalNum = parseFloat(item.line_total) || 0;
                const originalUnitPrice = Math.round(unitPriceNum * 1.38);

                return (
                  <div
                    key={item.id}
                    className="bg-surface p-3.5 flex gap-4 transition-all duration-300 relative group border border-outline-variant/30"
                  >
                    {/* Thumbnail */}
                    <div className="w-24 h-32 shrink-0 bg-surface-container relative overflow-hidden">
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        sizes="96px"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-1 left-1 bg-primary text-on-primary font-label-caps text-[9px] px-1.5 py-0.5 tracking-wider font-semibold">
                        {product.category_name || "COUTURE"}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/products/${product.slug}`}
                            onClick={closeDrawer}
                            className="font-headline-sm text-[16px] leading-snug text-on-surface truncate font-semibold hover:text-primary transition-colors block"
                          >
                            {product.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={isLoading}
                            aria-label={`Remove ${product.name} from bag`}
                            className="text-on-surface-variant hover:text-primary transition-colors p-0.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete_outline
                            </span>
                          </button>
                        </div>

                        {/* Variant Attributes */}
                        <p className="font-body-sm text-[12px] text-on-surface-variant mt-1 leading-tight">
                          {item.variant.color && (
                            <>
                              Color:{" "}
                              <span className="text-on-surface font-medium capitalize">
                                {item.variant.color}
                              </span>
                            </>
                          )}
                          {item.variant.color && item.variant.size && " • "}
                          {item.variant.size && (
                            <>
                              Size:{" "}
                              <span className="text-on-surface font-medium">
                                {item.variant.size}
                              </span>
                            </>
                          )}
                        </p>

                        <p className="font-label-caps text-[10px] text-terracotta tracking-wider uppercase mt-0.5">
                          SKU: {item.variant.sku}
                        </p>
                      </div>

                      {/* Quantity & Pricing Row */}
                      <div className="flex items-end justify-between mt-3 pt-2 border-t border-outline-variant/20">
                        {/* Quantity Counter */}
                        <div className="flex items-center bg-surface-container-low px-1 py-0.5 space-x-2 border border-outline-variant/40">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={isLoading || item.quantity <= 1}
                            aria-label="Decrease quantity"
                            className="w-6 h-6 flex items-center justify-center text-on-surface hover:text-primary transition-colors text-sm font-bold cursor-pointer disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="font-price-regular text-body-sm text-on-surface font-semibold px-1">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            disabled={isLoading}
                            aria-label="Increase quantity"
                            className="w-6 h-6 flex items-center justify-center text-on-surface hover:text-primary transition-colors text-sm font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Price Presentation */}
                        <div className="text-right">
                          <div className="flex items-baseline justify-end gap-1.5">
                            <span className="font-price-original text-price-original text-text-muted line-through">
                              ₹{(originalUnitPrice * item.quantity).toLocaleString("en-IN")}
                            </span>
                            <span className="font-price-regular text-price-regular text-primary font-bold">
                              ₹{lineTotalNum.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary uppercase tracking-wider underline underline-offset-2 transition-colors inline-block mt-0.5 cursor-pointer"
                          >
                            Save for Later
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 3. DRAWER FOOTER (STICKY BOTTOM SUMMARY) ──────── */}
        {items.length > 0 && (
          <div className="shrink-0 bg-surface-card px-6 pt-3 pb-6 shadow-2xl z-20 space-y-3.5 border-t border-outline-variant/30">
            {/* Voucher / Coupon Expansion */}
            <div className="relative">
              <div className="flex items-center justify-between bg-surface-container-low px-3 py-2 border border-outline-variant/40">
                <div className="flex items-center gap-2 flex-1">
                  <span className="material-symbols-outlined text-[17px] text-terracotta">
                    sell
                  </span>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Apply Coupon / Muse Voucher"
                    className="bg-transparent font-label-caps text-[11px] tracking-wider uppercase text-on-surface placeholder:text-text-muted focus:outline-none w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="font-label-caps text-label-caps text-primary hover:text-primary-container uppercase font-bold tracking-widest px-2 py-1 hover:bg-surface transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {appliedCoupon && couponSuccess && (
                <p className="font-label-caps text-[10px] text-primary mt-1 tracking-wider uppercase">
                  Code &lsquo;{appliedCoupon}&rsquo; activated for 10% couture discount!
                </p>
              )}
            </div>

            {/* Financial Calculation Breakdown */}
            <div className="space-y-1.5 pt-1 text-body-sm font-body-sm">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal</span>
                <span className="font-price-regular text-body-sm font-semibold text-on-surface">
                  ₹{parsedSubtotal.toLocaleString("en-IN")}
                </span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-primary font-medium">
                  <span>Voucher Savings ({appliedCoupon})</span>
                  <span>-₹{couponDiscount.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex justify-between text-on-surface-variant">
                <span>Estimated GST &amp; Luxury Cess</span>
                <span className="text-terracotta font-medium">Included</span>
              </div>

              <div className="flex justify-between text-on-surface-variant items-center">
                <span className="flex items-center gap-1">
                  Shipping
                  <span className="px-1.5 py-0.5 bg-secondary-fixed text-on-secondary-fixed font-label-caps text-[9px] font-bold">
                    COMPLIMENTARY
                  </span>
                </span>
                <span className="font-price-regular text-body-sm font-bold text-primary">
                  FREE
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-outline-variant/30">
                <div>
                  <span className="font-headline-sm text-[18px] text-on-surface font-semibold tracking-tight">
                    Grand Total
                  </span>
                  <p className="font-label-caps text-[10px] text-primary tracking-wider uppercase">
                    You save ₹{calculatedSavings.toLocaleString("en-IN")} total
                  </p>
                </div>
                <span className="font-headline-sm text-headline-sm text-primary font-bold">
                  ₹{finalPayable.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Main CTA Checkout Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full py-4 bg-primary hover:bg-primary-container text-on-primary font-label-caps text-label-caps tracking-widest uppercase font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>

              <div className="flex items-center justify-center pt-0.5">
                <Link
                  href="/cart"
                  onClick={closeDrawer}
                  className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-primary tracking-widest transition-colors font-medium cursor-pointer"
                >
                  View Full Shopping Bag →
                </Link>
              </div>
            </div>

            {/* Trust Strip */}
            <div className="pt-2 bg-surface-container-low p-2.5 text-center border border-outline-variant/20">
              <p className="font-label-caps text-[9px] uppercase tracking-widest text-text-muted flex items-center justify-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-secondary">
                    verified
                  </span>
                  100% Authentic Indian Craft
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-secondary">
                    local_mall
                  </span>
                  7-Day Doorstep Exchanges
                </span>
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
