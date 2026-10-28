"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProducts } from "@/lib/api/catalog";
import { mapProductToUi } from "@/lib/adapters/catalog-adapter";
import type { ProductItem } from "@/lib/homepage-data";

export default function Bestsellers({
  products: initialProducts,
}: {
  products?: ProductItem[];
}) {
  const isCustomProvided = initialProducts !== undefined;
  const [products, setProducts] = useState<ProductItem[] | undefined>(initialProducts);
  const [loading, setLoading] = useState<boolean>(!isCustomProvided);

  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialProducts !== undefined) {
      return;
    }

    let isMounted = true;
    setLoading(true);

    getProducts({ collection: "bestsellers", page_size: 3 })
      .then((res) => {
        if (!isMounted) return;
        if (res.results && res.results.length > 0) {
          setProducts(res.results.map((p) => mapProductToUi(p, "Bestseller")));
        } else {
          return getProducts({ page_size: 3 }).then((fallbackRes) => {
            if (isMounted) {
              setProducts(fallbackRes.results.map((p) => mapProductToUi(p, "Bestseller")));
            }
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load bestsellers from DB:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialProducts]);

  const toggleWishlist = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setWishlist((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const displayedProducts = initialProducts ?? products ?? [];
  const showEmptyState = !loading && displayedProducts.length === 0;

  return (
    <section
      id="bestsellers"
      className="w-full py-10 sm:py-20 px-4 sm:px-6 lg:px-12 bg-surface"
    >
      <div className="max-w-360 mx-auto">
        {/* Section Header (BIBA Curated Spotlight) */}
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <span className="material-symbols-outlined text-secondary text-[16px] sm:text-[18px]">
              star
            </span>
            <span className="font-label-caps text-[10px] sm:text-label-caps uppercase text-primary tracking-widest font-semibold">
              Iconic Silhouettes
            </span>
            <span className="material-symbols-outlined text-secondary text-[16px] sm:text-[18px]">
              star
            </span>
          </div>
          <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface">
            Most Loved By Our Muses
          </h2>
          <span className="sr-only">Bestsellers</span>
          <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant mt-1.5 sm:mt-2">
            Pieces with verified 4.9+ ratings, designed to make an indelible impression at galas, soirées, and celebrations.
          </p>
        </div>

        {/* Empty State for Tests / Fallback */}
        {showEmptyState ? (
          <div className="text-center py-12 border border-outline-variant/30 bg-surface-container-low">
            <p className="font-body-md text-on-surface-variant">
              Bestseller catalog is being refreshed.
            </p>
          </div>
        ) : (
          /* ── Mobile Horizontal Snap-Scroller / 3-Column Desktop Spotlight Grid ── */
          <div className="flex md:grid overflow-x-auto md:overflow-visible pb-4 md:pb-0 gap-3.5 sm:gap-6 lg:gap-8 snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 md:grid-cols-3">
            {displayedProducts.map((item, idx) => {
              const isWishlisted = !!wishlist[item.id];
              const rankBadge =
                item.badge ||
                (idx === 0
                  ? "Rank #1 Best Seller"
                  : idx === 1
                  ? "Celebrity Pick"
                  : "Festive Essential");

              return (
                <div
                  key={item.id}
                  className="w-[80vw] max-w-75 shrink-0 snap-start md:w-auto md:shrink group flex flex-col bg-surface-container-low overflow-hidden shadow-xs hover:shadow-xl border border-outline-variant/30 transition-all duration-300"
                >
                  {/* Card Image */}
                  <div className="relative w-full aspect-4/5 overflow-hidden bg-surface-container">
                    <Link href={item.href} className="block w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image || "/assets/products/kurti-2.jpg"}
                        alt={item.name}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (!target.src.includes("/assets/products/kurti-2.jpg")) {
                            target.src = "/assets/products/kurti-2.jpg";
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </Link>
                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 bg-surface/95 px-2.5 sm:px-3 py-1 font-label-caps text-[9px] sm:text-[10px] uppercase tracking-widest text-on-surface font-semibold shadow-xs">
                      {rankBadge}
                    </div>

                    <button
                      type="button"
                      suppressHydrationWarning
                      aria-label="Add to Wishlist"
                      onClick={(e) => toggleWishlist(item.id, e)}
                      className={`absolute top-3 sm:top-4 right-3 sm:right-4 w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-surface/90 hover:bg-surface flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
                        isWishlisted ? "text-primary" : "text-on-surface hover:text-primary"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[16px] sm:text-[18px]"
                        style={{
                          fontVariationSettings: isWishlisted ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        favorite
                      </span>
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 sm:p-6 flex flex-col flex-1 justify-between bg-surface">
                    <div>
                      {/* Star Rating Strip */}
                      <div className="flex items-center gap-1 text-secondary mb-1.5 sm:mb-2">
                        {[...Array(5)].map((_, sIdx) => (
                          <span
                            key={sIdx}
                            className="material-symbols-outlined text-[14px] sm:text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                        ))}
                        <span className="font-label-caps text-[10px] sm:text-[11px] text-on-surface ml-1 font-semibold">
                          5.0 / 5.0
                        </span>
                        <span className="font-body-sm text-[10px] sm:text-[11px] text-outline ml-0.5">
                          (Verified)
                        </span>
                      </div>

                      {/* Title & Description */}
                      <Link href={item.href}>
                        <h3 className="font-headline-sm text-[15px] sm:text-[18px] md:text-[20px] text-on-surface font-semibold group-hover:text-primary transition-colors mb-1 sm:mb-2 leading-tight line-clamp-1">
                          {item.name}
                        </h3>
                      </Link>
                      <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                        {item.detail || "Handcrafted luxury Indian silhouette."}
                      </p>
                    </div>

                    {/* Price & Action */}
                    <div className="pt-3 sm:pt-5 mt-3 sm:mt-4 border-t border-outline-variant/30 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-label-caps text-[9px] sm:text-[10px] uppercase text-outline">
                          Starting From
                        </span>
                        <span className="font-headline-sm text-lg sm:text-xl text-on-surface font-bold">
                          ₹{item.price.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <Link
                        href={item.href}
                        className="font-label-caps text-[11px] sm:text-label-caps uppercase text-primary hover:text-on-surface transition-colors flex items-center gap-1 font-semibold group/link"
                      >
                        <span>Explore Piece</span>
                        <span className="material-symbols-outlined text-[15px] sm:text-[16px] group-hover/link:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
