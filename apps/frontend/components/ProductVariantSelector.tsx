"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ProductVariantSummary } from "@/lib/api/types";
import { useCart } from "@/components/CartContext";

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
  const router = useRouter();
  const { addToCart } = useCart();

  // Extract unique active variants, colors and sizes
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>("");

  // Pincode checker state
  const [pincode, setPincode] = useState<string>("400050");
  const [pincodeStatus, setPincodeStatus] = useState<{
    checked: boolean;
    valid: boolean;
    city: string;
    deliveryDate: string;
  }>({
    checked: true,
    valid: true,
    city: "Bandra West, Mumbai",
    deliveryDate: "Thursday, Oct 31",
  });

  // Size guide modal state
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState<boolean>(false);

  // Standard Indian fit sizing matrix
  const standardSizes = ["XS", "S", "M", "L", "XL", "XXL"];

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

  // Check if a specific size is available
  const isSizeAvailable = (size: string) => {
    return activeVariants.some(
      (v) => v.size === size && (!selectedColor || v.color === selectedColor)
    );
  };

  // Check if a specific color is available
  const isColorAvailable = (color: string) => {
    return activeVariants.some(
      (v) => v.color === color && (!selectedSize || v.size === selectedSize)
    );
  };

  const handleAddToCart = async () => {
    if (!currentVariant) {
      setValidationError("Please select an available size and color configuration.");
      return;
    }

    setValidationError("");
    setIsSubmitting(true);

    try {
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

      await addToCart(currentVariant.id, quantity);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to add item to bag. Please try again.";
      setValidationError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    if (!currentVariant) {
      setValidationError("Please select an available size and color configuration.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (onAddToCart) {
        onAddToCart({
          productName,
          productSlug,
          variant: currentVariant,
          quantity,
        });
      }
      await addToCart(currentVariant.id, quantity);
      router.push("/checkout");
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to process checkout. Please try again.";
      setValidationError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pincode.trim();
    if (/^\d{6}$/.test(cleanPin)) {
      const cities: Record<string, string> = {
        "110001": "Connaught Place, New Delhi",
        "400001": "Fort, Mumbai",
        "400050": "Bandra West, Mumbai",
        "560001": "MG Road, Bengaluru",
        "600001": "George Town, Chennai",
        "700001": "Dalhousie, Kolkata",
        "302001": "MI Road, Jaipur",
      };
      const city = cities[cleanPin] || "Metro Area, India";
      setPincodeStatus({
        checked: true,
        valid: true,
        city,
        deliveryDate: "In 3–4 Business Days",
      });
    } else {
      setPincodeStatus({
        checked: true,
        valid: false,
        city: "",
        deliveryDate: "",
      });
    }
  };

  const currentPrice = currentVariant
    ? parseFloat(currentVariant.retail_price)
    : initialVariant
    ? parseFloat(initialVariant.retail_price)
    : 0;

  // Realistic MRP markup and discount calculation for luxury ethnic wear
  const calculatedOriginalPrice = Math.round(currentPrice * 1.388);
  const discountPercent = currentPrice > 0 ? Math.round(((calculatedOriginalPrice - currentPrice) / calculatedOriginalPrice) * 100) : 0;
  const savingsAmount = calculatedOriginalPrice - currentPrice;
  const installmentAmount = Math.round(currentPrice / 3);

  // Mapping known colors to hex swatches
  const getColorHex = (colorName: string): string => {
    const map: Record<string, string> = {
      "Chili Red": "#B31317",
      "Red": "#B31317",
      "Scarlet": "#8b000a",
      "Yellow": "#EAB308",
      "Green": "#15803D",
      "Midnight Noir": "#313030",
      "Black": "#1C1B1B",
      "Ivory": "#F6F3F2",
      "White": "#FFFFFF",
      "Terracotta": "#A6533D",
      "Rust": "#90422D",
    };
    return map[colorName] || "#8b000a";
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Pricing Card ────────────────────────────────────── */}
      <div className="bg-surface-container-low p-5 flex flex-col gap-2.5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-display-hero text-[34px] leading-none text-primary font-bold">
            ₹{currentPrice.toLocaleString("en-IN")}
          </span>
          {calculatedOriginalPrice > currentPrice && (
            <>
              <span className="font-price-original text-price-original line-through text-outline">
                ₹{calculatedOriginalPrice.toLocaleString("en-IN")}
              </span>
              <span className="bg-primary/10 text-primary font-label-caps text-label-caps px-2 py-0.5 font-bold uppercase tracking-wide">
                {discountPercent}% Off
              </span>
              <span className="text-body-sm font-body-sm text-terracotta font-medium ml-auto">
                You Save ₹{savingsAmount.toLocaleString("en-IN")}
              </span>
            </>
          )}
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-secondary">
            verified
          </span>
          Inclusive of all taxes • Free express delivery across India
        </p>

        {currentPrice > 0 && (
          <div className="flex items-center gap-2 pt-1 text-body-sm font-body-sm text-on-surface-variant bg-surface p-2.5">
            <span className="material-symbols-outlined text-[18px] text-primary">
              payments
            </span>
            <span>
              Or 3 interest-free payments of <strong>₹{installmentAmount.toLocaleString("en-IN")}</strong> with Snapmint / Simpl
            </span>
          </div>
        )}

        {/* ── In Stock Indicator ───────────────────────────── */}
        <div className="pt-1 flex items-center gap-2">
          {currentVariant ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              In Stock — Ready to Ship
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-rose-800 bg-rose-50 px-2 py-0.5 border border-rose-200/60">
              Currently Unavailable
            </span>
          )}
        </div>
      </div>

      {/* ── Color Selector ─────────────────────────────────── */}
      {availableColors.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-body-sm font-body-sm">
            <span className="font-medium text-on-surface uppercase tracking-wider font-label-caps text-label-caps">
              Color:{" "}
              <span className="font-semibold text-primary capitalize">
                {selectedColor || "Select Color"}
              </span>
            </span>
            <span className="text-on-surface-variant text-xs">
              {availableColors.length} Shades Available
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {availableColors.map((color) => {
              const isSelected = selectedColor === color;
              const isAvail = isColorAvailable(color);
              const hex = getColorHex(color);

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    setValidationError("");
                  }}
                  disabled={!isAvail}
                  title={color}
                  aria-label={color}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : isAvail
                      ? "border-outline-variant/60 bg-surface hover:border-primary"
                      : "border-outline-variant/20 bg-surface-container-low opacity-40 cursor-not-allowed"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 inline-block shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-body-sm font-body-sm text-on-surface font-medium capitalize">
                    {color}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Size Selection & Sizing Matrix ─────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-label-caps text-label-caps uppercase tracking-wider font-semibold text-on-surface">
              Select Size
            </span>
            <span className="text-body-sm text-on-surface-variant">
              (Standard Indian Fit)
            </span>
          </div>

          {/* Size Guide Link Button */}
          <button
            type="button"
            onClick={() => setIsSizeGuideOpen(true)}
            className="flex items-center gap-1.5 text-primary hover:text-tertiary font-label-caps text-label-caps uppercase tracking-wider font-semibold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">straighten</span>
            Size Chart &amp; Fit Guide
          </button>
        </div>

        {/* Size Buttons Matrix */}
        <div className="grid grid-cols-6 gap-2">
          {standardSizes.map((size) => {
            const isAvail = isSizeAvailable(size);
            const isSelected = selectedSize === size;

            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  if (isAvail) {
                    setSelectedSize(size);
                    setValidationError("");
                  }
                }}
                disabled={!isAvail}
                className={`relative h-11 flex items-center justify-center font-body-md transition-all cursor-pointer ${
                  isSelected
                    ? "font-semibold bg-inverse-surface text-on-primary shadow-sm"
                    : isAvail
                    ? "font-medium bg-surface-container-low text-on-surface hover:bg-surface-container"
                    : "text-outline bg-surface-container-highest cursor-not-allowed opacity-60"
                }`}
              >
                <span className="relative z-10">{size}</span>
                {!isAvail && (
                  <span className="absolute inset-0 flex items-center justify-center text-outline/80 pointer-events-none">
                    ×
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant pt-0.5">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-terracotta">
              person
            </span>
            Model is 5&apos;9&quot; wearing Size S
          </span>
          <span className="text-primary font-medium cursor-pointer hover:underline">
            Custom Tailoring Available
          </span>
        </div>
      </div>

      {/* ── Quantity & Primary Commercial Actions ──────────── */}
      <div className="flex flex-col gap-3 pt-1">
        {/* Quantity Stepper Row */}
        <div className="flex items-center justify-between bg-surface-container-low p-2.5 border border-outline-variant/30">
          <span className="font-label-caps uppercase text-on-surface text-label-caps font-semibold">
            Quantity:
          </span>
          <div className="inline-flex items-center bg-surface border border-outline-variant/60 h-9">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="w-9 h-full flex items-center justify-center text-on-surface hover:text-primary disabled:opacity-30 cursor-pointer font-bold"
            >
              -
            </button>
            <span className="w-10 text-center text-body-sm font-body-sm font-semibold text-on-surface">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Increase quantity"
              className="w-9 h-full flex items-center justify-center text-on-surface hover:text-primary cursor-pointer font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Dual CTA: Add to Bag & Buy It Now */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!currentVariant || isSubmitting}
            className={`w-full font-label-caps text-label-caps uppercase tracking-widest py-4 px-6 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer ${
              currentVariant && !isSubmitting
                ? "bg-primary hover:bg-primary-container text-on-primary"
                : "bg-surface-container-highest text-outline cursor-not-allowed"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              shopping_bag
            </span>
            {isSubmitting ? "Adding..." : "Add To Bag"}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!currentVariant || isSubmitting}
            className={`w-full font-label-caps text-label-caps uppercase tracking-widest py-4 px-6 flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer ${
              currentVariant && !isSubmitting
                ? "bg-inverse-surface hover:bg-on-surface text-inverse-on-surface"
                : "bg-surface-container-highest text-outline cursor-not-allowed"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">bolt</span>
            Buy It Now
          </button>
        </div>

        {/* Stylist WhatsApp Consultation Button */}
        <a
          href="https://wa.me/919876543210?text=Hello%20Closet%20by%20Chili%2C%20I%20would%20like%20styling%20advice%20for%20this%20ensemble."
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-caps text-label-caps uppercase tracking-wider py-3 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">
            support_agent
          </span>
          Consult Closet Stylist on WhatsApp • Instant Response
        </a>
      </div>

      {/* ── Validation Error & Success Alerts ──────────────── */}
      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-body-sm font-body-sm">
          {validationError}
        </div>
      )}

      {addedFeedback && currentVariant && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-body-sm font-body-sm flex items-start gap-2.5 animate-in fade-in">
          <span className="material-symbols-outlined text-emerald-700 text-[20px] shrink-0">
            check_circle
          </span>
          <div>
            <p className="font-semibold">
              Successfully added {quantity}x &ldquo;{productName}&rdquo; to your shopping bag.
            </p>
            <p className="text-emerald-800 text-xs mt-0.5">
              Size: {currentVariant.size} • Color: {currentVariant.color} (SKU: {currentVariant.sku})
            </p>
          </div>
        </div>
      )}

      {/* ── Pincode Checker Card ───────────────────────────── */}
      <div className="bg-surface-container-low p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="font-label-caps text-label-caps uppercase tracking-wider font-semibold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">
              local_shipping
            </span>
            Check Delivery &amp; COD Availability
          </span>
          <span className="text-body-sm text-secondary font-medium">Fast Dispatch</span>
        </div>

        <form onSubmit={handleCheckPincode} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="Enter 6-digit Pincode"
              maxLength={6}
              className="w-full bg-surface px-3.5 py-2.5 text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none border border-outline-variant/40"
            />
          </div>
          <button
            type="submit"
            className="bg-primary text-on-primary px-5 py-2.5 font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container transition-colors cursor-pointer"
          >
            Check
          </button>
        </form>

        {pincodeStatus.checked && pincodeStatus.valid && (
          <div className="flex flex-col gap-1 text-body-sm font-body-sm pt-1">
            <div className="flex items-center gap-2 text-primary font-medium">
              <span className="material-symbols-outlined text-[18px]">
                check_circle
              </span>
              <span>
                Express Delivery by {pincodeStatus.deliveryDate} to {pincodeStatus.city}
              </span>
            </div>
            <p className="text-on-surface-variant pl-6">
              Free Express Shipping on this order • Cash on Delivery Available • Hassle-free 7-day pickup
            </p>
          </div>
        )}

        {pincodeStatus.checked && !pincodeStatus.valid && (
          <p className="text-xs text-rose-700 pl-1">
            Please enter a valid 6-digit Indian PIN code.
          </p>
        )}
      </div>

      {/* ── Signature Brand Value Props Strip (4 Tiles) ───── */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="flex items-start gap-2.5 p-3 bg-surface-container-low">
          <span className="material-symbols-outlined text-[20px] text-primary shrink-0">
            workspace_premium
          </span>
          <div>
            <p className="font-label-caps text-label-caps uppercase font-semibold text-on-surface">
              100% Pure Mulberry Silk
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Lined with breathable luxury satin
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 bg-surface-container-low">
          <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">
            fit_screen
          </span>
          <div>
            <p className="font-label-caps text-label-caps uppercase font-semibold text-on-surface">
              Complimentary Alteration
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Free doorstep adjustments in 14 days
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 bg-surface-container-low">
          <span className="material-symbols-outlined text-[20px] text-tertiary shrink-0">
            handyman
          </span>
          <div>
            <p className="font-label-caps text-label-caps uppercase font-semibold text-on-surface">
              Jaipur Master Tailoring
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Individual hand-inspected pieces
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 bg-surface-container-low">
          <span className="material-symbols-outlined text-[20px] text-primary shrink-0">
            replay
          </span>
          <div>
            <p className="font-label-caps text-label-caps uppercase font-semibold text-on-surface">
              7-Day Easy Returns
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Prepaid reverse doorstep pick-up
            </p>
          </div>
        </div>
      </div>

      {/* ── Size Chart & Fit Guide Modal ──────────────────── */}
      {isSizeGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Size chart and fit guide"
          className="fixed inset-0 z-50 bg-inverse-surface/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsSizeGuideOpen(false)}
        >
          <div
            className="bg-surface max-w-2xl w-full p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40">
              <div>
                <span className="font-label-caps uppercase text-primary tracking-widest text-xs">
                  Closet by Chili Atelier
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mt-0.5">
                  Standard Indian Sizing Matrix
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="pt-4 overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container font-label-caps text-label-caps uppercase text-on-surface">
                    <th className="p-3">Size</th>
                    <th className="p-3">Bust (in)</th>
                    <th className="p-3">Waist (in)</th>
                    <th className="p-3">Hip (in)</th>
                    <th className="p-3">Length (in)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high text-on-surface-variant">
                  <tr>
                    <td className="p-3 font-semibold text-on-surface">XS (34)</td>
                    <td className="p-3">34&quot;</td>
                    <td className="p-3">28&quot;</td>
                    <td className="p-3">37&quot;</td>
                    <td className="p-3">28.5&quot;</td>
                  </tr>
                  <tr className="bg-surface-container-low/50">
                    <td className="p-3 font-semibold text-on-surface">S (36)</td>
                    <td className="p-3">36&quot;</td>
                    <td className="p-3">30&quot;</td>
                    <td className="p-3">39&quot;</td>
                    <td className="p-3">29.0&quot;</td>
                  </tr>
                  <tr className="bg-primary/5 font-medium text-primary">
                    <td className="p-3 font-bold text-primary">M (38)</td>
                    <td className="p-3">38&quot;</td>
                    <td className="p-3">32&quot;</td>
                    <td className="p-3">41&quot;</td>
                    <td className="p-3">29.5&quot;</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-on-surface">L (40)</td>
                    <td className="p-3">40&quot;</td>
                    <td className="p-3">34&quot;</td>
                    <td className="p-3">43&quot;</td>
                    <td className="p-3">30.0&quot;</td>
                  </tr>
                  <tr className="bg-surface-container-low/50">
                    <td className="p-3 font-semibold text-on-surface">XL (42)</td>
                    <td className="p-3">42&quot;</td>
                    <td className="p-3">36&quot;</td>
                    <td className="p-3">45&quot;</td>
                    <td className="p-3">30.5&quot;</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-on-surface">XXL (44)</td>
                    <td className="p-3">44&quot;</td>
                    <td className="p-3">38&quot;</td>
                    <td className="p-3">47&quot;</td>
                    <td className="p-3">31.0&quot;</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 p-3 bg-surface-container-low text-body-sm text-on-surface-variant flex flex-col gap-1">
                <p className="font-semibold text-on-surface">How to Measure:</p>
                <p>• <strong>Bust:</strong> Measure around the fullest part of your chest with relaxed arms.</p>
                <p>• <strong>Waist:</strong> Measure around your natural waistline, keeping tape comfortably loose.</p>
                <p>• <strong>Hips:</strong> Measure around fullest part of your hips, approximately 8&quot; below waist.</p>
              </div>
            </div>

            <div className="pt-6 text-right">
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(false)}
                className="bg-primary text-on-primary font-label-caps text-label-caps uppercase px-6 py-2.5 tracking-wider hover:bg-primary-container transition-colors cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
