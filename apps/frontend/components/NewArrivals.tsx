"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProducts } from "@/lib/api/catalog";
import { mapProductToUi } from "@/lib/adapters/catalog-adapter";
import type { ProductItem } from "@/lib/homepage-data";

export default function NewArrivals({
  products: initialProducts,
}: {
  products?: ProductItem[];
}) {
  const isCustomProvided = initialProducts !== undefined;
  const [products, setProducts] = useState<ProductItem[] | undefined>(initialProducts);
  const [loading, setLoading] = useState<boolean>(!isCustomProvided);

  // Track wishlist state per product
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  // Track selected size per product
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialProducts !== undefined) {
      setProducts(initialProducts);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getProducts({ collection: "new-arrivals", page_size: 4 })
      .then((res) => {
        if (!isMounted) return;
        if (res.results && res.results.length > 0) {
          setProducts(res.results.map((p) => mapProductToUi(p, "New")));
        } else {
          return getProducts({ page_size: 4, ordering: "-created_at" }).then((fallbackRes) => {
            if (isMounted) {
              setProducts(fallbackRes.results.map((p) => mapProductToUi(p, "New")));
            }
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load new arrivals from DB:", err);
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

  const selectSize = (prodId: string, size: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedSizes((prev) => ({
      ...prev,
      [prodId]: size,
    }));
  };

  const displayedProducts = products || [];
  const showEmptyState = !loading && displayedProducts.length === 0;

  return (
    <section
      id="new-arrivals"
      className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-12 bg-surface-container-low"
    >
      <div className="max-w-360 mx-auto">
        {/* ── Section Header (BIBA 4-Column Retail Architecture) ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 sm:pb-8 mb-8 border-b-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-primary-container" />
              <span className="font-label-caps text-label-caps uppercase text-primary tracking-widest font-semibold">
                Fresh Runway Drops
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              New Arrivals
            </h2>
          </div>
          <div className="mt-3 sm:mt-0 flex items-center gap-4">
            <Link
              href="/products?collection=new-arrivals"
              data-path="new-arrivals"
              className="font-label-caps text-label-caps uppercase text-on-surface hover:text-primary transition-colors flex items-center gap-1.5 tracking-wider font-semibold"
            >
              <span>View All Collection</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* ── Empty State ── */}
        {showEmptyState ? (
          <div className="text-center py-12 border border-outline-variant/30 bg-surface">
            <p className="font-body-md text-on-surface-variant">
              New arrivals are currently being updated.
            </p>
          </div>
        ) : (
          /* ── 4-Column Luxury Product Grid (Fetched from DB) ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {displayedProducts.map((product) => {
              const isWishlisted = !!wishlist[product.id];
              const currentSelectedSize = selectedSizes[product.id] || "M";
              const discountStr = product.originalPrice && product.originalPrice > product.price
                ? `(${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF)`
                : null;

              return (
                <div
                  key={product.id}
                  className="group flex flex-col bg-surface-card border border-outline-variant/30 shadow-xs hover:shadow-lg transition-all duration-300 relative"
                >
                  {/* Image Container with Badges, Heart, and Quick-Add Drawer */}
                  <div className="relative w-full aspect-3/4 overflow-hidden bg-surface-container">
                    {/* Badge */}
                    {product.badge && (
                      <span className="absolute top-3 left-3 z-10 bg-primary-container text-on-primary px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wider font-semibold shadow-xs">
                        {product.badge}
                      </span>
                    )}

                    {/* Wishlist Heart Button */}
                    <button
                      type="button"
                      aria-label="Add to Wishlist"
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className={`absolute top-3 right-3 z-10 w-8.5 h-8.5 rounded-full bg-surface/90 hover:bg-surface flex items-center justify-center transition-all shadow-xs cursor-pointer ${
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

                    {/* Product Image */}
                    <Link href={product.href} className="block w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image || "/assets/products/kurti-1.jpg"}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-600 ease-out group-hover:scale-105"
                      />
                    </Link>

                    {/* Quick Add Drawer / Action Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-surface/95 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out flex flex-col gap-2 shadow-md z-20">
                      <div className="flex items-center justify-between text-on-surface-variant font-label-caps text-[10px]">
                        <span>SELECT SIZE</span>
                        <Link
                          href={product.href}
                          className="text-primary hover:underline"
                        >
                          View Details
                        </Link>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 text-center">
                        {["XS", "S", "M", "L", "XL"].map((sz) => {
                          const isChosen = currentSelectedSize === sz;
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={(e) => selectSize(product.id, sz, e)}
                              className={`py-1 font-label-ui text-xs transition-colors cursor-pointer ${
                                isChosen
                                  ? "bg-primary text-on-primary font-semibold"
                                  : "bg-surface-container text-on-surface hover:bg-primary hover:text-on-primary"
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Product Metadata & Pricing */}
                  <div className="p-4 flex flex-col gap-1.5">
                    <span className="font-label-caps text-[10px] uppercase text-outline tracking-wider">
                      {product.detail || "Ethnic Wear"}
                    </span>
                    <Link href={product.href}>
                      <h3 className="font-headline-sm text-[15px] sm:text-[16px] text-on-surface font-semibold group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="font-price-regular text-price-regular text-on-surface font-semibold">
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="font-price-original text-price-original text-outline line-through">
                          ₹{product.originalPrice.toLocaleString("en-IN")}
                        </span>
                      )}
                      {discountStr && (
                        <span className="font-label-caps text-[10px] text-primary font-bold">
                          {discountStr}
                        </span>
                      )}
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
