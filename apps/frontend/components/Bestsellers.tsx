"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import { BESTSELLERS } from "@/lib/homepage-data";

export default function Bestsellers() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section
      id="bestsellers"
      className="py-20 sm:py-24 lg:py-28 px-5 sm:px-8 lg:px-12 bg-[#faeceb]/50 border-y border-ink/5 overflow-hidden"
    >
      <div className="mx-auto max-w-[1440px]">
        {/* ── Section Header Row: Title on Left, Controls & SHOP ALL on Right ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-10 sm:pb-12 border-b border-ink/8">
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.35em] text-chili mb-2">
              Most Loved
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-ink font-normal leading-tight">
              Bestsellers
            </h2>
          </div>

          <div className="flex items-center gap-6">
            {/* Scroll Navigation Arrows */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                aria-label="Scroll bestsellers left"
                onClick={() => scroll("left")}
                className="w-10 h-10 rounded-full border border-ink/20 flex items-center justify-center text-ink hover:border-chili hover:text-chili transition-colors"
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>
              <button
                aria-label="Scroll bestsellers right"
                onClick={() => scroll("right")}
                className="w-10 h-10 rounded-full border border-ink/20 flex items-center justify-center text-ink hover:border-chili hover:text-chili transition-colors"
              >
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* SHOP ALL Link */}
            <Link
              href="#bestsellers"
              className="inline-flex items-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] text-ink hover:text-chili transition-colors pb-1 border-b-2 border-ink hover:border-chili"
            >
              Shop All →
            </Link>
          </div>
        </div>

        {/* ── Horizontally Scrollable Product Carousel ───────── */}
        <div
          ref={scrollRef}
          className="mt-8 sm:mt-10 flex gap-4 sm:gap-6 lg:gap-8 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-4 -mx-5 px-5 sm:mx-0 sm:px-0"
        >
          {BESTSELLERS.map((product) => (
            <div
              key={product.id}
              className="w-[260px] sm:w-[300px] lg:w-[calc(25%-1.5rem)] flex-shrink-0 snap-start"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
