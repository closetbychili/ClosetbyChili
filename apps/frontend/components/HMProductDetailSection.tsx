"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/CartContext";
import type { ProductDetail, ProductVariantSummary } from "@/lib/api/types";

interface HMProductDetailSectionProps {
  product: ProductDetail;
  galleryImages: string[];
  styleId: string;
}

export default function HMProductDetailSection({
  product,
  galleryImages,
  styleId,
}: HMProductDetailSectionProps) {
  const { addToCart } = useCart();

  // 1. Strictly database-driven product images (no hardcoded URLs)
  const images = useMemo(() => {
    if (galleryImages && galleryImages.length > 0) return galleryImages;
    if (product.images && product.images.length > 0) {
      return product.images.map((img) => img.image_url);
    }
    return [];
  }, [galleryImages, product.images]);

  // 2. Active variants strictly from database
  const activeVariants = useMemo(
    () => product.variants.filter((v) => v.is_active),
    [product.variants]
  );

  // 3. Available colors strictly from database variants
  const availableColors = useMemo(() => {
    const list: string[] = [];
    activeVariants.forEach((v) => {
      if (v.color && v.color.trim()) {
        const clean = v.color.trim();
        if (!list.includes(clean)) list.push(clean);
      }
    });
    return list;
  }, [activeVariants]);

  // 4. Available sizes strictly from database variants
  const availableSizes = useMemo(() => {
    const list: string[] = [];
    activeVariants.forEach((v) => {
      if (v.size && v.size.trim()) {
        v.size.split(/[,/]+/).forEach((s) => {
          const clean = s.trim().toUpperCase();
          if (clean && !list.includes(clean)) list.push(clean);
        });
      }
    });
    return list;
  }, [activeVariants]);

  // Initial selection defaults to first active variant in database
  const firstVariant = activeVariants[0] || product.variants[0];

  const [selectedColor, setSelectedColor] = useState<string>(
    firstVariant?.color?.trim() || availableColors[0] || ""
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    firstVariant?.size?.split(/[,/]+/)[0]?.trim().toUpperCase() ||
      availableSizes[0] ||
      ""
  );

  // UI state
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isStoreCheckOpen, setIsStoreCheckOpen] = useState(false);
  const [storePincode, setStorePincode] = useState("");
  const [storeResult, setStoreResult] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [activeMobileSlide, setActiveMobileSlide] = useState(0);
  const mobileCarouselRef = useRef<HTMLDivElement>(null);

  // Instantly reset scroll to top whenever opening a product or changing products
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    const raf = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    });
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    return () => cancelAnimationFrame(raf);
  }, [product.slug]);

  // Track active slide in mobile horizontal carousel
  const handleMobileScroll = () => {
    if (!mobileCarouselRef.current) return;
    const { scrollLeft, clientWidth } = mobileCarouselRef.current;
    if (clientWidth > 0) {
      const idx = Math.round(scrollLeft / clientWidth);
      if (idx !== activeMobileSlide && idx >= 0 && idx < images.length) {
        setActiveMobileSlide(idx);
      }
    }
  };

  const scrollToSlide = (index: number) => {
    if (!mobileCarouselRef.current) return;
    mobileCarouselRef.current.scrollTo({
      left: index * mobileCarouselRef.current.clientWidth,
      behavior: "smooth",
    });
    setActiveMobileSlide(index);
  };

  // Reset mobile carousel when image set or variant color changes
  useEffect(() => {
    setActiveMobileSlide(0);
    if (mobileCarouselRef.current) {
      mobileCarouselRef.current.scrollLeft = 0;
    }
  }, [images, selectedColor]);

  // Floating Add to Bag visibility:
  // Visible at top of page; vanishes as soon as the static in-page button is encountered on scroll
  const [showFloatingAdd, setShowFloatingAdd] = useState(true);

  useEffect(() => {
    const checkButtonPosition = () => {
      const staticBtn = document.getElementById("add-to-bag-button");
      if (!staticBtn) {
        setShowFloatingAdd(false);
        return;
      }
      const rect = staticBtn.getBoundingClientRect();
      // rect.top <= window.innerHeight means the top of the static button has reached the viewport
      const isEncountered = rect.top <= window.innerHeight;
      setShowFloatingAdd(!isEncountered);
    };

    checkButtonPosition();
    window.addEventListener("scroll", checkButtonPosition, { passive: true });
    window.addEventListener("resize", checkButtonPosition, { passive: true });

    return () => {
      window.removeEventListener("scroll", checkButtonPosition);
      window.removeEventListener("resize", checkButtonPosition);
    };
  }, []);

  // Resolve matching active variant based on database selections
  const currentVariant: ProductVariantSummary | null = useMemo(() => {
    const match = activeVariants.find((v) => {
      const colorMatch =
        !selectedColor ||
        (v.color && v.color.trim().toLowerCase() === selectedColor.trim().toLowerCase());
      const sizeMatch =
        !selectedSize ||
        (v.size &&
          v.size
            .split(/[,/]+/)
            .map((s) => s.trim().toUpperCase())
            .includes(selectedSize.trim().toUpperCase()));
      return colorMatch && sizeMatch;
    });
    return match || firstVariant || null;
  }, [activeVariants, selectedColor, selectedSize, firstVariant]);

  // Price calculations strictly from database
  const retailPrice = currentVariant ? parseFloat(currentVariant.retail_price) : 0;
  const salePrice = currentVariant?.sale_price
    ? parseFloat(currentVariant.sale_price)
    : null;
  const hasDiscount =
    salePrice !== null && !isNaN(salePrice) && salePrice < retailPrice;
  const displayPrice = hasDiscount ? salePrice : retailPrice;
  const discountPercent = hasDiscount
    ? Math.round(((retailPrice - salePrice!) / retailPrice) * 100)
    : 0;

  // Stock status strictly from database
  const isOutOfStock = Boolean(
    currentVariant &&
      (currentVariant.is_in_stock === false ||
        currentVariant.stock_status === "out_of_stock")
  );
  const isLowStock = currentVariant?.stock_status === "low_stock";

  // Add to Bag handler
  const handleAddToBag = async () => {
    if (!currentVariant || isOutOfStock) {
      setErrorMessage(
        isOutOfStock
          ? "This size/variant is currently out of stock."
          : "Please select an available size configuration."
      );
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await addToCart(currentVariant.id, 1);
      setAddedFeedback(true);
      setTimeout(() => {
        setAddedFeedback(false);
      }, 2000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to add to bag. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFloatingAddToBag = async () => {
    if (!currentVariant || isOutOfStock) {
      const sizeGrid = document.getElementById("size-options-grid");
      if (sizeGrid) {
        sizeGrid.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    await handleAddToBag();
  };

  // Find in store check handler
  const handleCheckStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storePincode || storePincode.trim().length !== 6) {
      setStoreResult("Please enter a valid 6-digit Indian PIN code.");
      return;
    }
    setStoreResult(
      `Delivery available to PIN ${storePincode}. Express dispatch from Closet by Chili atelier.`
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // H&M SIGNATURE DUAL-SPEED SMART STICKY ENGINE
  // - Left column (gallery) is ALWAYS anchored in normal document flow (transform = "")
  // - Right column uses native CSS position: sticky with bidirectional scroll tracking:
  //   * When right column fits in viewport: stays pinned at top offset below header
  //   * When taller than viewport (or accordion expanded): scrolls naturally until its bottom
  //     reaches bottom of viewport, then pins at bottom (and pins at top when scrolling up!)
  //   * When accordion is toggled: height changes are smoothly clamped so it NEVER jumps or vanishes
  // ─────────────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLElement>(null);
  const rightColRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const left = leftColRef.current;
    const right = rightColRef.current;
    if (!container || !left || !right) return;

    let lastScrollY = window.scrollY;
    // Top offset below fixed announcement bar + header + spacing
    const maxTop = 112;
    const bottomMargin = 20;

    let currentStickyTop = maxTop;
    let rafId: number;

    const updateStickyPosition = () => {
      // Gallery is ALWAYS in natural DOM flow with zero transforms
      left.style.transform = "";
      right.style.transform = "";

      // Only apply sticky tracking on desktop viewports (>= 1024px)
      if (window.innerWidth < 1024) {
        right.style.position = "";
        right.style.top = "";
        return;
      }

      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollY;
      lastScrollY = scrollY;

      const rightHeight = right.offsetHeight;
      const viewportHeight = window.innerHeight;
      const minTop = viewportHeight - rightHeight - bottomMargin;

      right.style.position = "sticky";

      // Case 1: Entire right column fits in viewport
      if (rightHeight <= viewportHeight - maxTop - bottomMargin) {
        currentStickyTop = maxTop;
        right.style.top = `${maxTop}px`;
        return;
      }

      // Case 2: Right column is taller than viewport (e.g. accordion open or compact display)
      // Two-way smooth sticky tracking:
      // Scrolling down -> scrolls until bottom is visible at minTop, then sticks
      // Scrolling up   -> scrolls until top is visible at maxTop, then sticks
      currentStickyTop = Math.max(minTop, Math.min(maxTop, currentStickyTop - delta));
      right.style.top = `${Math.round(currentStickyTop)}px`;
    };

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateStickyPosition);
    };

    const handleResizeOrMutation = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        lastScrollY = window.scrollY;
        const rightHeight = right.offsetHeight;
        const viewportHeight = window.innerHeight;
        const minTop = viewportHeight - rightHeight - bottomMargin;

        if (rightHeight <= viewportHeight - maxTop - bottomMargin) {
          currentStickyTop = maxTop;
          right.style.top = `${maxTop}px`;
        } else {
          // Re-clamp if accordion opened or closed
          currentStickyTop = Math.max(minTop, Math.min(maxTop, currentStickyTop));
          right.style.top = `${Math.round(currentStickyTop)}px`;
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResizeOrMutation, { passive: true });

    const ro = new ResizeObserver(handleResizeOrMutation);
    ro.observe(container);
    ro.observe(right);

    updateStickyPosition();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResizeOrMutation);
      ro.disconnect();
    };
  }, [images, product, selectedColor, selectedSize]);

  return (
    <>
      {/* ── Breadcrumb Navigation ────────────────────────────────────── */}
      <nav
        aria-label="Breadcrumb"
        className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-12 py-3 text-[11px] tracking-wide text-neutral-500 uppercase flex items-center space-x-2 border-b border-neutral-100"
      >
        <Link href="/" className="hover:text-neutral-900 transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-neutral-900 transition-colors">
          Collections
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-neutral-900 transition-colors"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-neutral-900 font-medium truncate max-w-xs sm:max-w-none">
          {product.name}
        </span>
      </nav>

      {/* ── Main Product Detail Section ──────────────────────────────── */}
      <div
        ref={containerRef}
        className="w-full max-w-[1720px] mx-auto px-0 sm:px-6 lg:px-12 pt-0 sm:pt-6 pb-20 relative min-h-[75vh]"
        data-purpose="product-detail-layout"
      >
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-14 items-start">
          {/* ========================================================== */}
          {/* LEFT COLUMN: H&M Signature Grid (1 then 2 then 1 then 2)   */}
          {/* Anchored in normal DOM flow (will NEVER vanish or glitch)  */}
          {/* ========================================================== */}
          <section
            ref={leftColRef}
            aria-label="Product Media Gallery"
            className="w-full lg:col-span-7 xl:col-span-7"
          >
            {images.length > 0 ? (
              <>
                {/* ── Mobile View: Horizontally Sliding Carousel (< lg) ── */}
                <div
                  data-testid="mobile-image-carousel"
                  className="lg:hidden relative w-full overflow-hidden select-none"
                >
                  <div
                    ref={mobileCarouselRef}
                    onScroll={handleMobileScroll}
                    className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth touch-pan-x"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {images.map((imgSrc, idx) => (
                      <div
                        key={`mobile-${imgSrc}-${idx}`}
                        onClick={() => setZoomIndex(idx)}
                        className="w-full shrink-0 snap-center relative aspect-[3/4] bg-neutral-100 cursor-zoom-in"
                      >
                        <Image
                          src={imgSrc}
                          alt={`${product.name} view ${idx + 1}`}
                          fill
                          priority={idx === 0}
                          sizes="100vw"
                          className="w-full h-full object-cover object-center"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Floating Wishlist Heart Button (matches H&M Mobile) */}
                  <button
                    type="button"
                    aria-label={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsWishlisted(!isWishlisted);
                    }}
                    className="absolute top-3 right-3 z-10 p-2 text-neutral-800 bg-white/85 backdrop-blur-xs rounded-full shadow-sm hover:text-[#A62639] transition-colors cursor-pointer"
                  >
                    <svg
                      className={`w-5 h-5 stroke-[1.5] transition-all duration-200 ${
                        isWishlisted
                          ? "fill-[#A62639] stroke-[#A62639]"
                          : "fill-none stroke-current"
                      }`}
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {/* Pagination Indicators (H&M style small square pips at bottom-left) */}
                  {images.length > 1 && (
                    <div
                      role="tablist"
                      aria-label="Image Pagination"
                      className="absolute bottom-4 left-4 z-10 flex items-center space-x-1.5 px-2 py-1 bg-black/35 backdrop-blur-xs rounded-xs pointer-events-auto shadow-xs"
                    >
                      {images.map((_, idx) => {
                        const isActive = idx === activeMobileSlide;
                        return (
                          <button
                            key={`pip-${idx}`}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-label={`Go to slide ${idx + 1}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToSlide(idx);
                            }}
                            className={`transition-all duration-150 cursor-pointer ${
                              isActive
                                ? "w-2 h-2 border-[1.5px] border-white bg-transparent"
                                : "w-1.5 h-1.5 bg-white/70 hover:bg-white"
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Desktop View: H&M Signature Grid (1 then 2 then 1 then 2) (>= lg) ── */}
                <div
                  data-testid="desktop-image-grid"
                  className="hidden lg:grid w-full sm:grid-cols-2 gap-2 sm:gap-3"
                >
                  {images.map((imgSrc, idx) => {
                    const isFullWidth =
                      idx % 3 === 0 || (idx === images.length - 1 && idx % 3 === 1);

                    return (
                      <div
                        key={`desktop-${imgSrc}-${idx}`}
                        onClick={() => setZoomIndex(idx)}
                        className={`relative w-full bg-neutral-100 overflow-hidden group cursor-zoom-in aspect-[3/4] ${
                          isFullWidth ? "sm:col-span-2" : "sm:col-span-1"
                        }`}
                      >
                        <Image
                          src={imgSrc}
                          alt={`${product.name} view ${idx + 1}`}
                          fill
                          priority={idx === 0}
                          sizes={
                            isFullWidth
                              ? "(max-width: 1024px) 100vw, 58vw"
                              : "(max-width: 1024px) 50vw, 29vw"
                          }
                          className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                        />

                        {/* Zoom indicator on hover */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-sm text-neutral-800">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                            />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="w-full aspect-[3/4] bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 text-xs uppercase tracking-widest">
                No Imagery Available
              </div>
            )}
          </section>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: H&M Minimalist Purchase Flow + Accordions     */}
          {/* Dual-Speed Smart Sticky Sidebar ensures seamless UX       */}
          {/* ========================================================== */}
          <section
            ref={rightColRef}
            aria-label="Product Purchase Information"
            className="w-full lg:col-span-5 xl:col-span-5 px-4 sm:px-0 pt-4 lg:pt-0"
          >
            <div className="w-full space-y-4 sm:space-y-4.5">
              {/* Top Meta: Discount Tag (from DB) & Wishlist Button */}
              <div className="flex items-center justify-between">
                <div>
                  {hasDiscount ? (
                    <span className="inline-block bg-black text-white text-[11px] font-semibold tracking-wider px-2 py-0.5 uppercase">
                      -{discountPercent}%
                    </span>
                  ) : (
                    <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                      Atelier Edition
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  id="wishlist-btn"
                  aria-label={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className="hidden lg:block text-neutral-700 hover:text-[#A62639] p-1 transition-colors group cursor-pointer"
                >
                  <svg
                    className={`w-5 h-5 stroke-[1.5] transition-all duration-200 ${
                      isWishlisted
                        ? "fill-[#A62639] stroke-[#A62639]"
                        : "fill-none stroke-current group-hover:stroke-[#A62639]"
                    }`}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {/* Product Title and Pricing (strictly from DB) */}
              <div className="space-y-1">
                <h1 className="text-base sm:text-lg font-medium tracking-tight text-neutral-900 uppercase">
                  {product.name}
                </h1>
                <div className="flex items-baseline space-x-2 pt-0.5">
                  <span className="text-[#A62639] font-semibold text-base sm:text-lg tracking-tight">
                    ₹{displayPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  {hasDiscount && (
                    <span className="text-neutral-400 line-through text-xs sm:text-sm">
                      ₹{retailPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 font-normal">
                  MRP inclusive of all taxes
                </p>
              </div>

              {/* Color Swatch Selector (strictly from DB) */}
              {availableColors.length > 0 && (
                <div className="space-y-2 pt-1" data-purpose="color-selector">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-900 uppercase tracking-wider text-[11px] font-medium">
                      Colour:{" "}
                      <span className="font-normal text-neutral-700" id="active-color-name">
                        {selectedColor}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 overflow-x-auto py-1 no-scrollbar">
                    {availableColors.map((colorName, cIdx) => {
                      const isSelected =
                        selectedColor.toLowerCase() === colorName.toLowerCase();
                      const swatchImg = images[cIdx % images.length] || images[0];

                      return (
                        <button
                          key={colorName}
                          type="button"
                          aria-label={`Select ${colorName}`}
                          onClick={() => setSelectedColor(colorName)}
                          className={`color-option p-0.5 transition-all w-12 h-16 sm:w-13 sm:h-17 flex-shrink-0 bg-neutral-50 flex items-center justify-center focus:outline-none cursor-pointer ${
                            isSelected
                              ? "border-2 border-black shadow-sm"
                              : "border border-neutral-200 hover:border-neutral-400"
                          }`}
                        >
                          <div className="relative w-full h-full overflow-hidden">
                            {swatchImg ? (
                              <Image
                                src={swatchImg}
                                alt={`${colorName} swatch`}
                                fill
                                sizes="52px"
                                className="object-cover object-center"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500">
                                {colorName}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector Grid (strictly from DB variants) */}
              {availableSizes.length > 0 && (
                <div className="space-y-2 pt-1" data-purpose="size-selector">
                  <div
                    className="flex flex-wrap gap-2"
                    id="size-options-grid"
                  >
                    {availableSizes.map((sizeOption) => {
                      const isSelected =
                        selectedSize.toUpperCase() === sizeOption.toUpperCase();

                      return (
                        <button
                          key={sizeOption}
                          type="button"
                          onClick={() => setSelectedSize(sizeOption)}
                          className={`size-btn min-w-[3.5rem] px-3.5 py-2.5 text-xs tracking-wider transition-all uppercase cursor-pointer border ${
                            isSelected
                              ? "bg-black text-white border-black font-medium shadow-sm"
                              : "bg-white text-neutral-800 border-neutral-300 font-normal hover:border-neutral-900 hover:bg-neutral-50"
                          }`}
                        >
                          {sizeOption}
                        </button>
                      );
                    })}
                  </div>

                  {/* Size Guide Link */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="text-[11px] font-medium tracking-widest uppercase text-neutral-800 hover:text-[#A62639] underline underline-offset-4 transition-colors cursor-pointer"
                    >
                      Size Guide
                    </button>
                  </div>
                </div>
              )}

              {/* Error feedback if needed */}
              {errorMessage && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              {/* Primary CTA Button: Add To Bag */}
              <div className="pt-1">
                <button
                  type="button"
                  id="add-to-bag-button"
                  disabled={isSubmitting || isOutOfStock}
                  onClick={handleAddToBag}
                  className={`w-full text-white active:scale-[0.99] py-3.5 text-xs font-semibold tracking-widest uppercase transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    isOutOfStock
                      ? "bg-neutral-400"
                      : addedFeedback
                      ? "bg-neutral-800"
                      : "bg-black hover:bg-neutral-900"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center space-x-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adding to Bag...</span>
                    </span>
                  ) : addedFeedback ? (
                    <span>Added to Bag ✓</span>
                  ) : isOutOfStock ? (
                    <span>Out of Stock</span>
                  ) : (
                    <span>Add to Bag</span>
                  )}
                </button>
              </div>

              {/* Retail Store Availability & Real Stock Status */}
              <div className="pt-2 pb-1.5 space-y-2 border-b border-neutral-200">
                {/* Find in Store Row */}
                <div className="flex items-center justify-between text-xs text-neutral-800">
                  <span className="font-normal">Find in store</span>
                  <button
                    type="button"
                    onClick={() => setIsStoreCheckOpen(true)}
                    className="text-[11px] font-medium tracking-widest uppercase underline underline-offset-4 hover:text-[#A62639] transition-colors cursor-pointer"
                  >
                    Check Availability
                  </button>
                </div>

                {/* Stock Indicator from DB */}
                <div className="flex items-center justify-between text-xs text-neutral-700">
                  <span className="font-normal">Stock Status:</span>
                  <div className="flex items-center space-x-1.5 font-medium">
                    {isOutOfStock ? (
                      <span className="text-red-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                        Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="text-amber-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        Low Stock — Few Units Remaining
                      </span>
                    ) : (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                        In Stock — Ready to Dispatch
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Minimalist Accordion Modules (H&M style details/summary) */}
              <div
                className="divide-y divide-neutral-200 font-sans"
                data-purpose="product-accordions"
              >
                {/* Accordion Item 1: Description & Details */}
                <details className="group py-3 cursor-pointer" open>
                  <summary className="flex items-center justify-between list-none text-xs font-medium uppercase tracking-wider text-neutral-900 select-none">
                    <span>Description &amp; Fit</span>
                    <span className="accordion-icon text-lg font-light transition-transform duration-200 text-neutral-600 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="pt-3.5 text-xs text-neutral-600 leading-relaxed space-y-2">
                    <p className="whitespace-pre-line">
                      {product.description ||
                        "Tailored garment designed with artisanal precision and contemporary silhouettes."}
                    </p>
                    <ul className="pt-1 list-disc list-inside space-y-1 text-neutral-500">
                      {product.category && (
                        <li>Category: {product.category.name}</li>
                      )}
                      {currentVariant?.sku && (
                        <li>Art. No. (SKU): {currentVariant.sku}</li>
                      )}
                      {selectedColor && <li>Colour: {selectedColor}</li>}
                    </ul>
                  </div>
                </details>

                {/* Accordion Item 2: Material & Care */}
                <details className="group py-3.5 cursor-pointer">
                  <summary className="flex items-center justify-between list-none text-xs font-medium uppercase tracking-wider text-neutral-900 select-none">
                    <span>Material &amp; Care</span>
                    <span className="accordion-icon text-lg font-light transition-transform duration-200 text-neutral-600 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="pt-3.5 text-xs text-neutral-600 leading-relaxed space-y-2">
                    <p>
                      <strong className="font-medium text-neutral-800">
                        Care Instructions:
                      </strong>{" "}
                      Dry clean or hand wash cold with gentle detergent. Avoid
                      direct sunlight. Low steam iron if needed.
                    </p>
                  </div>
                </details>

                {/* Accordion Item 3: Delivery & Payment */}
                <details className="group py-3.5 cursor-pointer">
                  <summary className="flex items-center justify-between list-none text-xs font-medium uppercase tracking-wider text-neutral-900 select-none">
                    <span>Delivery and Payment</span>
                    <span className="accordion-icon text-lg font-light transition-transform duration-200 text-neutral-600 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="pt-3.5 text-xs text-neutral-600 leading-relaxed space-y-2">
                    <p>
                      Standard delivery across India in 2-4 business days. Express
                      air shipping available on all orders.
                    </p>
                    <p>
                      Returns and exchanges accepted within 14 calendar days from
                      delivery in original condition with tags attached.
                    </p>
                    <p className="text-neutral-500">
                      Accepted payment methods: UPI, Credit/Debit Cards, Net
                      Banking, Cash on Delivery (COD).
                    </p>
                  </div>
                </details>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Size Guide Modal ────────────────────────────────────────── */}
      {isSizeGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsSizeGuideOpen(false)}
        >
          <div
            className="bg-white max-w-lg w-full p-6 sm:p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
                Size Guide &amp; Measurements (Inches)
              </h3>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(false)}
                className="text-neutral-400 hover:text-neutral-900 text-lg font-light p-1"
              >
                ✕
              </button>
            </div>
            <div className="pt-4 overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Size</th>
                    <th className="py-2.5">Bust</th>
                    <th className="py-2.5">Waist</th>
                    <th className="py-2.5">Hips</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  <tr>
                    <td className="py-2.5 font-semibold text-neutral-900">XS</td>
                    <td className="py-2.5">32-34&quot;</td>
                    <td className="py-2.5">26-27&quot;</td>
                    <td className="py-2.5">35-36&quot;</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-neutral-900">S</td>
                    <td className="py-2.5">34-36&quot;</td>
                    <td className="py-2.5">28-29&quot;</td>
                    <td className="py-2.5">37-38&quot;</td>
                  </tr>
                  <tr className="bg-neutral-50 font-medium">
                    <td className="py-2.5 font-semibold text-neutral-900">M</td>
                    <td className="py-2.5">36-38&quot;</td>
                    <td className="py-2.5">30-31&quot;</td>
                    <td className="py-2.5">39-40&quot;</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-neutral-900">L</td>
                    <td className="py-2.5">38-40&quot;</td>
                    <td className="py-2.5">32-33&quot;</td>
                    <td className="py-2.5">41-42&quot;</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-neutral-900">XL</td>
                    <td className="py-2.5">40-42&quot;</td>
                    <td className="py-2.5">34-36&quot;</td>
                    <td className="py-2.5">43-44&quot;</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[11px] text-neutral-400 mt-4 leading-relaxed">
                Measurements refer to standard body measurements. Choose your usual
                size for a tailored silhouette.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Check Store Availability Modal ─────────────────────────── */}
      {isStoreCheckOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsStoreCheckOpen(false)}
        >
          <div
            className="bg-white max-w-sm w-full p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                Check Store Availability
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsStoreCheckOpen(false);
                  setStoreResult(null);
                }}
                className="text-neutral-400 hover:text-neutral-900 text-lg font-light p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCheckStore} className="pt-4 space-y-3">
              <div>
                <label
                  htmlFor="pincode-input"
                  className="block text-[11px] uppercase tracking-wider text-neutral-600 mb-1"
                >
                  Enter PIN Code
                </label>
                <div className="flex gap-2">
                  <input
                    id="pincode-input"
                    type="text"
                    maxLength={6}
                    value={storePincode}
                    onChange={(e) =>
                      setStorePincode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="e.g. 400050"
                    className="flex-1 border border-neutral-300 px-3 py-2 text-xs focus:outline-none focus:border-black"
                  />
                  <button
                    type="submit"
                    className="bg-black text-white px-4 text-[11px] font-semibold tracking-wider uppercase hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Check
                  </button>
                </div>
              </div>
              {storeResult && (
                <p className="text-xs text-neutral-700 bg-neutral-50 p-2.5 border border-neutral-200 leading-relaxed">
                  {storeResult}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── Lightbox Zoom Modal ─────────────────────────────────────── */}
      {zoomIndex !== null && images[zoomIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomIndex(null)}
        >
          <button
            type="button"
            onClick={() => setZoomIndex(null)}
            className="absolute top-6 right-6 text-white text-2xl font-light hover:opacity-80 transition-opacity p-2 cursor-pointer z-10"
          >
            ✕
          </button>
          <div
            className="relative max-w-4xl max-h-[88vh] w-full h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[zoomIndex]}
              alt={`${product.name} zoom view ${zoomIndex + 1}`}
              fill
              sizes="(max-width: 1200px) 90vw, 75vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
      {/* ── Mobile Floating Add to Bag Button (< lg) ──────────────── */}
      {/* Visible at the top of page; vanishes as soon as the static button is encountered on scroll */}
      <div
        data-testid="floating-add-to-bag-bar"
        className={`lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md px-4 py-3 border-t border-neutral-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out ${
          showFloatingAdd
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          id="floating-add-to-bag-button"
          onClick={handleFloatingAddToBag}
          disabled={isSubmitting || isOutOfStock}
          className={`w-full text-white py-3.5 text-xs font-semibold tracking-widest uppercase transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-sm ${
            isOutOfStock
              ? "bg-neutral-400"
              : addedFeedback
              ? "bg-neutral-800"
              : "bg-black hover:bg-neutral-900 active:scale-[0.99]"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Adding to Bag...</span>
            </span>
          ) : addedFeedback ? (
            <span>Added to Bag ✓</span>
          ) : isOutOfStock ? (
            <span>Out of Stock</span>
          ) : (
            <span>Add to Bag</span>
          )}
        </button>
      </div>
    </>
  );
}
