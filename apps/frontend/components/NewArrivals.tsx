"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Check, Loader2 } from "lucide-react";
import { getProducts, getProduct } from "@/lib/api/catalog";
import { mapProductToUi } from "@/lib/adapters/catalog-adapter";
import { useCart } from "@/components/CartContext";
import type { ProductItem } from "@/lib/homepage-data";

export default function NewArrivals({
  products: initialProducts,
}: {
  products?: ProductItem[];
}) {
  const isCustomProvided = initialProducts !== undefined;
  const [products, setProducts] = useState<ProductItem[] | undefined>(initialProducts);
  const [loading, setLoading] = useState<boolean>(!isCustomProvided);

  // Cart integration
  const { addToCart, openDrawer } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  // In-memory cache for resolved variant IDs by product ID
  const [resolvedVariantMap, setResolvedVariantMap] = useState<Record<string, string>>({});

  // Track wishlist state per product
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  // Track selected size per product
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialProducts !== undefined) {
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

  const resolveVariantId = async (product: ProductItem): Promise<string | null> => {
    // 1. Check in-memory resolved map
    if (resolvedVariantMap[product.id]) {
      return resolvedVariantMap[product.id];
    }

    // 2. Check if product already has defaultVariantId
    if (product.defaultVariantId) {
      setResolvedVariantMap((prev) => ({ ...prev, [product.id]: product.defaultVariantId! }));
      return product.defaultVariantId;
    }

    // 3. Check if product already has variants array
    if (product.variants && product.variants.length > 0) {
      const selectedSize = selectedSizes[product.id];
      const match =
        (selectedSize ? product.variants.find((v) => v.size === selectedSize) : null) ||
        product.variants.find((v) => v.inStock !== false) ||
        product.variants[0];
      if (match?.id) {
        setResolvedVariantMap((prev) => ({ ...prev, [product.id]: match.id }));
        return match.id;
      }
    }

    // 4. Fetch product detail by slug to get real variants from API
    const slug = product.slug || product.href.replace("/products/", "").split("?")[0].replace(/^\//, "");
    if (slug) {
      try {
        const detail = await getProduct(slug);
        if (detail?.variants?.length) {
          const active = detail.variants.filter((v) => v.is_active !== false);
          const selectedSize = selectedSizes[product.id];
          const match =
            (selectedSize ? active.find((v) => v.size === selectedSize) : null) ||
            active.find((v) => v.is_in_stock !== false) ||
            active[0];
          if (match?.id) {
            setResolvedVariantMap((prev) => ({ ...prev, [product.id]: match.id }));
            return match.id;
          }
        }
      } catch (err) {
        console.warn("Could not fetch product variants for quick add:", err);
      }
    }

    return null;
  };

  const handleQuickAdd = async (product: ProductItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (addingId === product.id) return;

    setAddingId(product.id);
    try {
      const variantId = await resolveVariantId(product);
      if (!variantId) {
        window.location.href = product.href;
        return;
      }

      await addToCart(variantId, 1);
      setAddedId(product.id);
      openDrawer();
      setTimeout(() => setAddedId(null), 1800);
    } catch (err) {
      console.error("Failed to add variant to bag:", err);
      openDrawer();
    } finally {
      setAddingId(null);
    }
  };

  const handleSelectSizeAndAdd = async (product: ProductItem, size: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSizes((prev) => ({ ...prev, [product.id]: size }));

    if (addingId === product.id) return;

    setAddingId(product.id);
    try {
      let variantId: string | null = null;
      if (product.variants?.length) {
        variantId = product.variants.find((v) => v.size === size)?.id || null;
      }
      if (!variantId) {
        const slug = product.slug || product.href.replace("/products/", "").split("?")[0].replace(/^\//, "");
        if (slug) {
          const detail = await getProduct(slug);
          const match = detail?.variants?.find((v) => v.size === size && v.is_active !== false);
          if (match) variantId = match.id;
        }
      }
      if (!variantId) {
        variantId = await resolveVariantId(product);
      }
      if (!variantId) {
        window.location.href = product.href;
        return;
      }
      await addToCart(variantId, 1);
      setAddedId(product.id);
      openDrawer();
      setTimeout(() => setAddedId(null), 1800);
    } catch (err) {
      console.error("Failed to select size and add to bag:", err);
      openDrawer();
    } finally {
      setAddingId(null);
    }
  };

  const displayedProducts = initialProducts ?? products ?? [];
  const showEmptyState = !loading && displayedProducts.length === 0;

  return (
    <section
      id="new-arrivals"
      className="w-full pt-4 sm:pt-6 lg:pt-8 pb-8 sm:pb-12 lg:pb-16 px-4 sm:px-6 lg:px-8 bg-surface"
    >
      <div className="max-w-[1800px] mx-auto">
        {/* ── Section Header ── */}
        <div className="flex items-center justify-between mb-5 sm:mb-8 pb-3 border-b border-outline-variant/20">
          <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface leading-none">
            New Arrivals
          </h2>
          <div className="flex items-center gap-4">
            <Link
              href="/products?collection=new-arrivals"
              data-path="new-arrivals"
              aria-label="View all new arrivals"
              className="group inline-flex items-center font-label-caps text-[11px] sm:text-label-caps uppercase tracking-[0.16em] text-on-surface-variant hover:text-primary transition-colors font-semibold leading-none"
            >
              <span className="relative pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-outline-variant group-hover:after:bg-primary after:transition-colors">
                View All
              </span>
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
          /* ── 2-Column Mobile / 4-Column Desktop H&M Style Product Grid ── */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 lg:gap-x-6">
            {displayedProducts.map((product) => {
              const isWishlisted = !!wishlist[product.id];
              const swatches = product.swatches;
              const extraColorsCount = product.extraColors;

              return (
                <div
                  key={product.id}
                  className="group flex flex-col bg-transparent transition-all duration-300 relative"
                >
                  {/* Image Container with Delicate Hairline Heart Icon */}
                  <div className="relative w-full aspect-[3/4] overflow-hidden bg-neutral-100">
                    {/* Wishlist Heart Icon — Minimalist Outline directly on image */}
                    <button
                      type="button"
                      suppressHydrationWarning
                      aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 p-1 text-neutral-800 hover:text-black transition-transform duration-200 active:scale-125 cursor-pointer"
                    >
                      <svg
                        className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-colors ${
                          isWishlisted
                            ? "fill-[#8b000a] text-[#8b000a]"
                            : "fill-none stroke-neutral-800 hover:stroke-black"
                        }`}
                        viewBox="0 0 24 24"
                        strokeWidth="1.25"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                        />
                      </svg>
                    </button>

                    {/* Product Image */}
                    <Link href={product.href} className="block w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image || "/assets/products/kurti-1.jpg"}
                        alt={product.name}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (!target.src.includes("/assets/products/kurti-1.jpg")) {
                            target.src = "/assets/products/kurti-1.jpg";
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </Link>

                    {/* Quick-add Size Selection Bar (Slides up on hover) */}
                    <div className="absolute inset-x-0 bottom-0 p-2 sm:p-2.5 bg-white/95 backdrop-blur-xs border-t border-neutral-100 transition-all duration-300 ease-out z-20 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                      <div className="flex items-center justify-between gap-1">
                        {["XS", "S", "M", "L", "XL"].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={(e) => handleSelectSizeAndAdd(product, sz, e)}
                            className="flex-1 py-1 text-[11px] sm:text-xs font-medium text-neutral-800 hover:bg-neutral-900 hover:text-white transition-colors text-center border border-neutral-200 hover:border-neutral-900 cursor-pointer"
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Product Details (Below Image) */}
                  <div className="pt-2.5 sm:pt-3 pb-1 flex flex-col gap-1">
                    {/* Line 1: Product Title */}
                    <Link href={product.href} className="block">
                      <h3 className="text-[13px] sm:text-[14px] text-neutral-800 font-normal leading-snug hover:text-black line-clamp-1 transition-colors">
                        {product.name}
                      </h3>
                    </Link>

                    {/* Line 2: Price and Quick Add + Button on Same Line */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] sm:text-[14px] font-semibold text-neutral-900">
                          ₹{product.price.toLocaleString("en-IN")}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-[11px] sm:text-xs text-neutral-400 line-through">
                            ₹{product.originalPrice.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      {/* + Add to Bag Button */}
                      <button
                        type="button"
                        aria-label={`Add ${product.name} to bag`}
                        disabled={addingId === product.id}
                        onClick={(e) => handleQuickAdd(product, e)}
                        className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-neutral-800 hover:text-black hover:bg-neutral-100 rounded-full transition-all cursor-pointer active:scale-90 ${
                          addingId === product.id ? "opacity-70 cursor-wait" : ""
                        }`}
                      >
                        {addingId === product.id ? (
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-neutral-700" />
                        ) : addedId === product.id ? (
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[1.5]" />
                        )}
                      </button>
                    </div>

                    {/* Line 3: Small Color Boxes / Swatches */}
                    {swatches && swatches.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {swatches.map((swatch, idx) => (
                          <span
                            key={idx}
                            title={swatch.name}
                            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[1px] shrink-0 ${
                              swatch.border ? "border border-neutral-300" : ""
                            }`}
                            style={{ backgroundColor: swatch.color }}
                          />
                        ))}
                        {extraColorsCount !== undefined && extraColorsCount > 0 && (
                          <span className="text-[10px] sm:text-[11px] text-neutral-500 font-normal ml-0.5 leading-none">
                            +{extraColorsCount}
                          </span>
                        )}
                      </div>
                    )}
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
