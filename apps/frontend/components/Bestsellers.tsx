"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Check, Loader2, Star } from "lucide-react";
import { getProducts, getProduct } from "@/lib/api/catalog";
import { mapProductToUi } from "@/lib/adapters/catalog-adapter";
import { useCart } from "@/components/CartContext";
import type { ProductItem } from "@/lib/homepage-data";

export default function Bestsellers({
  products: initialProducts,
}: {
  products?: ProductItem[];
}) {
  const router = useRouter();
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

  useEffect(() => {
    if (initialProducts !== undefined) {
      return;
    }

    let isMounted = true;

    getProducts({ collection: "bestsellers", page_size: 4 })
      .then((res) => {
        if (!isMounted) return;
        const valid = (res.results || []).filter(
          (p) => p.status === "active" && p.is_active
        );
        if (valid.length >= 4) {
          setProducts(valid.slice(0, 4).map((p) => mapProductToUi(p, "Bestseller")));
        } else {
          return getProducts({ page_size: 8, ordering: "-created_at" }).then((fallbackRes) => {
            if (!isMounted) return;
            const validFallback = (fallbackRes.results || []).filter(
              (p) =>
                p.status === "active" &&
                p.is_active &&
                !valid.some((v) => v.id === p.id)
            );
            const merged = [...valid, ...validFallback].slice(0, 4);
            setProducts(merged.map((p) => mapProductToUi(p, "Bestseller")));
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

  const isValidVariantId = (id: string | null | undefined, productId?: string): boolean => {
    if (!id) return false;
    if (productId && id === productId) return false;
    if (/^(na|bs|cat|prod|stitch)-\d+/i.test(id)) return false;
    return true;
  };

  const resolveVariantId = async (product: ProductItem): Promise<string | null> => {
    // 1. Check in-memory resolved map
    if (resolvedVariantMap[product.id] && isValidVariantId(resolvedVariantMap[product.id], product.id)) {
      return resolvedVariantMap[product.id];
    }

    // 2. Check if product already has defaultVariantId
    if (isValidVariantId(product.defaultVariantId, product.id)) {
      setResolvedVariantMap((prev) => ({ ...prev, [product.id]: product.defaultVariantId! }));
      return product.defaultVariantId!;
    }

    // 3. Check if product already has variants array
    if (product.variants && product.variants.length > 0) {
      const match =
        product.variants.find((v) => v.inStock !== false) ||
        product.variants[0];
      if (isValidVariantId(match?.id, product.id)) {
        setResolvedVariantMap((prev) => ({ ...prev, [product.id]: match!.id }));
        return match!.id;
      }
    }

    // 4. Fetch product detail by slug to get real variants from API
    const slug = product.slug || product.href.replace("/products/", "").split("?")[0].replace(/^\//, "");
    if (slug) {
      try {
        const detail = await getProduct(slug);
        if (detail?.variants?.length) {
          const active = detail.variants.filter((v) => v.is_active !== false);
          const match =
            active.find((v) => v.is_in_stock !== false) ||
            active[0];
          if (isValidVariantId(match?.id, product.id)) {
            setResolvedVariantMap((prev) => ({ ...prev, [product.id]: match!.id }));
            return match!.id;
          }
        }
      } catch (err) {
        console.warn("Could not fetch product variants for bestsellers quick add:", err);
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
        router.push(product.href);
        return;
      }

      await addToCart(variantId, 1);
      setAddedId(product.id);
      openDrawer();
      setTimeout(() => setAddedId(null), 1800);
    } catch (err) {
      console.error("Failed to add bestseller variant to bag:", err);
      openDrawer();
    } finally {
      setAddingId(null);
    }
  };

  const displayedProducts = initialProducts ?? products ?? [];
  const showEmptyState = !loading && displayedProducts.length === 0;

  return (
    <section
      id="bestsellers"
      className="w-full pt-4 sm:pt-6 lg:pt-8 pb-8 sm:pb-12 lg:pb-16 px-4 sm:px-6 lg:px-8 bg-surface"
    >
      <div className="max-w-[1800px] mx-auto">
        {/* ── Section Header (Matching New Arrivals & Shop By Category) ── */}
        <div className="flex items-center justify-between mb-5 sm:mb-8 pb-3 border-b border-outline-variant/20">
          <h2 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface leading-none">
            Bestsellers
          </h2>
          <div className="flex items-center gap-4">
            <Link
              href="/products?collection=bestsellers"
              data-path="bestsellers"
              aria-label="View all bestsellers"
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
              Bestseller catalog is being refreshed.
            </p>
          </div>
        ) : (
          /* ── 2-Column Mobile / 4-Column Desktop H&M Style Product Grid ── */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 lg:gap-x-6">
            {displayedProducts.map((product) => {
              const isWishlisted = !!wishlist[product.id];
              const swatches = product.swatches;
              const extraColorsCount = product.extraColors;
              const rating = product.rating || 4.9;
              const reviewsCount = product.reviewsCount || 48;

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
                    <Link href={product.href} className="block w-full h-full relative">
                      <Image
                        src={product.image || "/assets/products/kurti-2.jpg"}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 400px"
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </Link>
                  </div>

                  {/* Product Details (Below Image) */}
                  <div className="pt-2.5 sm:pt-3 pb-1 flex flex-col gap-1">
                    {/* Line 1: Product Title */}
                    <Link href={product.href} className="block">
                      <h3 className="text-[13px] sm:text-[14px] text-neutral-800 font-normal leading-snug hover:text-black line-clamp-1 transition-colors">
                        {product.name}
                      </h3>
                    </Link>

                    {/* Line 2: Rating Stars Strip */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-800 leading-none">
                        {rating.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-normal leading-none">
                        ({reviewsCount})
                      </span>
                    </div>

                    {/* Line 3: Price and Quick Add + Button on Same Line */}
                    <div className="flex items-center justify-between pt-0.5">
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

                    {/* Line 4: Small Color Boxes / Swatches */}
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
