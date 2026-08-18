"use client";

import { useState } from "react";
import Link from "next/link";
import type { DemoProduct } from "@/lib/homepage-data";

/**
 * Premium product card with graceful image handling.
 * When the product image is missing/not yet available,
 * it renders a branded placeholder instead of a broken icon.
 */
export default function ProductCard({ product }: { product: DemoProduct }) {
  const [imgError, setImgError] = useState(true); // default to placeholder since demo images don't exist yet

  return (
    <article className="group">
      <Link href={product.href} className="block">
        {/* ── Image Area ──────────────────────────────────── */}
        <div className="relative aspect-[3/4] overflow-hidden bg-ivory">
          {/* Branded placeholder (always shown since demo images don't exist yet) */}
          {imgError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-ivory via-cream to-ivory">
              {/* Subtle decorative pattern */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, transparent, transparent 20px, #111 20px, #111 21px)",
                }}
              />
              {/* Category label */}
              <div className="relative flex flex-col items-center gap-3 text-center">
                <div className="h-12 w-12 rounded-full border border-ink/10 flex items-center justify-center">
                  <div className="h-5 w-px bg-ink/15 rotate-45" />
                  <div className="h-5 w-px bg-ink/15 -rotate-45 -ml-px" />
                </div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-ink/30 font-medium">
                  {product.category}
                </p>
              </div>
            </div>
          )}

          {/* Actual image (hidden until real images are available) */}
          {!imgError && (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              onError={() => setImgError(true)}
            />
          )}

          {/* Badge */}
          {product.badge && (
            <span className="absolute left-4 top-4 bg-ink px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-cream">
              {product.badge}
            </span>
          )}

          {/* Quick View overlay */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full bg-ink/90 py-3.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-cream opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            Quick View
          </div>
        </div>

        {/* ── Product Info ─────────────────────────────────── */}
        <div className="pt-4">
          <p className="text-[9px] uppercase tracking-[0.2em] text-ink/40 font-medium">
            {product.category}
          </p>
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <h3 className="font-display text-base lg:text-lg leading-snug group-hover:text-chili transition-colors">
              {product.name}
            </h3>
            <div className="flex items-baseline gap-2 flex-shrink-0 pt-0.5">
              <span className="text-sm font-medium">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-ink/35 line-through">
                  ₹{product.originalPrice.toLocaleString("en-IN")}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
