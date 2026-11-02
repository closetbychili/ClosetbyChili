"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
      className="w-full pt-6 sm:pt-10 lg:pt-12 pb-2 sm:pb-3 lg:pb-4 px-4 sm:px-6 lg:px-8"
      aria-labelledby="category-carousel-heading"
    >
      <div className="max-w-[1800px] mx-auto">
        {/* ── Section Header ── */}
      <div className="flex items-center justify-between mb-5 sm:mb-8 pb-3 border-b border-outline-variant/20">
        <h2
          id="category-carousel-heading"
          className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface leading-none"
        >
          Shop By Category
        </h2>

        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/categories"
            id="browse-all-categories-link"
            data-path="categories"
            aria-label="Browse all categories"
            className="group inline-flex items-center font-label-caps text-[11px] sm:text-label-caps uppercase tracking-[0.16em] text-on-surface-variant hover:text-primary transition-colors font-semibold leading-none"
          >
            <span className="relative pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-outline-variant group-hover:after:bg-primary after:transition-colors">
              Browse All Categories
            </span>
          </Link>

          {/* Luxury Segmented Carousel Arrow Controls */}
          <div className="hidden sm:flex items-center border border-outline-variant/60 rounded-full p-0.5 bg-surface-container-lowest/80 backdrop-blur-xs">
            <button
              type="button"
              id="category-carousel-prev-btn"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Previous categories"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                canScrollLeft
                  ? "text-on-surface hover:bg-surface-container hover:text-primary cursor-pointer active:scale-95"
                  : "text-on-surface-variant/30 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.75]" />
            </button>
            <span className="w-px h-3.5 bg-outline-variant/40 mx-0.5" aria-hidden="true" />
            <button
              type="button"
              id="category-carousel-next-btn"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Next categories"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                canScrollRight
                  ? "text-on-surface hover:bg-surface-container hover:text-primary cursor-pointer active:scale-95"
                  : "text-on-surface-variant/30 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.75]" />
            </button>
          </div>
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
            className={`flex items-start gap-3 sm:gap-5 lg:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 pt-1 select-none scrollbar-none ${
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
                      <Image
                        src={cat.image}
                        alt={cat.imageAlt || cat.name}
                        fill
                        sizes="(max-width: 640px) 176px, (max-width: 1024px) 224px, 272px"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
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
      </div>
    </section>
  );
}
