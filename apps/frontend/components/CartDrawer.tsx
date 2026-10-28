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
    discount,
    total,
    couponCode,
    applyCoupon,
    removeCoupon,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    isLoading,
    error,
    clearError,
  } = useCart();

  const drawerRef = useRef<HTMLDivElement>(null);

  // Coupon input state
  const [couponInput, setCouponInput] = useState(couponCode || "");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Pilgrim-style collapsible price breakdown dropdown
  const [isPriceExpanded, setIsPriceExpanded] = useState(false);

  useEffect(() => {
    if (couponCode) {
      setCouponInput(couponCode);
    } else {
      setCouponInput("");
    }
  }, [couponCode]);

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
  const voucherDiscount = parseFloat(discount || "0") || 0;
  const finalPayable = total
    ? parseFloat(total)
    : Math.max(0, parsedSubtotal - voucherDiscount);

  // Free shipping progress calculations (Target: ₹2,999)
  const FREE_SHIPPING_GOAL = 2999;
  const isFreeShipping = parsedSubtotal >= FREE_SHIPPING_GOAL;
  const progressPercent = Math.min(
    100,
    Math.round((parsedSubtotal / FREE_SHIPPING_GOAL) * 100)
  );
  const remainingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_GOAL - parsedSubtotal
  );

  // Dynamic MRP savings calculation
  const calculatedMrpSavings = Math.round(parsedSubtotal * 0.284);
  const totalCombinedSavings = calculatedMrpSavings + voucherDiscount;
  const mrpTotal = finalPayable + totalCombinedSavings;
  const discountPercentage =
    mrpTotal > 0 ? Math.round((totalCombinedSavings / mrpTotal) * 100) : 0;

  const handleApplyCoupon = async () => {
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;
    setCouponError(null);
    setIsApplyingCoupon(true);
    try {
      await applyCoupon(clean);
      setCouponError(null);
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Invalid coupon code.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponError(null);
    setIsApplyingCoupon(true);
    try {
      await removeCoupon();
      setCouponInput("");
    } catch (err) {
      setCouponError(
        err instanceof Error ? err.message : "Failed to remove coupon."
      );
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleProceedToCheckout = () => {
    closeDrawer();
    router.push("/checkout");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* ── Fixed Backdrop Overlay ────────────────────────────── */}
      <div
        id="drawer-backdrop"
        onClick={closeDrawer}
        aria-hidden="true"
        className="fixed inset-0 bg-black/60 transition-opacity duration-300 animate-fade-in cursor-pointer"
      />

      {/* ── Slide-Out Sleek Shopping Bag Drawer ──────────────── */}
      <aside
        id="bag-drawer"
        ref={drawerRef}
        role="dialog"
        aria-label="Shopping Bag Drawer"
        aria-modal="true"
        className="relative z-50 h-full w-full sm:w-120 max-w-full bg-surface-card text-on-surface shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in-right border-l border-border-sand/40"
      >
        {/* ── 1. CLEAN DRAWER HEADER ─────────────────────────── */}
        <div className="shrink-0 bg-surface-card px-5 pt-4 pb-3 border-b border-border-sand/40">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[17px] sm:text-[18px] font-semibold text-on-surface tracking-tight">
                Shopping Bag
              </h2>
              <span
                id="bag-count-badge"
                className="text-[12px] text-text-muted font-normal"
              >
                ({itemCount} {itemCount === 1 ? "Item" : "Items"})
              </span>
            </div>
            <button
              type="button"
              id="close-drawer-btn"
              onClick={closeDrawer}
              aria-label="Close Shopping Bag"
              className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-on-surface hover:bg-surface-container rounded-full transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
          </div>

          {/* Minimal Sleek Free Shipping Bar */}
          <div className="bg-surface-container-low/80 rounded-xs px-3.5 py-2 mt-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] sm:text-[12px] text-on-surface">
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className="material-symbols-outlined text-[15px] text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_shipping
                </span>
                {isFreeShipping ? (
                  <span className="text-emerald-800 font-semibold">
                    Free Express Delivery Unlocked!
                  </span>
                ) : (
                  <span>
                    Add{" "}
                    <span className="font-bold text-primary font-price-regular">
                      ₹{remainingForFreeShipping.toLocaleString("en-IN")}
                    </span>{" "}
                    more for Free Express Delivery
                  </span>
                )}
              </span>
              <span className="font-label-caps text-[11px] text-text-muted font-semibold">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-1 bg-surface-container-highest overflow-hidden rounded-full">
              <div
                className="h-full bg-primary transition-all duration-700 ease-in-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
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

        {/* ── 2. REFINED CART ITEMS LIST ────────────────────── */}
        <div
          className="flex-1 overflow-y-auto px-5 py-3 space-y-3 divide-y divide-border-sand/40"
          data-lenis-prevent
        >
          {items.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[28px]">
                  shopping_bag
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-headline-sm text-[16px] font-semibold text-on-surface">
                  Your bag is empty
                </p>
                <p className="text-[12px] text-text-muted max-w-xs">
                  Explore our luxury handcrafted ethnic silhouettes and find your statement piece.
                </p>
              </div>
              <Link
                href="/products"
                onClick={closeDrawer}
                className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-on-primary font-label-caps text-[11px] uppercase tracking-widest hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
              >
                <span>Shop Collections</span>
                <span className="material-symbols-outlined text-[15px]">east</span>
              </Link>
            </div>
          ) : (
            /* Populated Items */
            items.map((item) => {
              const product = item.variant.product;
              const imageUrl =
                PRODUCT_IMAGE_MAP[product.slug] ||
                "https://lh3.googleusercontent.com/aida-public/AB6AXuDQoAbBdXqUQcuZ9y3LcGYtk3_Rq9dTVsqCnk0_Qn7f4muvE5Dgdoi4PQPuT1qb2TS0mDjI5mfiL6bc3r5AThNP39D-4TIrBUNohIQ2B-Ogc01eOcNTrkimHchXGx7OQJ-dvGzGxggkBG0REbSvDtJ1IZoErp0LQ6EaBJrLu1mg9Bti_1vyIbpKi1LiaJPJwhlik9bDzdtgjJCCAcAtWYXp4ZfMwx6VCpph9GpAEu6sgdRnZvq5JCph5A";
              const unitPriceNum = parseFloat(item.unit_price) || 0;
              const lineTotalNum =
                parseFloat(item.line_total) || unitPriceNum * item.quantity;
              const originalTotal = Math.round(
                unitPriceNum * 1.38 * item.quantity
              );

              return (
                <div
                  key={item.id}
                  className="pt-3 first:pt-0 flex gap-3.5 transition-all duration-300 relative group"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-24 sm:w-22 sm:h-26 shrink-0 bg-surface-container rounded-xs overflow-hidden relative border border-border-sand/40">
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      sizes="88px"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${product.slug}`}
                          onClick={closeDrawer}
                          className="font-medium text-[13px] sm:text-[14px] leading-snug text-on-surface truncate hover:text-primary transition-colors block"
                        >
                          {product.name}
                        </Link>
                        <button
                          type="button"
                          aria-label={`Remove ${product.name} from bag`}
                          onClick={() => removeItem(item.id)}
                          disabled={isLoading}
                          className="text-text-muted hover:text-primary transition-colors p-0.5 shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            delete_outline
                          </span>
                        </button>
                      </div>

                      <p className="text-[11px] text-text-muted mt-0.5 leading-normal">
                        {item.variant.color && (
                          <span>
                            Color: <span className="text-on-surface font-medium capitalize">{item.variant.color}</span>
                          </span>
                        )}
                        {item.variant.color && item.variant.size && " • "}
                        {item.variant.size && (
                          <span>
                            Size: <span className="text-on-surface font-medium">{item.variant.size}</span>
                          </span>
                        )}
                      </p>

                      <p className="font-label-caps text-[10px] text-text-muted tracking-wider uppercase mt-0.5">
                        SKU: {item.variant.sku}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1">
                      {/* Clean Minimalist Stepper */}
                      <div className="flex items-center border border-border-sand/80 rounded-xs bg-surface h-7 px-0.5 space-x-1">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={isLoading || item.quantity <= 1}
                          className="w-5 h-5 flex items-center justify-center text-on-surface hover:text-primary text-xs transition-colors font-medium cursor-pointer disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="font-price-regular text-[12px] text-on-surface font-semibold px-1">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={isLoading}
                          className="w-5 h-5 flex items-center justify-center text-on-surface hover:text-primary text-xs transition-colors font-medium cursor-pointer disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>

                      {/* Pricing presentation */}
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-1.5">
                          <span className="text-[11px] text-text-muted line-through font-price-original">
                            ₹{originalTotal.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[13px] sm:text-[14px] text-primary font-bold font-price-regular">
                            ₹{lineTotalNum.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── 3. SLEEK STICKY BOTTOM SUMMARY (PILGRIM-STYLE COLLAPSIBLE) ─── */}
        {items.length > 0 && (
          <div className="shrink-0 bg-surface-card px-5 pt-3 pb-3.5 border-t border-border-sand/50 shadow-2xl z-20 space-y-2.5">
            {/* Clean Single-Line Voucher Entry */}
            <div>
              <div className="flex items-center justify-between bg-surface-container-low/70 border border-border-sand/40 rounded-xs px-3 py-1.5">
                <div className="flex items-center gap-2 flex-1">
                  <span className="material-symbols-outlined text-[16px] text-text-muted">
                    sell
                  </span>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="APPLY COUPON / MUSE VOUCHER"
                    disabled={isApplyingCoupon || isLoading}
                    className="bg-transparent font-label-caps text-[11px] tracking-wider uppercase text-on-surface placeholder:text-text-muted focus:outline-none w-full disabled:opacity-50"
                  />
                </div>
                {couponCode ? (
                  <button
                    type="button"
                    aria-label="Remove coupon"
                    onClick={handleRemoveCoupon}
                    disabled={isApplyingCoupon || isLoading}
                    className="font-label-caps text-[11px] text-text-muted hover:text-error uppercase font-bold tracking-wider px-2 py-0.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isApplyingCoupon ? "..." : "REMOVE"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || isLoading || !couponInput.trim()}
                    className="font-label-caps text-[11px] text-primary hover:text-primary-container uppercase font-bold tracking-wider px-2 py-0.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isApplyingCoupon ? "..." : "APPLY"}
                  </button>
                )}
              </div>
              {couponError && (
                <p className="font-label-caps text-[11px] text-rose-700 mt-1 tracking-wider font-semibold">
                  {couponError}
                </p>
              )}
              {couponCode && !couponError && (
                <p className="font-label-caps text-[10px] text-emerald-800 mt-1 tracking-wider uppercase font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-emerald-700">check_circle</span>
                  <span>CODE &apos;{couponCode}&apos; APPLIED ({voucherDiscount > 0 ? `₹${voucherDiscount.toLocaleString("en-IN")} SAVED` : "ACTIVE"})</span>
                </p>
              )}
            </div>

            {/* Pilgrim-style Savings Pill Badge */}
            {totalCombinedSavings > 0 && (
              <div className="flex justify-center pt-0.5">
                <span className="inline-flex items-center gap-1 px-3 py-0.5 bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] font-medium rounded-full shadow-xs">
                  <span>Woohoo! ₹{totalCombinedSavings.toLocaleString("en-IN")} saved so far!</span>
                </span>
              </div>
            )}

            {/* Pilgrim-style Dropdown Price Section */}
            <div className="bg-surface-container-low/60 border border-border-sand/50 rounded-xs p-2.5 space-y-2">
              {/* Accordion Toggle Header */}
              <button
                type="button"
                onClick={() => setIsPriceExpanded(!isPriceExpanded)}
                aria-expanded={isPriceExpanded}
                className="w-full flex items-center justify-between text-left cursor-pointer group"
              >
                <div className="flex items-center gap-1 text-[13px] font-semibold text-on-surface group-hover:text-primary transition-colors">
                  <span>Estimated Total</span>
                  <span
                    className={`material-symbols-outlined text-[17px] text-text-muted transition-transform duration-200 ${
                      isPriceExpanded ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[15px] font-bold text-on-surface font-price-regular">
                    ₹{finalPayable.toLocaleString("en-IN")}
                  </span>
                  {totalCombinedSavings > 0 && (
                    <span className="text-[11px] text-text-muted line-through font-price-original">
                      ₹{mrpTotal.toLocaleString("en-IN")}
                    </span>
                  )}
                  {discountPercentage > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-700">
                      ({discountPercentage}% OFF)
                    </span>
                  )}
                </div>
              </button>

              {/* Collapsible Detailed Breakdown */}
              {isPriceExpanded && (
                <div className="pt-2 border-t border-border-sand/40 space-y-1.5 text-[12px] text-on-surface-variant animate-fade-in">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-price-regular font-medium text-on-surface">
                      ₹{parsedSubtotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {voucherDiscount > 0 && (
                    <div className="flex justify-between text-emerald-800 font-medium">
                      <span>Voucher Savings ({couponCode})</span>
                      <span className="font-price-regular font-semibold">
                        -₹{voucherDiscount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Estimated GST &amp; Luxury Cess</span>
                    <span className="text-text-muted">Included</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Shipping</span>
                    <span className="font-semibold text-emerald-800">FREE</span>
                  </div>

                  {totalCombinedSavings > 0 && (
                    <div className="flex justify-between text-primary font-semibold pt-1 border-t border-border-sand/30 text-[11px]">
                      <span>Total Savings</span>
                      <span>₹{totalCombinedSavings.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pilgrim-style Proceed Button with Payment Method Badges */}
            <div className="space-y-1.5 pt-0.5">
              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full py-3 bg-[#8b000a] hover:bg-[#6D1826] text-white font-medium text-[13px] tracking-wide rounded-xs flex items-center justify-between px-4 shadow-sm transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <span>Proceed to Pay</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </span>
                {/* Overlapping payment method icons */}
                <div className="flex items-center -space-x-1.5 shrink-0">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-[#002e6e] text-[8px] font-bold shadow-xs border border-white">
                    UPI
                  </span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#5f259f] text-white text-[8px] font-bold shadow-xs border border-white">
                    पे
                  </span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#00b9f5] text-white text-[7px] font-bold shadow-xs border border-white">
                    Paytm
                  </span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-[#1a1f71] text-[8px] font-bold shadow-xs border border-white">
                    VISA
                  </span>
                </div>
              </button>

              <div className="flex items-center justify-center">
                <Link
                  href="/cart"
                  onClick={closeDrawer}
                  className="font-label-caps text-[10px] uppercase text-text-muted hover:text-primary tracking-widest transition-colors font-medium py-0.5 cursor-pointer"
                >
                  View Full Shopping Bag →
                </Link>
              </div>
            </div>

            {/* Minimal 1-Line Trust Note */}
            <div className="pt-1 border-t border-border-sand/30 text-center">
              <p className="text-[10px] text-text-muted flex items-center justify-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-secondary">
                    verified
                  </span>
                  100% Authentic Indian Craft
                </span>
                <span className="opacity-40">•</span>
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
