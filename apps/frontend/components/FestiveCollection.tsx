"use client";

import { useState } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import { FESTIVE_PRODUCTS } from "@/lib/homepage-data";

export default function FestiveCollection() {
  const [bannerError, setBannerError] = useState(true); // default placeholder since image doesn't exist yet

  return (
    <section id="festive" className="bg-ink text-cream overflow-hidden">
      {/* ── Main Banner Area ──────────────────────────────── */}
      <div className="relative min-h-[550px] lg:min-h-[620px] flex items-center">
        {/* Background */}
        {bannerError ? (
          // Branded placeholder
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-ink via-[#1c0707] to-ink" />
            {/* Gold decorative lines */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, transparent, transparent 50px, rgba(212,175,55,0.5) 50px, rgba(212,175,55,0.5) 51px)",
              }}
            />
            {/* Chili accent glow */}
            <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-chili/8 blur-[120px]" />
            <div className="absolute left-1/4 bottom-0 h-[300px] w-[300px] rounded-full bg-gold/5 blur-[100px]" />
          </div>
        ) : (
          <>
            <img
              src="/assets/festive/festive-banner.jpg"
              alt="Festive Collection — Closet by Chili"
              className="absolute inset-0 h-full w-full object-cover opacity-60"
              onError={() => setBannerError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          </>
        )}

        {/* Content */}
        <div className="relative mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-28 w-full">
          <div className="max-w-xl">
            <p className="flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-gold">
              <span className="inline-block h-px w-8 bg-gold/40" />
              The Festive Edit
            </p>

            <h2 className="mt-6 font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Every celebration
              <br />
              deserves a drape{" "}
              <span className="italic text-chili-light">of its own.</span>
            </h2>

            <p className="mt-7 max-w-md text-sm leading-7 text-cream/55 sm:text-base">
              Rich reds, gilded details and silhouettes made for every
              celebration.
            </p>

            <Link
              href="/collections/festive"
              className="mt-9 inline-block border border-gold/40 px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-gold transition-all hover:bg-gold hover:text-ink"
            >
              Shop Festive Collection
            </Link>
          </div>
        </div>
      </div>

      {/* ── Festive Products (optional 3 below banner) ────── */}
      <div className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-10 lg:pb-28">
        <div className="grid gap-x-5 gap-y-10 grid-cols-2 lg:grid-cols-3">
          {FESTIVE_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
