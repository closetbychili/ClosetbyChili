"use client";

import { useState } from "react";
import Image from "next/image";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  badge?: string;
  fabricBadge?: string;
}

export default function ProductImageGallery({
  images,
  productName,
  badge = "Bestseller",
  fabricBadge = "100% Mulberry Silk",
}: ProductImageGalleryProps) {
  // Ensure we have a valid list of images, with fallback high-fashion editorial shots
  const defaultFallbacks = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA4tdHy3sJHx4elKbwUeFYyTmJOKKegsvjL8gD1xWkcAhwHgMBZDWe4WmPuBaHcGfR1kWs50yyAEu2QuqPPafS7umWcCm5ePh4dTcWl18kCXbL2pVBZM6hLp0m9EOrceZYyiYH_WVcZXIgO3qLDEmLA1ef8K1hplBQ4D-r3swJdHdSnL6yFWidIjBOVJxq1hV83BaGlPLgBOdVLHNOnTjD3aalyYmt9vesWS1jMydbAnlfPm6Lzoe5Qog",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDpVhJtLYBwQTULmDlTbAeFfz2j3q1OrA9aZhbREU0pURTtxM633xgX-Hjai5inE1_0HgHBfDlExlaIe9-7Y_YDXeS6rQz1bXINRdHSDd_o4fLQXjC9XJj1QvBB6hD8-_1Cps3NypNuuLTrSA4DXfbAiWFv4QcnSqHzIXl2x0spixUbhi6ZsKs1PKcCOf2jbQkaaVl_7xNThse1rkf-2Ufg5Z0wrRqi93S4UazUSQGrjRiZArFpIkoNFw",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDcvFY2Ts1dwuE6sl_e2xIHKBRzT-Zt6CL4SMyIMb4RxQ7Likd7-B_lXP9uhM36lOJdTNUXFpNsXDX6ZGCB2uItsgsjty_UzwYZNdlXtToutzlExRMKANU1wsUCMm4WqzdkB0G7xj_hNlRNFpqsTlpEeltfmi-WepxrzifnAmX81vXuHS52bqyHSX1z4W_n_y_fp12qNgUJwOI7Tp-IsJrJ6yjw32hQrzueISi8QOH5tijrnGifiCjKXQ",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAUPs1eQ-SEF5eg6LB0I9IPHhNo7fk9pHlq7xuA5tflWfaKpAvvKBbQ9gBoWlXWgQnVIeHk4Csw8uloTuXwqvHXl1vNnuzdn7h71wUgJSiG-Nvx4Uj6ipJw83CgUTc6SDyHLF_THavvpWntE2ZGwPV3h9snnxYYK70nqO5zeo58oKzPgpHDhlT08TOSwLXbwoQ9dS4I4PLBtLLj39L4foF2Gtz9eGuJitP_RwqEEUjVg_90PVtSEhH2Fg",
  ];

  const galleryList = images.length > 0 ? images : defaultFallbacks;

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  const currentImage = galleryList[selectedIndex] || galleryList[0];
  const isCurrentError = imgErrors[selectedIndex];

  // Secondary detail tile images
  const detailTile1 = galleryList[1] || defaultFallbacks[1];
  const detailTile2 = galleryList[2] || defaultFallbacks[2];

  return (
    <>
      <div className="flex flex-col-reverse md:flex-row gap-4 lg:gap-6 w-full">
        {/* ── Left Column: Vertical Thumbnails Strip ──────────── */}
        <div className="flex md:flex-col gap-3 shrink-0 overflow-x-auto md:overflow-y-visible py-1 md:py-0 w-full md:w-24 no-scrollbar">
          {galleryList.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            const isError = imgErrors[idx];

            return (
              <button
                key={`${img}-${idx}`}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                aria-label={`View image ${idx + 1}`}
                className={`group relative aspect-[3/4] w-20 md:w-full overflow-hidden bg-surface-container shadow-sm focus:outline-none transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background opacity-100"
                    : "opacity-80 hover:opacity-100"
                }`}
              >
                {!isError ? (
                  <Image
                    src={img}
                    alt={`${productName} thumbnail ${idx + 1}`}
                    fill
                    sizes="96px"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={() =>
                      setImgErrors((prev) => ({ ...prev, [idx]: true }))
                    }
                  />
                ) : (
                  <div className="w-full h-full bg-[#f4ebe6] flex items-center justify-center text-[9px] font-semibold text-primary uppercase">
                    Shot {idx + 1}
                  </div>
                )}
                {isSelected && (
                  <span className="absolute inset-0 bg-primary/10 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Center / Main Column: Primary Viewport & Multi-Image Gallery ── */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Main Hero Image Showcase */}
          <div className="relative w-full aspect-[3/4] bg-surface-container overflow-hidden group shadow-md rounded-none">
            {!isCurrentError && currentImage ? (
              <Image
                id="main-product-img"
                src={currentImage}
                alt={`${productName} view ${selectedIndex + 1}`}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 50vw"
                className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105 cursor-zoom-in"
                onClick={() => setIsZoomOpen(true)}
                onError={() =>
                  setImgErrors((prev) => ({ ...prev, [selectedIndex]: true }))
                }
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#f8f1ec] via-[#f1e6df] to-[#e8dad1] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full border border-primary/20 flex items-center justify-center mb-3">
                  <span className="font-headline-sm text-primary font-bold tracking-widest">
                    CBC
                  </span>
                </div>
                <p className="font-label-caps uppercase text-on-surface-variant font-medium tracking-widest">
                  Closet by Chili Atelier
                </p>
              </div>
            )}

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
              <span className="bg-primary text-on-primary font-label-caps text-label-caps px-3 py-1 uppercase tracking-widest shadow-sm">
                {badge}
              </span>
              <span className="bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps px-3 py-1 uppercase tracking-wider shadow-sm font-bold">
                {fabricBadge}
              </span>
            </div>

            {/* Floating Actions (Wishlist & Zoom) */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button
                type="button"
                onClick={() => setIsWishlisted(!isWishlisted)}
                aria-label="Add to wishlist"
                className="w-11 h-11 bg-surface/90 backdrop-blur-md text-on-surface hover:text-primary flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <span
                  className="material-symbols-outlined text-[22px] transition-colors"
                  style={{
                    fontVariationSettings: isWishlisted ? "'FILL' 1" : "'FILL' 0",
                    color: isWishlisted ? "#8b000a" : "inherit",
                  }}
                >
                  favorite
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                aria-label="Expand image gallery"
                className="w-11 h-11 bg-surface/90 backdrop-blur-md text-on-surface hover:text-primary flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">
                  zoom_in
                </span>
              </button>
            </div>

            {/* Bottom Editorial Banner Overlay */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-inverse-surface/85 via-inverse-surface/30 to-transparent p-6 text-inverse-on-surface flex items-end justify-between pointer-events-none">
              <div>
                <p className="font-title-editorial text-title-editorial italic text-secondary-fixed drop-shadow-xs">
                  &ldquo;We don&apos;t just dress you, we express you.&rdquo;
                </p>
                <p className="font-body-sm text-body-sm text-surface-container-highest tracking-wide mt-0.5 drop-shadow-xs">
                  Signature Chili Drape • Hand-Tailored in Jaipur
                </p>
              </div>
              <span className="font-label-caps text-label-caps uppercase text-secondary-fixed-dim tracking-widest hidden sm:inline-block drop-shadow-xs">
                Editorial Drop 04
              </span>
            </div>
          </div>

          {/* Secondary Dual Tile Grid (Biba Editorial Style) */}
          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() => {
                const targetIdx = galleryList.indexOf(detailTile1);
                if (targetIdx !== -1) setSelectedIndex(targetIdx);
                else setIsZoomOpen(true);
              }}
              className="relative aspect-[4/5] bg-surface-container overflow-hidden shadow-sm group cursor-pointer"
            >
              <Image
                src={detailTile1}
                alt={`${productName} Couture Darting detail`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute bottom-3 left-3 bg-inverse-surface/75 backdrop-blur-sm text-inverse-on-surface px-2.5 py-1 text-label-caps font-label-caps tracking-wider">
                Couture Darting
              </div>
            </div>

            <div
              onClick={() => {
                const targetIdx = galleryList.indexOf(detailTile2);
                if (targetIdx !== -1) setSelectedIndex(targetIdx);
                else setIsZoomOpen(true);
              }}
              className="relative aspect-[4/5] bg-surface-container overflow-hidden shadow-sm group cursor-pointer"
            >
              <Image
                src={detailTile2}
                alt={`${productName} Hand-Sculpted Gold Trim detail`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute bottom-3 left-3 bg-inverse-surface/75 backdrop-blur-sm text-inverse-on-surface px-2.5 py-1 text-label-caps font-label-caps tracking-wider">
                Hand-Sculpted Gold Trim
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── High-Resolution Lightbox Zoom Modal ───────────── */}
      {isZoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="High-resolution image zoom"
          className="fixed inset-0 z-50 bg-inverse-surface/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              aria-label="Close zoom modal"
              className="absolute top-2 right-2 sm:-top-10 sm:-right-4 w-10 h-10 rounded-full bg-surface text-on-surface hover:bg-primary hover:text-on-primary flex items-center justify-center shadow-lg transition-colors cursor-pointer z-50"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
            <div className="relative w-full h-[80vh] overflow-hidden">
              <Image
                src={currentImage}
                alt={`${productName} magnified view`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            <p className="mt-3 text-secondary-fixed text-xs font-label-caps uppercase tracking-widest text-center">
              {productName} • High-Resolution Atelier Inspection
            </p>
          </div>
        </div>
      )}
    </>
  );
}
