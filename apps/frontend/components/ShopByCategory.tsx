"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategories } from "@/lib/api/catalog";
import { mapCategoryToUi } from "@/lib/adapters/catalog-adapter";
import type { CategoryItem } from "@/lib/homepage-data";

export default function ShopByCategory({
  categories: initialCategories,
}: {
  categories?: CategoryItem[];
}) {
  const isCustomProvided = initialCategories !== undefined;
  const [categories, setCategories] = useState<CategoryItem[] | undefined>(initialCategories);
  const [loading, setLoading] = useState<boolean>(!isCustomProvided);

  useEffect(() => {
    if (initialCategories !== undefined) {
      setCategories(initialCategories);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getCategories({ page_size: 5 })
      .then((res) => {
        if (!isMounted) return;
        if (res.results && res.results.length > 0) {
          setCategories(res.results.map((c) => mapCategoryToUi(c)));
        }
      })
      .catch((err) => {
        console.error("Failed to load categories from DB:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialCategories]);

  const displayedCategories = categories || [];
  const showEmptyState = !loading && displayedCategories.length === 0;

  return (
    <section
      id="shop-by-category"
      className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-360 mx-auto"
    >
      {/* ── Section Header (BIBA Category Architecture) ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-px w-6 bg-primary" />
            <span className="font-label-caps text-label-caps uppercase text-primary tracking-widest font-semibold">
              Shop By Category
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            Discover By Category
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-xl">
            Explore our signature cuts, fluid drapes, and hand-finished silhouettes.
          </p>
        </div>
        <Link
          href="/products"
          data-path="collections"
          className="mt-4 md:mt-0 inline-flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-wider text-primary hover:text-on-surface transition-colors font-semibold"
        >
          <span>Browse All Silhouettes</span>
          <span className="material-symbols-outlined text-[16px]">east</span>
        </Link>
      </div>

      {/* ── Empty State ── */}
      {showEmptyState ? (
        <div className="mt-8 text-center py-12 border border-outline-variant/30 bg-surface-container-low">
          <p className="font-body-md text-on-surface-variant">
            Categories are currently being updated.
          </p>
        </div>
      ) : (
        /* ── 5 Arched Cards from Database ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
          {displayedCategories.map((cat, index) => {
            const isLastOnSmall = index === 4;
            return (
              <Link
                key={cat.id}
                href={cat.href || `/products?category=${cat.id}`}
                className={`group flex flex-col items-center ${
                  isLastOnSmall ? "col-span-2 sm:col-span-1" : ""
                }`}
              >
                {/* Arched Image Container */}
                <div className="relative w-full aspect-[3/4.2] rounded-t-[80px] lg:rounded-t-[100px] overflow-hidden bg-surface-container shadow-xs transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cat.image || "/assets/hero/hero-2.webp"}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Gradient & Bottom Title Chip */}
                  <div className="absolute inset-0 bg-linear-to-t from-inverse-surface/75 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300" />
                  <div className="absolute bottom-3.5 inset-x-0 text-center px-2">
                    <span className="font-body-sm text-[12px] text-secondary-fixed tracking-widest uppercase font-semibold">
                      Explore Cuts
                    </span>
                  </div>
                </div>

                {/* Typography Information */}
                <div className="mt-3.5 text-center">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  {cat.subtitle && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      {cat.subtitle}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
