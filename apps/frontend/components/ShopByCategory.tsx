"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { getCategories } from "@/lib/api/catalog";
import { mapCategoryToUi } from "@/lib/adapters/catalog-adapter";
import type { CategoryItem } from "@/lib/homepage-data";

interface ShopByCategoryProps {
  categories?: CategoryItem[];
}

export default function ShopByCategory({ categories: initialCategories }: ShopByCategoryProps) {
  const isCustomProvided = initialCategories !== undefined;
  const [categories, setCategories] = useState<CategoryItem[] | undefined>(initialCategories);
  const [loading, setLoading] = useState<boolean>(!isCustomProvided);

  // Carousel ref and scroll indicators
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Mouse drag-to-scroll state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    if (initialCategories !== undefined) return;

    let isMounted = true;

    getCategories({ page_size: 100, storefront: true })
      .then((res) => {
        if (!isMounted) return;
        if (res.results && res.results.length > 0) {
          setCategories(res.results.map((c) => mapCategoryToUi(c)));
        } else {
          setCategories([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load storefront categories from API:", err);
        if (isMounted) setCategories([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialCategories]);

  // Update scroll boundaries
  const updateScrollBounds = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollBounds();
    window.addEventListener("resize", updateScrollBounds);
    return () => window.removeEventListener("resize", updateScrollBounds);
  }, [categories, updateScrollBounds]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Mouse drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
    updateScrollBounds();
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
    }
  };

  const displayedCategories = initialCategories !== undefined ? initialCategories : (categories || []);
  const showEmptyState = !loading && displayedCategories.length === 0;

  return (
    <section
      id="shop-by-category"
      className="w-full py-10 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-12 max-w-360 mx-auto"
      aria-labelledby="category-carousel-heading"
    >
      {/* ── Section Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <span className="h-px w-6 bg-primary" />
            <span className="font-label-caps text-[10px] sm:text-label-caps uppercase text-primary tracking-widest font-semibold">
              Shop By Category
            </span>
          </div>
          <h2 id="category-carousel-heading" className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface">
            Discover By Category
          </h2>
          <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant mt-1 max-w-xl">
            Explore our signature cuts, fluid drapes, and hand-finished silhouettes.
          </p>
        </div>

        <div className="mt-3 md:mt-0 flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
          <span className="text-[11px] font-body-sm text-primary italic md:hidden font-medium">
            Swipe to explore →
          </span>

          {/* Carousel Arrow Controls */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              id="category-carousel-prev-btn"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Previous categories"
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                canScrollLeft
                  ? "border-outline-variant text-on-surface hover:bg-surface-container hover:border-primary cursor-pointer"
                  : "border-outline-variant/40 text-on-surface-variant/40 cursor-not-allowed opacity-50"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="category-carousel-next-btn"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Next categories"
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                canScrollRight
                  ? "border-outline-variant text-on-surface hover:bg-surface-container hover:border-primary cursor-pointer"
                  : "border-outline-variant/40 text-on-surface-variant/40 cursor-not-allowed opacity-50"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Link
            href="/categories"
            id="browse-all-categories-link"
            data-path="categories"
            className="hidden sm:inline-flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-wider text-primary hover:text-on-surface transition-colors font-semibold"
          >
            <span>Browse All Categories</span>
            <span className="material-symbols-outlined text-[16px]">east</span>
          </Link>
        </div>
      </div>

      {/* ── Empty State ── */}
      {showEmptyState ? (
        <div className="mt-8 text-center py-12 border border-outline-variant/30 bg-surface-container-low rounded-2xl">
          <p className="font-body-md text-on-surface-variant">
            Categories are currently being updated for the upcoming season.
          </p>
        </div>
      ) : (
        /* ── Dynamic Horizontal Carousel Area ── */
        <div className="relative group/carousel">
          <div
            ref={scrollContainerRef}
            onScroll={updateScrollBounds}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={`flex items-start gap-3 sm:gap-5 lg:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-12 lg:px-12 select-none scrollbar-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
            tabIndex={0}
            role="region"
            aria-label="Categories carousel"
          >
            {displayedCategories.map((cat) => (
              <div
                key={cat.id}
                className="shrink-0 snap-start w-44 sm:w-56 lg:w-68"
              >
                <Link
                  href={cat.href || `/products?category=${cat.id}`}
                  onClick={handleCardClick}
                  className="group flex flex-col items-center w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-[60px] sm:rounded-t-[80px] lg:rounded-t-[100px]"
                >
                  {/* Arched Image Container */}
                  <div className="relative w-full aspect-[3/4.2] rounded-t-[60px] sm:rounded-t-[80px] lg:rounded-t-[100px] overflow-hidden bg-surface-container shadow-xs transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-md">
                    {cat.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cat.image}
                        alt={cat.imageAlt || cat.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        draggable={false}
                      />
                    ) : (
                      /* Graceful Fallback for categories without uploaded card media */
                      <div className="w-full h-full bg-linear-to-b from-[#FAF6F2] to-[#F2ECE5] flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 border border-outline-variant/30 flex items-center justify-center mb-2 sm:mb-3 shadow-2xs text-primary">
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="font-serif italic text-sm sm:text-base text-on-surface font-semibold line-clamp-2">
                          {cat.name}
                        </span>
                      </div>
                    )}

                    {/* Gradient & Bottom Title Chip */}
                    <div className="absolute inset-0 bg-linear-to-t from-inverse-surface/75 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300" />
                    <div className="absolute bottom-2.5 sm:bottom-3.5 inset-x-0 text-center px-2">
                      <span className="font-body-sm text-[10px] sm:text-[12px] text-secondary-fixed tracking-widest uppercase font-semibold">
                        Explore Cuts
                      </span>
                    </div>
                  </div>

                  {/* Typography Information */}
                  <div className="mt-2.5 sm:mt-3.5 text-center px-1 w-full">
                    <h3 className="font-headline-sm text-[14px] sm:text-headline-sm text-on-surface group-hover:text-primary transition-colors truncate">
                      {cat.name}
                    </h3>
                    {cat.subtitle ? (
                      <p className="font-body-sm text-[11px] sm:text-body-sm text-on-surface-variant mt-0.5 line-clamp-1">
                        {cat.subtitle}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
