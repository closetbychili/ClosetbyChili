"use client";

import Link from "next/link";
import Image from "next/image";

export default function EditorialFeature() {
  return (
    <section
      id="brand-manifesto"
      className="w-full py-14 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-12 bg-[#faf7f5] border-t border-[#e6ded6]/60"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-center">
          {/* ── Left Column: Editorial Feature Card ───────────── */}
          <div className="lg:col-span-6 xl:col-span-5 relative">
            <div className="relative bg-white p-3 sm:p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] border border-[#e6ded6]">
              {/* Photo Box */}
              <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full overflow-hidden bg-[#f6f3f2]">
                <Image
                  src="/images/about/manifesto-editorial.jpg"
                  alt="Closet by Chili Signature vermilion tailored pantsuit with sculptural wide-brim hat"
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover object-top"
                  priority
                />

                {/* Top-Left Stamp Badge */}
                <div className="absolute top-3 sm:top-4 left-3 sm:left-4 bg-white/95 backdrop-blur-xs py-2 px-3.5 sm:py-2.5 sm:px-4 shadow-sm border border-[#e6ded6]/80 flex flex-col">
                  <span className="font-serif text-[15px] sm:text-[17px] font-bold tracking-[0.2em] text-[#8b000a] leading-none">
                    CHILI
                  </span>
                  <span className="font-sans text-[8px] sm:text-[8.5px] uppercase tracking-[0.25em] text-[#1c1b1f] font-semibold mt-1">
                    SIGNATURE EDITION
                  </span>
                </div>
              </div>

              {/* Bottom Social Interaction Bar */}
              <div className="pt-3 pb-0.5 px-2 flex items-center gap-5 text-[#55504c]">
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <svg
                    className="w-4 h-4 text-[#8b000a] fill-[#8b000a]"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <span className="font-medium text-[11px] text-[#313030]">1.4K</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <svg
                    className="w-4 h-4 text-[#766d66]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span className="font-medium text-[11px] text-[#313030]">86</span>
                </span>
                <span className="inline-flex items-center text-xs">
                  <svg
                    className="w-4 h-4 text-[#766d66]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </span>
              </div>

              {/* Floating Pill: Artisanal Details */}
              <div className="absolute -bottom-6 -right-2 sm:-right-5 bg-white p-3.5 sm:p-4.5 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.16)] max-w-[260px] sm:max-w-[285px] flex flex-col gap-1 z-10 border border-[#e6ded6]">
                <div className="flex items-center gap-1.5 text-[#996515]">
                  <span className="material-symbols-outlined text-[18px]">
                    military_tech
                  </span>
                  <span className="font-sans text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-[#8b5e1a]">
                    ARTISANAL DETAILS
                  </span>
                </div>
                <p className="font-sans text-[11px] sm:text-[11.5px] text-[#55504c] leading-relaxed">
                  Custom molded gold-toned buttons inspired by royal jharokha geometry, stitched by master karigars in Jaipur.
                </p>
              </div>
            </div>
          </div>

          {/* ── Right Column: Manifesto Narrative & Pillars ───── */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center lg:pl-4 xl:pl-8 mt-6 lg:mt-0">
            {/* Tagline */}
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="h-0.5 w-6 bg-[#8b000a]" />
              <span className="font-sans text-[10.5px] sm:text-[11px] uppercase tracking-[0.24em] text-[#8b000a] font-bold">
                BRAND MANIFESTO &bull; HERITAGE
              </span>
            </div>

            {/* Headline with serif italic contrast */}
            <h2 className="font-serif text-3xl sm:text-4xl xl:text-[44px] text-[#1c1b1f] font-normal leading-[1.18] mb-5 tracking-tight">
              &ldquo;We don&apos;t just dress you, <br className="hidden sm:inline" />
              <span className="italic font-serif text-[#8b000a]">we express you.&rdquo;</span>
            </h2>

            {/* Standout Lead Statement */}
            <p className="font-serif text-[17px] sm:text-[18px] xl:text-[20px] text-[#1c1b1f] leading-snug font-normal mb-4">
              Closet by Chili is where contemporary power silhouettes meet four centuries of Indian craft mastery.
            </p>

            {/* Rich Narrative Paragraph */}
            <p className="font-sans text-[13px] sm:text-[13.5px] text-[#55504c] leading-[1.75] mb-7 font-light">
              From sharp tailored vermilion trouser suits to fluid hand-pleated concept drapes, we engineer heirlooms for the modern woman who owns every room she commands. Rooted in chili crimson and spun antique gold&mdash;the hues of unyielding passion and regal sovereign poise&mdash;each silhouette balances fearless urban grit with transcendent textile heritage.
            </p>

            {/* 4 Feature Cards (2x2 Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
              {/* Card 1: 100% Pure Silk & Satin */}
              <div className="flex items-start gap-3 p-3.5 bg-white/75 backdrop-blur-xs border border-[#e9e3da] shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
                <span className="material-symbols-outlined text-[#8b000a] text-[20px] shrink-0 mt-0.5">
                  verified
                </span>
                <div className="flex flex-col">
                  <span className="font-sans text-[11px] uppercase tracking-[0.14em] text-[#1c1b1f] font-bold">
                    100% PURE SILK &amp; SATIN
                  </span>
                  <span className="font-sans text-[11px] text-[#55504c] leading-relaxed mt-0.5">
                    Lustrous, breathable inner linings hand-woven across master pit-looms in Varanasi.
                  </span>
                </div>
              </div>

              {/* Card 2: Bespoke Fit Cut */}
              <div className="flex items-start gap-3 p-3.5 bg-white/75 backdrop-blur-xs border border-[#e9e3da] shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
                <span className="material-symbols-outlined text-[#8b000a] text-[20px] shrink-0 mt-0.5">
                  straighten
                </span>
                <div className="flex flex-col">
                  <span className="font-sans text-[11px] uppercase tracking-[0.14em] text-[#1c1b1f] font-bold">
                    BESPOKE FIT CUT
                  </span>
                  <span className="font-sans text-[11px] text-[#55504c] leading-relaxed mt-0.5">
                    Anatomically engineered darting sculpted specifically for South Asian contours.
                  </span>
                </div>
              </div>

              {/* Card 3: Custom Gold Hardware */}
              <div className="flex items-start gap-3 p-3.5 bg-white/75 backdrop-blur-xs border border-[#e9e3da] shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
                <span className="material-symbols-outlined text-[#8b000a] text-[20px] shrink-0 mt-0.5">
                  diamond
                </span>
                <div className="flex flex-col">
                  <span className="font-sans text-[11px] uppercase tracking-[0.14em] text-[#1c1b1f] font-bold">
                    CUSTOM GOLD HARDWARE
                  </span>
                  <span className="font-sans text-[11px] text-[#55504c] leading-relaxed mt-0.5">
                    Hand-cast brass trims and antique micro-zardozi gold bullion threads that never tarnish.
                  </span>
                </div>
              </div>

              {/* Card 4: Signature Packaging */}
              <div className="flex items-start gap-3 p-3.5 bg-white/75 backdrop-blur-xs border border-[#e9e3da] shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
                <span className="material-symbols-outlined text-[#8b000a] text-[20px] shrink-0 mt-0.5">
                  inventory_2
                </span>
                <div className="flex flex-col">
                  <span className="font-sans text-[11px] uppercase tracking-[0.14em] text-[#1c1b1f] font-bold">
                    SIGNATURE PACKAGING
                  </span>
                  <span className="font-sans text-[11px] text-[#55504c] leading-relaxed mt-0.5">
                    Luxe padded garment carriers, bespoke cedar hangers, and crimson wax-sealed letters.
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 pt-1">
              <Link
                href="/products"
                data-path="collections"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-[#8b000a] text-white font-sans text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-[#680007] transition-all duration-300 shadow-sm hover:shadow-md group"
              >
                <span>SHOP THE CURATED EDIT</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  &rarr;
                </span>
              </Link>

              <a
                href="#brand-essence"
                className="inline-flex items-center justify-center gap-2 text-[#1c1b1f] hover:text-[#8b000a] font-sans text-[11px] uppercase tracking-[0.18em] font-bold transition-colors py-2"
              >
                <span>EXPLORE THE PILLARS</span>
                <span className="text-[13px]">&darr;</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
