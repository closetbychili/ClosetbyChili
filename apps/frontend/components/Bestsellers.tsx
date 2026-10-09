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
      setProducts(initialProducts);
      setLoading(false);
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

  const displayedProducts = products || [];
  const showEmptyState = !loading && displayedProducts.length === 0;

  return (
    <section
      id="bestsellers"
      className="w-full py-20 px-4 sm:px-6 lg:px-12 bg-surface"
    >
      <div className="max-w-360 mx-auto">
        {/* Section Header (BIBA Curated Spotlight) */}
        <div className="text-center max-w-xl mx-auto mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">
              star
            </span>
            <span className="font-label-caps text-label-caps uppercase text-primary tracking-widest font-semibold">
              Iconic Silhouettes
            </span>
            <span className="material-symbols-outlined text-secondary text-[18px]">
              star
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            Most Loved By Our Muses
          </h2>
          <span className="sr-only">Bestsellers</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
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
          /* ── 3-Column Spotlight Grid (Fetched from DB) ── */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
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
                  className="group flex flex-col bg-surface-container-low overflow-hidden shadow-xs hover:shadow-xl border border-outline-variant/30 transition-all duration-300"
                >
                  {/* Card Image */}
                  <div className="relative w-full aspect-4/5 overflow-hidden bg-surface-container">
                    <Link href={item.href} className="block w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image || "/assets/products/kurti-2.jpg"}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </Link>
                    <div className="absolute top-4 left-4 bg-surface/95 px-3 py-1 font-label-caps text-[10px] uppercase tracking-widest text-on-surface font-semibold shadow-xs">
                      {rankBadge}
                    </div>

                    <button
                      type="button"
                      aria-label="Add to Wishlist"
                      onClick={(e) => toggleWishlist(item.id, e)}
                      className={`absolute top-4 right-4 w-9 h-9 rounded-full bg-surface/90 hover:bg-surface flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
                        isWishlisted ? "text-primary" : "text-on-surface hover:text-primary"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{
                          fontVariationSettings: isWishlisted ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        favorite
                      </span>
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex flex-col flex-1 justify-between bg-surface">
                    <div>
                      {/* Star Rating Strip */}
                      <div className="flex items-center gap-1 text-secondary mb-2">
                        {[...Array(5)].map((_, sIdx) => (
                          <span
                            key={sIdx}
                            className="material-symbols-outlined text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                        ))}
                        <span className="font-label-caps text-[11px] text-on-surface ml-1 font-semibold">
                          5.0 / 5.0
                        </span>
                        <span className="font-body-sm text-[11px] text-outline ml-0.5">
                          (Verified)
                        </span>
                      </div>

                      {/* Title & Description */}
                      <Link href={item.href}>
                        <h3 className="font-headline-sm text-[18px] sm:text-[20px] text-on-surface font-semibold group-hover:text-primary transition-colors mb-2 leading-tight">
                          {item.name}
                        </h3>
                      </Link>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                        {item.detail || "Handcrafted luxury Indian silhouette."}
                      </p>
                    </div>

                    {/* Price & Action */}
                    <div className="pt-5 mt-4 border-t border-outline-variant/30 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-label-caps text-[10px] uppercase text-outline">
                          Starting From
                        </span>
                        <span className="font-headline-sm text-xl text-on-surface font-bold">
                          ₹{item.price.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <Link
                        href={item.href}
                        className="font-label-caps text-label-caps uppercase text-primary hover:text-on-surface transition-colors flex items-center gap-1 font-semibold group/link"
                      >
                        <span>Explore Piece</span>
                        <span className="material-symbols-outlined text-[16px] group-hover/link:translate-x-1 transition-transform">
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
