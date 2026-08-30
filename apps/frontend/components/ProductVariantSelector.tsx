"use client";

import { useState, useMemo } from "react";
import { ShoppingBag, Check, ShieldCheck, Truck, RefreshCw } from "lucide-react";
import type { ProductVariantSummary } from "@/lib/api/types";

interface ProductVariantSelectorProps {
  productName: string;
  productSlug: string;
  variants: ProductVariantSummary[];
  onAddToCart?: (item: {
    productName: string;
    productSlug: string;
    variant: ProductVariantSummary;
    quantity: number;
  }) => void;
}

export default function ProductVariantSelector({
  productName,
  productSlug,
  variants,
  onAddToCart,
}: ProductVariantSelectorProps) {
  // Extract unique active colors and sizes
  const activeVariants = useMemo(
    () => variants.filter((v) => v.is_active),
    [variants]
  );

  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    activeVariants.forEach((v) => {
      if (v.color) colors.add(v.color);
    });
    return Array.from(colors);
  }, [activeVariants]);

  const availableSizes = useMemo(() => {
    const sizes = new Set<string>();
    activeVariants.forEach((v) => {
      if (v.size) sizes.add(v.size);
    });
    return Array.from(sizes);
  }, [activeVariants]);

  // Initial selection defaults to first active variant
  const initialVariant = activeVariants[0] || null;

  const [selectedColor, setSelectedColor] = useState<string>(
    initialVariant?.color || availableColors[0] || ""
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    initialVariant?.size || availableSizes[0] || ""
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>("");

  // Resolve matching active variant based on current color & size selections
  const currentVariant = useMemo(() => {
    return (
      activeVariants.find((v) => {
        const matchesColor = !selectedColor || v.color === selectedColor;
        const matchesSize = !selectedSize || v.size === selectedSize;
        return matchesColor && matchesSize;
      }) || null
    );
  }, [activeVariants, selectedColor, selectedSize]);

  // Check if a specific size is available for the chosen color
  const isSizeAvailable = (size: string) => {
    return activeVariants.some(
      (v) => v.size === size && (!selectedColor || v.color === selectedColor)
    );
  };

  // Check if a specific color is available for the chosen size
  const isColorAvailable = (color: string) => {
    return activeVariants.some(
      (v) => v.color === color && (!selectedSize || v.size === selectedSize)
    );
  };

  const handleAddToCart = () => {
    if (!currentVariant) {
      setValidationError("Please select an available size and color configuration.");
      return;
    }

    setValidationError("");

    if (onAddToCart) {
      onAddToCart({
        productName,
        productSlug,
        variant: currentVariant,
        quantity,
      });
    }

    setAddedFeedback(true);
    setTimeout(() => {
      setAddedFeedback(false);
    }, 3500);
  };

  const currentPrice = currentVariant
    ? parseFloat(currentVariant.retail_price)
    : initialVariant
    ? parseFloat(initialVariant.retail_price)
    : 0;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ── Dynamic Price Display ─────────────────────────── */}
      <div className="flex items-baseline gap-3">
        <span className="font-display text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
          ₹{currentPrice.toLocaleString("en-IN")}
        </span>
        <span className="text-xs text-ink/40 font-light">
          (Inclusive of all taxes)
        </span>
      </div>

      {/* ── Stock Status Badge ────────────────────────────── */}
      <div className="flex items-center gap-2">
        {currentVariant ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-xs border border-emerald-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            In Stock — Ready to Ship
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-800 bg-rose-50 px-2.5 py-1 rounded-xs border border-rose-200">
            Currently Unavailable
          </span>
        )}
      </div>

      {/* ── Color Selection ───────────────────────────────── */}
      {availableColors.length > 0 && (
        <div className="flex flex-col gap-2.5 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
              Color:{" "}
              <span className="font-normal text-ink/70 capitalize">
                {selectedColor || "Select Color"}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {availableColors.map((color) => {
              const isSelected = selectedColor === color;
              const isAvail = isColorAvailable(color);

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    setValidationError("");
                  }}
                  disabled={!isAvail}
                  className={`px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] border transition-all ${
                    isSelected
                      ? "bg-ink text-[#fff8f7] border-ink shadow-xs"
                      : isAvail
                      ? "bg-white text-ink border-[#111111]/20 hover:border-ink"
                      : "bg-[#f7f2ef] text-ink/30 border-[#111111]/8 cursor-not-allowed line-through"
                  }`}
                >
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Size Selection ────────────────────────────────── */}
      {availableSizes.length > 0 && (
        <div className="flex flex-col gap-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
              Size:{" "}
              <span className="font-normal text-ink/70">
                {selectedSize || "Select Size"}
              </span>
            </span>
            <button
              type="button"
              className="text-[11px] uppercase tracking-[0.15em] text-chili font-semibold hover:underline"
            >
              Size Guide
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {availableSizes.map((size) => {
              const isSelected = selectedSize === size;
              const isAvail = isSizeAvailable(size);

              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setSelectedSize(size);
                    setValidationError("");
                  }}
                  disabled={!isAvail}
                  className={`min-w-[48px] h-10 px-3 flex items-center justify-center text-xs font-semibold uppercase tracking-wider border transition-all ${
                    isSelected
                      ? "bg-ink text-[#fff8f7] border-ink shadow-xs"
                      : isAvail
                      ? "bg-white text-ink border-[#111111]/20 hover:border-ink"
                      : "bg-[#f7f2ef] text-ink/30 border-[#111111]/8 cursor-not-allowed line-through"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quantity & Add to Bag Row ─────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
        {/* Quantity Stepper */}
        <div className="inline-flex items-center justify-between border border-[#111111]/20 bg-white h-12 px-3 sm:w-36 shrink-0">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="w-8 h-8 flex items-center justify-center text-ink/60 hover:text-ink text-base disabled:text-ink/20"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="text-xs font-semibold text-ink w-8 text-center">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="w-8 h-8 flex items-center justify-center text-ink/60 hover:text-ink text-base"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Add to Bag Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!currentVariant}
          className={`flex-1 h-12 flex items-center justify-center gap-2.5 px-8 text-xs font-semibold uppercase tracking-[0.25em] transition-all duration-300 ${
            currentVariant
              ? "bg-[#8b000a] text-[#fff8f7] hover:bg-[#6c0008] shadow-md hover:shadow-lg transform active:scale-[0.99]"
              : "bg-ink/30 text-white/70 cursor-not-allowed"
          }`}
        >
          <ShoppingBag size={16} />
          {addedFeedback ? "Added to Bag!" : "Add to Bag"}
        </button>
      </div>

      {/* ── Validation Error Message ──────────────────────── */}
      {validationError && (
        <p className="text-xs text-rose-700 font-medium">
          {validationError}
        </p>
      )}

      {/* ── Temporary Add-to-Cart Feedback Banner ──────────── */}
      {addedFeedback && currentVariant && (
        <div className="p-4 border border-emerald-300 bg-emerald-50/90 text-emerald-900 rounded-xs flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-1">
          <Check size={18} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-emerald-950">
              Successfully added {quantity}x &ldquo;{productName}&rdquo; to your shopping bag.
            </p>
            <p className="text-emerald-800/80 mt-0.5">
              Variant: {currentVariant.size} / {currentVariant.color} (SKU: {currentVariant.sku})
            </p>
          </div>
        </div>
      )}

      {/* ── Luxury Trust & Shipping Badges ────────────────── */}
      <div className="mt-2 pt-6 border-t border-[#111111]/8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-ink/70">
        <div className="flex items-center gap-2.5 text-[11px] font-medium tracking-wide">
          <Truck size={16} className="text-chili shrink-0" />
          <span>Complimentary Express Shipping</span>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] font-medium tracking-wide">
          <RefreshCw size={16} className="text-chili shrink-0" />
          <span>7-Day Easy Exchange</span>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] font-medium tracking-wide">
          <ShieldCheck size={16} className="text-chili shrink-0" />
          <span>100% Authentic Handcrafted Quality</span>
        </div>
      </div>
    </div>
  );
}
