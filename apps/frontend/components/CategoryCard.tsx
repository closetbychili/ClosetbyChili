"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CategoryItem } from "@/lib/homepage-data";

export default function CategoryCard({
  category,
  index = 0,
}: {
  category: CategoryItem;
  index?: number;
}) {
  const [imgError, setImgError] = useState(!category.image);

  // Gradient themes for graceful editorial placeholders
  const gradients = [
    "from-[#2a1315] via-[#1a1112] to-[#120a0b]",
    "from-[#201d1c] via-[#181615] to-[#110f0e]",
    "from-[#301618] via-[#211012] to-[#150a0b]",
    "from-[#1c2420] via-[#131a16] to-[#0c120f]",
    "from-[#261e1b] via-[#1d1614] to-[#140e0c]",
    "from-[#231b26] via-[#18121a] to-[#0e0a10]",
  ];

  const currentGradient = gradients[index % gradients.length];

  return (
    <Link
      href={category.href}
      className="group relative aspect-[3/4] w-full overflow-hidden block focus:outline-none"
    >
      {/* ── Background: Image or Editorial Placeholder ──────── */}
      {!imgError && category.image ? (
        <Image
          src={category.image}
          alt={category.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 33vw"
          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${currentGradient} transition-transform duration-700 ease-out group-hover:scale-105`}
        >
          {/* Subtle gold line lattice */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, rgba(212,175,55,0.4) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          {/* Soft amber/chili glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-chili/20 blur-2xl group-hover:bg-gold/20 transition-colors duration-500" />
        </div>
      )}

      {/* ── Editorial Gradient Vignette ─────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 group-hover:from-black/90 transition-all duration-300" />

      {/* ── Card Content ────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 flex flex-col justify-end text-white z-10">
        <span className="text-[9px] uppercase tracking-[0.3em] text-gold/80 font-medium mb-1.5 opacity-90">
          Collection
        </span>

        <h3 className="font-display text-lg sm:text-2xl font-normal text-white group-hover:text-gold-light transition-colors leading-tight">
          {category.name}
        </h3>

        {category.subtitle && (
          <p className="text-[11px] text-white/60 font-light mt-1 line-clamp-1 hidden sm:block">
            {category.subtitle}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80 group-hover:text-white transition-colors">
          <span>Explore</span>
          <span className="transform transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
