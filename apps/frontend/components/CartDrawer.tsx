"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "./CartContext";
import { PRODUCT_IMAGE_MAP } from "@/lib/adapters/catalog-adapter";

export default function CartDrawer() {
  const {
    cart,
    itemCount,
    subtotal,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    clearCart,
    isLoading,
    error,
    clearError,
  } = useCart();

  const drawerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      {/* ── Backdrop ────────────────────────────────────────── */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* ── Slide-in Drawer Panel ───────────────────────────── */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-label="Shopping Bag Drawer"
        aria-modal="true"
        className="relative z-10 w-full max-w-[440px] h-full bg-[#fff8f7] text-[#111111] shadow-2xl flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#111111]/8 bg-[#fff8f7]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={20} className="text-[#8b000a]" />
            <h2 className="font-display text-lg font-medium uppercase tracking-[0.15em] text-ink">
              Shopping Bag
            </h2>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8b000a] bg-[#8b000a]/10 px-2 py-0.5 rounded-full">
              {itemCount}
            </span>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="p-1.5 text-ink/60 hover:text-[#8b000a] transition-colors"
            aria-label="Close Shopping Bag"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Global Error Notice if any */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-rose-900 font-bold ml-2 text-sm"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#f4ebe6] flex items-center justify-center text-ink/40">
                <ShoppingBag size={28} strokeWidth={1.2} />
              </div>
              <div className="space-y-1">
                <p className="font-display text-base font-normal tracking-wide text-ink">
                  Your bag is empty
                </p>
                <p className="text-xs text-ink/60 font-light max-w-xs">
                  Explore our luxury handcrafted ethnic silhouettes and find your statement piece.
                </p>
              </div>
              <Link
                href="/products"
                onClick={closeDrawer}
                className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 bg-ink text-[#fff8f7] text-[11px] font-medium uppercase tracking-[0.2em] hover:bg-[#8b000a] transition-colors shadow-xs"
              >
                <span>Shop Collections</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#111111]/8">
              {items.map((item) => {
                const product = item.variant.product;
                const imageUrl =
                  PRODUCT_IMAGE_MAP[product.slug] ||
                  "/assets/products/kurti-1.jpg";
                const unitPriceNum = parseFloat(item.unit_price) || 0;
                const lineTotalNum = parseFloat(item.line_total) || 0;

                return (
                  <li key={item.id} className="py-4 flex gap-4 items-start">
                    {/* Thumbnail */}
                    <div className="relative w-20 h-24 shrink-0 bg-[#f4ebe6] overflow-hidden border border-[#111111]/8">
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        sizes="80px"
                        className="object-cover object-top"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/products/${product.slug}`}
                            onClick={closeDrawer}
                            className="font-display text-xs sm:text-sm font-medium text-ink hover:text-[#8b000a] transition-colors line-clamp-1"
                          >
                            {product.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={isLoading}
                            className="text-ink/40 hover:text-rose-700 transition-colors p-1 -mr-1"
                            aria-label={`Remove ${product.name} from bag`}
                          >
                            <Trash2 size={15} strokeWidth={1.5} />
                          </button>
                        </div>

                        {/* Variant attributes */}
                        <div className="flex flex-wrap gap-2 text-[11px] text-ink/60 mt-1">
                          {item.variant.size && (
                            <span>Size: <strong className="text-ink font-semibold">{item.variant.size}</strong></span>
                          )}
                          {item.variant.color && (
                            <>
                              <span>•</span>
                              <span>Color: <strong className="text-ink font-semibold">{item.variant.color}</strong></span>
                            </>
                          )}
                        </div>

                        <p className="text-[11px] text-ink/50 mt-0.5 font-mono">
                          SKU: {item.variant.sku}
                        </p>
                      </div>

                      {/* Price & Quantity Controls */}
                      <div className="flex items-center justify-between mt-3 pt-2">
                        <div className="inline-flex items-center border border-[#111111]/20 bg-white h-8 px-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={isLoading || item.quantity <= 1}
                            className="w-6 h-6 flex items-center justify-center text-xs text-ink/70 hover:text-ink disabled:text-ink/20"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="text-xs font-semibold text-ink w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            disabled={isLoading}
                            className="w-6 h-6 flex items-center justify-center text-xs text-ink/70 hover:text-ink"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-semibold text-ink">
                            ₹{lineTotalNum.toLocaleString("en-IN")}
                          </span>
                          {item.quantity > 1 && (
                            <p className="text-[10px] text-ink/40">
                              (₹{unitPriceNum.toLocaleString("en-IN")} each)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer with Totals & CTAs */}
        {items.length > 0 && (
          <div className="p-6 border-t border-[#111111]/8 bg-[#fff8f7] space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-ink/70">
                <span>Subtotal</span>
                <span className="font-semibold text-ink">
                  ₹{parsedSubtotal.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-emerald-800">
                <span>Shipping</span>
                <span>Complimentary Express</span>
              </div>
              <p className="text-[10px] text-ink/40 pt-1">
                Taxes calculated at checkout.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="w-full h-11 flex items-center justify-center gap-2 border border-ink bg-transparent text-ink text-xs font-semibold uppercase tracking-[0.2em] hover:bg-ink hover:text-[#fff8f7] transition-colors"
              >
                View & Edit Bag
              </Link>

              <button
                type="button"
                onClick={() => {
                  alert("Checkout flow will be enabled in Sprint 2.6 / Sprint 3!");
                }}
                className="w-full h-11 flex items-center justify-center gap-2 bg-[#8b000a] text-[#fff8f7] text-xs font-semibold uppercase tracking-[0.2em] hover:bg-[#6c0008] transition-colors shadow-md"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={clearCart}
                disabled={isLoading}
                className="text-[10px] uppercase tracking-[0.18em] text-ink/40 hover:text-rose-700 transition-colors self-center pt-1"
              >
                Clear Bag
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
