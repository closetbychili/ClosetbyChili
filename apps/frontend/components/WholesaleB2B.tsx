"use client";

import Link from "next/link";

export default function WholesaleB2B() {
  return (
    <section className="w-full py-10 sm:py-16 px-3.5 sm:px-6 lg:px-12 bg-page-bg">
      <div className="max-w-360 mx-auto">
        <div className="relative bg-inverse-surface text-on-primary p-5 sm:p-10 lg:p-14 shadow-2xl overflow-hidden border border-outline-variant/20">
          {/* Subtle Decorative Golden Gradient Accents */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-primary/25 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-8 flex flex-col gap-2.5 sm:gap-3">
              <div className="inline-flex items-center gap-2">
                <span className="font-label-caps text-[10px] sm:text-label-caps uppercase text-secondary-fixed tracking-widest font-semibold">
                  B2B &amp; Boutique Concierge
                </span>
                <span className="text-outline-variant text-[10px]">|</span>
                <span className="font-label-caps text-[10px] sm:text-[11px] text-surface-variant uppercase tracking-wider">
                  Global Dispatch
                </span>
              </div>

              <h2 className="font-headline-lg text-xl sm:text-headline-lg lg:text-[36px] text-on-primary font-semibold leading-tight">
                Closet by Chilli for Boutiques &amp; Multi-Designer Stores
              </h2>

              <p className="font-body-md text-xs sm:text-body-md text-surface-variant max-w-2xl leading-relaxed">
                Partner with India&apos;s fastest-growing contemporary ethnic house. We supply premium multi-designer multi-brand boutiques, bridal suites, and export retail partners with seasonal previews, low MOQs, and tailored capsule assortments.
              </p>

              {/* 3 Trust Markers */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 pt-1 sm:pt-3 text-surface-variant font-body-sm text-[11px] sm:text-body-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="material-symbols-outlined text-secondary-fixed text-[16px] sm:text-[18px]">
                    verified
                  </span>
                  <span>Low MOQ Starter Orders</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="material-symbols-outlined text-secondary-fixed text-[16px] sm:text-[18px]">
                    public
                  </span>
                  <span>Worldwide Express Logistics</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="material-symbols-outlined text-secondary-fixed text-[16px] sm:text-[18px]">
                    loyalty
                  </span>
                  <span>High-Margin Wholesale Tiers</span>
                </div>
              </div>
            </div>

            {/* Right CTAs */}
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-2.5 sm:gap-4 pt-2 lg:pt-0">
              <Link
                href="/#brand-manifesto"
                data-path="wholesale"
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-secondary-fixed text-on-secondary-fixed font-label-caps text-[10.5px] sm:text-label-caps tracking-widest uppercase hover:bg-secondary-fixed-dim transition-all duration-300 text-center font-bold shadow-md"
              >
                Request B2B Catalog
              </Link>
              <Link
                href="/#brand-manifesto"
                data-path="contact"
                className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-3.5 bg-surface/10 text-on-primary font-label-caps text-[10.5px] sm:text-label-caps tracking-widest uppercase hover:bg-surface/20 transition-all text-center border border-surface/20"
              >
                Speak to Wholesale Rep
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
