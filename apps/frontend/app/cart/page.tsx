"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Truck,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/components/CartContext";
import { PRODUCT_IMAGE_MAP } from "@/lib/adapters/catalog-adapter";

export default function CartPage() {
  const {
    cart,
    itemCount,
    subtotal,
    updateQuantity,
    removeItem,
    clearCart,
    isLoading,
    error,
    clearError,
  } = useCart();

  const items = cart?.items || [];
  const parsedSubtotal = parseFloat(subtotal) || 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#fff8f7] text-[#111111] font-body selection:bg-[#8b000a] selection:text-[#fff8f7]">
      {/* ── Header ────────────────────────────────────────────── */}
      <Header />

      <main className="flex-1 pt-28 sm:pt-32 pb-16 sm:pb-24 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          {/* ── Breadcrumb & Back Link ────────────────────────── */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] font-medium text-ink/60 hover:text-[#8b000a] transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Continue Shopping</span>
            </Link>

            <span className="text-xs uppercase tracking-[0.2em] text-ink/40">
              {itemCount} {itemCount === 1 ? "Item" : "Items"} in Bag
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-ink font-normal tracking-tight mb-8">
            Your Shopping Bag
          </h1>

          {/* ── Error Banner ──────────────────────────────────── */}
          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-rose-900 font-bold ml-4 text-sm"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {/* ── Empty Cart State ──────────────────────────────── */}
          {items.length === 0 ? (
            <div className="py-20 sm:py-28 flex flex-col items-center justify-center text-center max-w-md mx-auto border border-[#111111]/8 bg-white/60 p-8 sm:p-12 shadow-xs">
              <div className="w-20 h-20 rounded-full bg-[#f4ebe6] flex items-center justify-center text-[#8b000a] mb-6">
                <ShoppingBag size={32} strokeWidth={1.2} />
              </div>
              <h2 className="font-display text-2xl font-normal text-ink mb-2">
                Your Shopping Bag is Empty
              </h2>
              <p className="text-xs sm:text-sm text-ink/60 font-light leading-relaxed mb-8">
                Discover handcrafted luxury kurtis, kurta sets, and ethnic wear designed to express confidence and individuality.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-[#8b000a] text-[#fff8f7] text-xs font-semibold uppercase tracking-[0.25em] hover:bg-[#6c0008] transition-all shadow-md hover:shadow-lg"
              >
                <span>Explore Catalog</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            /* ── Cart Grid Layout: Items Left, Summary Right ───── */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left Column: Cart Items List (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Desktop Table Header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 pb-3 border-b border-[#111111]/12 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/50">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-center">Unit Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>

                {/* Items List */}
                <ul className="divide-y divide-[#111111]/8 border-b border-[#111111]/8">
                  {items.map((item) => {
                    const product = item.variant.product;
                    const imageUrl =
                      PRODUCT_IMAGE_MAP[product.slug] ||
                      "/assets/products/kurti-1.jpg";
                    const unitPriceNum = parseFloat(item.unit_price) || 0;
                    const lineTotalNum = parseFloat(item.line_total) || 0;

                    return (
                      <li
                        key={item.id}
                        className="py-6 flex flex-col sm:grid sm:grid-cols-12 gap-4 items-start sm:items-center"
                      >
                        {/* Product Info & Thumbnail */}
                        <div className="sm:col-span-6 flex gap-4 items-center w-full">
                          <div className="relative w-20 h-28 shrink-0 bg-[#f4ebe6] overflow-hidden border border-[#111111]/8">
                            <Image
                              src={imageUrl}
                              alt={product.name}
                              fill
                              sizes="90px"
                              className="object-cover object-top"
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            {product.category_name && (
                              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b000a]">
                                {product.category_name}
                              </p>
                            )}
                            <Link
                              href={`/products/${product.slug}`}
                              className="font-display text-sm sm:text-base font-medium text-ink hover:text-[#8b000a] transition-colors block line-clamp-1"
                            >
                              {product.name}
                            </Link>
                            <div className="flex flex-wrap gap-2 text-xs text-ink/70">
                              {item.variant.size && (
                                <span>Size: <strong>{item.variant.size}</strong></span>
                              )}
                              {item.variant.color && (
                                <>
                                  <span>•</span>
                                  <span>Color: <strong>{item.variant.color}</strong></span>
                                </>
                              )}
                            </div>
                            <p className="text-[10px] text-ink/40 font-mono">
                              SKU: {item.variant.sku}
                            </p>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1 text-[11px] text-ink/40 hover:text-rose-700 transition-colors pt-1"
                              aria-label={`Remove ${product.name} from bag`}
                            >
                              <Trash2 size={13} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>

                        {/* Unit Price */}
                        <div className="sm:col-span-2 sm:text-center text-xs text-ink/75">
                          <span className="sm:hidden font-medium text-ink/50 mr-2">Unit Price:</span>
                          ₹{unitPriceNum.toLocaleString("en-IN")}
                        </div>

                        {/* Quantity Stepper */}
                        <div className="sm:col-span-2 flex sm:justify-center">
                          <div className="inline-flex items-center border border-[#111111]/20 bg-white h-9 px-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              disabled={isLoading || item.quantity <= 1}
                              className="w-7 h-7 flex items-center justify-center text-xs text-ink/70 hover:text-ink disabled:text-ink/20"
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="text-xs font-semibold text-ink w-7 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              disabled={isLoading}
                              className="w-7 h-7 flex items-center justify-center text-xs text-ink/70 hover:text-ink"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Line Total */}
                        <div className="sm:col-span-2 sm:text-right text-sm font-semibold text-ink w-full sm:w-auto flex sm:block justify-between items-center border-t sm:border-t-0 pt-2 sm:pt-0">
                          <span className="sm:hidden text-xs font-normal text-ink/60">Subtotal:</span>
                          <span>₹{lineTotalNum.toLocaleString("en-IN")}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Actions row: Clear Bag */}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={clearCart}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-ink/50 hover:text-rose-700 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Clear Shopping Bag</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Order Summary Card (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-[#111111]/8 p-6 sm:p-8 shadow-sm space-y-6">
                <h2 className="font-display text-lg font-medium tracking-wide text-ink uppercase border-b border-[#111111]/8 pb-4">
                  Order Summary
                </h2>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-ink/70">
                    <span>Bag Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                    <span className="font-semibold text-ink text-sm">
                      ₹{parsedSubtotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between text-ink/70">
                    <span>Shipping Estimate</span>
                    <span className="text-emerald-800 font-semibold uppercase tracking-wider text-[11px]">
                      Complimentary
                    </span>
                  </div>

                  <div className="flex justify-between text-ink/70">
                    <span>Estimated Tax</span>
                    <span className="text-ink/50 italic">Included in retail price</span>
                  </div>

                  <div className="pt-3 border-t border-[#111111]/8 flex justify-between items-baseline text-ink">
                    <span className="font-display text-sm uppercase tracking-wider font-semibold">
                      Estimated Total
                    </span>
                    <span className="font-display text-xl font-bold text-[#8b000a]">
                      ₹{parsedSubtotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Checkout CTA Placeholder */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      alert("Checkout orchestration will be enabled in Sprint 2.6 / Sprint 3!");
                    }}
                    className="w-full h-12 flex items-center justify-center gap-2.5 bg-[#8b000a] text-[#fff8f7] text-xs font-semibold uppercase tracking-[0.25em] hover:bg-[#6c0008] transition-all shadow-md hover:shadow-lg transform active:scale-[0.99]"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={16} />
                  </button>

                  <p className="text-[10px] text-center text-ink/40 leading-relaxed">
                    By proceeding to checkout you agree to Closet by Chilli terms of service and luxury care policies.
                  </p>
                </div>

                {/* Trust Badges */}
                <div className="pt-6 border-t border-[#111111]/8 space-y-3 text-[11px] text-ink/70">
                  <div className="flex items-center gap-2.5">
                    <Truck size={16} className="text-[#8b000a] shrink-0" />
                    <span>Free express delivery across India</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <RefreshCw size={16} className="text-[#8b000a] shrink-0" />
                    <span>7-Day easy domestic exchange</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={16} className="text-[#8b000a] shrink-0" />
                    <span>Direct artisan authenticity guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
