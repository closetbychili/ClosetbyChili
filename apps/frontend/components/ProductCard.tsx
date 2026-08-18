"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import type { ProductItem } from "@/lib/homepage-data";

export default function ProductCard({
  product,
  aspectRatio = "aspect-[3/4]",
}: {
  product: ProductItem;
  aspectRatio?: string;
}) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imgError, setImgError] = useState(!product.image);

  return (
    <article className="group relative flex flex-col w-full">
      {/* ── Image Container ───────────────────────────────── */}
      <div className={`relative ${aspectRatio} w-full overflow-hidden bg-[#f4ebe6]`}>
        {/* Actual Image if provided and loaded */}
        {!imgError && product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Editorial Fallback Texture */
          <div className="absolute inset-0 bg-gradient-to-br from-[#f8f1ec] via-[#f1e6df] to-[#e8dad1] flex flex-col items-center justify-center p-6 text-center transition-transform duration-700 group-hover:scale-105">
            {/* Subtle woven texture pattern */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #8b000a 0, #8b000a 1px, transparent 0, transparent 20px)",
              }}
            />
            {/* Subtle luxury brand mark */}
            <div className="relative w-12 h-12 rounded-full border border-[#8b000a]/20 flex items-center justify-center mb-3">
              <span className="font-display text-[#8b000a]/60 text-sm font-bold tracking-widest">
                CBC
              </span>
            </div>
            <p className="relative text-[9px] uppercase tracking-[0.25em] text-ink/40 font-medium max-w-[120px]">
              {product.detail}
            </p>
          </div>
        )}

        {/* Badge */}
        {product.badge && (
          <span className="absolute top-3 left-3 bg-[#8b000a] text-[#fff8f7] px-2.5 py-1 text-[8px] sm:text-[9px] font-semibold uppercase tracking-[0.2em] shadow-sm">
            {product.badge}
          </span>
        )}

        {/* Wishlist Heart Button */}
        <button
          type="button"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsWishlisted(!isWishlisted);
          }}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-ink/70 hover:text-chili hover:bg-white transition-all shadow-sm group-hover:opacity-100"
        >
          <Heart
            size={15}
            className={isWishlisted ? "fill-chili text-chili" : ""}
            strokeWidth={1.75}
          />
        </button>

        {/* Quick View Hover Bar */}
        <div className="absolute inset-x-0 bottom-0 py-3 bg-ink/90 backdrop-blur-xs text-[#fff8f7] text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.22em] translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          Quick View
        </div>
      </div>

      {/* ── Product Info ──────────────────────────────────── */}
      <div className="pt-4 flex flex-col flex-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink/45 font-medium">
          {product.detail}
        </p>

        <h3 className="mt-1 font-display text-sm sm:text-base text-ink group-hover:text-chili transition-colors leading-snug">
          <Link href={product.href} className="focus:outline-none">
            {product.name}
          </Link>
        </h3>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xs sm:text-sm font-semibold text-ink">
            ₹{product.price.toLocaleString("en-IN")}
          </span>
          {product.originalPrice && (
            <span className="text-[11px] text-ink/35 line-through">
              ₹{product.originalPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
