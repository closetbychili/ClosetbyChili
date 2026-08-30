"use client";

import Link from "next/link";
import ProductCard from "./ProductCard";
import type { ProductItem } from "@/lib/homepage-data";
import { BESTSELLERS } from "@/lib/homepage-data";

export default function Bestsellers({
  products,
}: {
  products?: ProductItem[];
}) {
  const items = products !== undefined ? products : BESTSELLERS;

  return (
    <section
      id="bestsellers"
      className="py-16 sm:py-20 lg:py-24 px-5 sm:px-8 lg:px-12 bg-[#faeceb]/50 border-y border-ink/5 overflow-hidden"
    >
      <div className="mx-auto max-w-[1440px]">
        {/* ── Section Header: Title on Left, Shop All on Right (Same Line) ── */}
        <div className="flex items-end justify-between gap-4 pb-6 sm:pb-8 border-b border-ink/8">
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.35em] text-chili mb-1.5 sm:mb-2">
              Most Loved
            </p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-ink font-normal leading-tight">
              Bestsellers
            </h2>
          </div>

          {/* Single Shop All link on right */}
          <Link
            href="#bestsellers"
            className="inline-flex items-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] text-ink hover:text-chili transition-colors pb-1 border-b-2 border-ink hover:border-chili whitespace-nowrap shrink-0"
          >
            Shop All
          </Link>
        </div>

        {/* ── Swipeable Carousel: 2 Cards on Mobile, 4 Cards on Desktop ───────── */}
        {items.length > 0 ? (
          <div className="mt-8 sm:mt-10 flex gap-3 sm:gap-6 lg:gap-8 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory">
            {items.map((product) => (
              <div
                key={product.id}
                className="w-[calc(50%-6px)] sm:w-[calc(50%-12px)] lg:w-[calc(25%-24px)] flex-shrink-0 snap-start"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 text-center py-12 border border-ink/10 rounded-sm bg-[#faf3ef]/60">
            <p className="text-sm font-display text-ink/70">
              Bestseller catalog is being refreshed.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
