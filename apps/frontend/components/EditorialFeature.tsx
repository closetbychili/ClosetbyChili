"use client";

import Link from "next/link";

export default function EditorialFeature() {
  return (
    <section
      id="brand-manifesto"
      className="w-full py-20 sm:py-24 px-4 sm:px-6 lg:px-12 bg-page-bg border-t border-border-sand/40"
    >
      <div className="max-w-360 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Visual Story Column (Left 7 Cols) */}
          <div className="lg:col-span-7 relative">
            <div className="relative aspect-4/5 sm:aspect-16/11 lg:aspect-4/5 overflow-hidden shadow-xl bg-surface-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCv5-fs4Wx92qNl0wcE4Dds9n2uIFzBRCKylR4FYaw3iahNyUx0SEg3Q-IeYHWCly4AHd36j1kBYKjBsbqCOTFVSxQTjgFdjgy6L-LM69lYZ1DxGCzQwrRQCGiVbdnihH4QaaLyVqoEcn0d8X6ZJ43ll2gCQ2jxNokktX4pDoqncYfTao8ChS_EbtobMGWyUQpdSLvBsyBn6ArA6fi4MfkOfaFd80frHuz_QzhWHaFsEEBpUZ4Nek36lg"
                alt="Striking luxury fashion editorial featuring a confident woman in a structured crimson red tailored pantsuit"
                data-alt="Striking luxury fashion editorial featuring a confident woman in a structured crimson red tailored pantsuit with a bold scarlet wide-brim hat, hands resting elegantly with gold rings, high fashion editorial mood board aesthetic"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-inverse-surface/40 via-transparent to-transparent" />

              {/* Accent Monogram Stamp */}
              <div className="absolute top-6 left-6 p-4 bg-surface/90 backdrop-blur-md hidden sm:flex flex-col gap-0.5 shadow-sm border-l-2 border-primary">
                <span className="font-headline-md text-headline-sm text-primary tracking-widest font-bold">
                  CHILLI
                </span>
                <span className="font-label-caps text-[9px] uppercase tracking-widest text-on-surface">
                  Signature Edition
                </span>
              </div>
            </div>

            {/* Overlapping Mini-Detail Card (Artisanal Craftsmanship) */}
            <div className="absolute -bottom-6 -right-3 sm:-right-6 bg-surface p-5 sm:p-6 shadow-xl max-w-xs hidden md:flex flex-col gap-2 z-10 border border-outline-variant/30">
              <div className="flex items-center gap-2 text-secondary">
                <span className="material-symbols-outlined text-[20px]">
                  workspace_premium
                </span>
                <span className="font-label-caps text-[11px] uppercase tracking-wider font-semibold">
                  Artisanal Details
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Custom molded gold buttons inspired by royal jharokha geometry, stitched by master karigars in Jaipur.
              </p>
            </div>
          </div>

          {/* Editorial Text Narrative Column (Right 5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-center lg:pl-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-px w-8 bg-primary" />
              <span className="font-label-caps text-label-caps uppercase text-primary tracking-widest font-semibold">
                Brand Manifesto
              </span>
            </div>

            <h2 className="font-headline-lg text-headline-lg lg:text-[42px] text-on-surface leading-tight mb-5">
              “We don&apos;t just dress you, <br />
              <span className="italic text-tertiary">we express you.”</span>
            </h2>

            <p className="font-title-editorial text-title-editorial text-on-surface-variant mb-5 leading-relaxed font-medium">
              Closet by Chilli is where style meets confidence. The collection reflects sophistication with a dash of boldness—just like every woman who wears it.
            </p>

            <p className="font-body-md text-body-md text-on-surface-variant mb-7 leading-relaxed">
              From power silhouettes to fluid evening drapes, we craft pieces for the woman who owns every room she enters. Rooted in red and gold—the hues of passion and royal heritage—each piece balances modern tailored poise with timeless Indian grandeur.
            </p>

            {/* Craft Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 pb-7">
              <div className="flex items-start gap-3 p-3 bg-surface shadow-xs border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-[22px] shrink-0">
                  check_circle
                </span>
                <div className="flex flex-col">
                  <span className="font-label-caps text-[11px] uppercase tracking-wider text-on-surface font-semibold">
                    100% Silk &amp; Satin
                  </span>
                  <span className="font-body-sm text-[12px] text-outline">
                    Lustrous breathable inner linings
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-surface shadow-xs border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-[22px] shrink-0">
                  check_circle
                </span>
                <div className="flex flex-col">
                  <span className="font-label-caps text-[11px] uppercase tracking-wider text-on-surface font-semibold">
                    Bespoke Fit Cut
                  </span>
                  <span className="font-body-sm text-[12px] text-outline">
                    Engineered for Indian body shapes
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-surface shadow-xs border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-[22px] shrink-0">
                  check_circle
                </span>
                <div className="flex flex-col">
                  <span className="font-label-caps text-[11px] uppercase tracking-wider text-on-surface font-semibold">
                    Custom Gold Hardware
                  </span>
                  <span className="font-body-sm text-[12px] text-outline">
                    Hand-polished metallic trims
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-surface shadow-xs border border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-[22px] shrink-0">
                  check_circle
                </span>
                <div className="flex flex-col">
                  <span className="font-label-caps text-[11px] uppercase tracking-wider text-on-surface font-semibold">
                    Packaging Experience
                  </span>
                  <span className="font-body-sm text-[12px] text-outline">
                    Luxe satin bags &amp; wax seal box
                  </span>
                </div>
              </div>
            </div>

            {/* Curated Edit CTA */}
            <div>
              <Link
                href="#"
                data-path="collections"
                className="inline-flex items-center gap-3 px-8 py-4 bg-inverse-surface text-secondary-fixed font-label-caps text-label-caps uppercase tracking-widest hover:bg-primary-container hover:text-on-primary transition-all duration-300 shadow-sm hover:shadow-md font-semibold"
              >
                <span>Shop The Curated Edit</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_right_alt
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
