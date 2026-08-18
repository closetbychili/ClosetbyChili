"use client";

import { useState } from "react";
import Link from "next/link";
import type { DemoCategory } from "@/lib/homepage-data";

/**
 * Large editorial category card with graceful image handling.
 * Uses a branded dark placeholder when the category image isn't available yet.
 */
export default function CategoryCard({ category }: { category: DemoCategory }) {
  const [imgError, setImgError] = useState(true); // default to placeholder since demo images don't exist yet

  return (
    <Link
      href={category.href}
      className="group relative aspect-[3/4] overflow-hidden block"
    >
      {/* ── Branded placeholder ──────────────────────────── */}
      {imgError && (
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-[#1a1a1a] to-[#0d0d0d]">
          {/* Subtle gold fabric pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, transparent, transparent 30px, rgba(212,175,55,0.4) 30px, rgba(212,175,55,0.4) 31px)",
            }}
          />
          {/* Warm accent glow */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-chili/10 to-transparent" />
        </div>
      )}

      {/* ── Actual image ─────────────────────────────────── */}
      {!imgError && (
        <img
          src={category.image}
          alt={category.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      )}

      {/* ── Overlay ──────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* ── Content ──────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-7 text-white">
        <h3 className="font-display text-xl lg:text-2xl">{category.name}</h3>
        <span className="mt-2 inline-block text-[9px] uppercase tracking-[0.25em] text-white/60 group-hover:text-gold transition-colors">
          Shop Now
        </span>
      </div>
    </Link>
  );
}
