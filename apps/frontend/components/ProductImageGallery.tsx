"use client";

import { useState } from "react";
import Image from "next/image";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  const hasImages = images.length > 0;
  const currentImage = hasImages ? images[selectedIndex] : null;
  const isCurrentError = imgErrors[selectedIndex] || !currentImage;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Main Stage Image (3:4 Editorial Ratio) ──────────── */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f4ebe6] rounded-xs border border-[#111111]/6 group">
        {!isCurrentError && currentImage ? (
          <Image
            src={currentImage}
            alt={`${productName} view ${selectedIndex + 1}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
            className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            onError={() =>
              setImgErrors((prev) => ({ ...prev, [selectedIndex]: true }))
            }
          />
        ) : (
          /* Editorial Fallback Texture */
          <div className="absolute inset-0 bg-gradient-to-br from-[#f8f1ec] via-[#f1e6df] to-[#e8dad1] flex flex-col items-center justify-center p-8 text-center">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #8b000a 0, #8b000a 1px, transparent 0, transparent 20px)",
              }}
            />
            <div className="relative w-16 h-16 rounded-full border border-[#8b000a]/20 flex items-center justify-center mb-3">
              <span className="font-display text-[#8b000a]/60 text-base font-bold tracking-widest">
                CBC
              </span>
            </div>
            <p className="relative text-[10px] uppercase tracking-[0.25em] text-ink/40 font-medium max-w-[160px]">
              Closet by Chilli Luxury Edition
            </p>
          </div>
        )}
      </div>

      {/* ── Thumbnail Gallery Strip ───────────────────────── */}
      {images.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {images.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            const isError = imgErrors[idx];

            return (
              <button
                key={img}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                aria-label={`View image ${idx + 1}`}
                className={`relative aspect-[3/4] w-20 sm:w-24 shrink-0 overflow-hidden border-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#8b000a] shadow-xs"
                    : "border-transparent opacity-60 hover:opacity-100 hover:border-ink/20"
                }`}
              >
                {!isError ? (
                  <Image
                    src={img}
                    alt={`${productName} thumbnail ${idx + 1}`}
                    fill
                    sizes="96px"
                    className="object-cover object-top"
                    onError={() =>
                      setImgErrors((prev) => ({ ...prev, [idx]: true }))
                    }
                  />
                ) : (
                  <div className="w-full h-full bg-[#f4ebe6] flex items-center justify-center text-[8px] text-ink/40 uppercase">
                    View {idx + 1}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
