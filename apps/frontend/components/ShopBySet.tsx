"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SectionHeading from "./SectionHeading";
import { SETS } from "@/lib/homepage-data";

export default function ShopBySet() {
  return (
    <section id="shop-by-set" className="py-20 sm:py-24 lg:py-28 px-5 sm:px-8 lg:px-12 bg-[#fff8f7]">
      <div className="mx-auto max-w-[1440px]">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="Curated Ensembles"
          title="Complete looks, thoughtfully put together."
          subtitle="Harmonious pairings crafted to save time and elevate your everyday presence."
          align="center"
        />

        {/* 3 Large Editorial Set Cards (4:5 Aspect Ratio) */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {SETS.map((item, index) => (
            <SetCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SetCard({ item, index }: { item: (typeof SETS)[0]; index: number }) {
  const [imgError, setImgError] = useState(!item.image);

  const gradients = [
    "from-[#241a1c] via-[#1a1415] to-[#120d0e]",
    "from-[#1b221d] via-[#141a15] to-[#0e120f]",
    "from-[#281c15] via-[#1d140e] to-[#130d09]",
  ];

  return (
    <Link
      href={item.href}
      className="group flex flex-col items-center text-center focus:outline-none"
    >
      {/* 4:5 Image Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#f3ece7]">
        {!imgError && item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              gradients[index % gradients.length]
            } flex flex-col items-center justify-center p-8 transition-transform duration-700 group-hover:scale-105`}
          >
            {/* Geometric border pattern */}
            <div className="absolute inset-4 border border-gold/20 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full border border-gold/30 flex items-center justify-center">
                <span className="text-gold/80 font-display text-lg">
                  0{index + 1}
                </span>
              </div>
            </div>
            <p className="relative text-[10px] uppercase tracking-[0.3em] text-gold/70 font-medium">
              Editorial Set
            </p>
          </div>
        )}

        {/* Subtle shadow overlay on hover */}
        <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors duration-300" />
      </div>

      {/* Title Centered Below Image */}
      <div className="mt-5 sm:mt-6 flex flex-col items-center">
        <h3 className="font-display text-xl sm:text-2xl text-ink group-hover:text-chili transition-colors">
          {item.name}
        </h3>
        {item.subtitle && (
          <p className="mt-1 text-xs text-ink/50 uppercase tracking-[0.15em] font-medium">
            {item.subtitle}
          </p>
        )}
        <span className="mt-2 text-[10px] uppercase tracking-[0.25em] font-semibold text-chili group-hover:underline">
          Shop Collection →
        </span>
      </div>
    </Link>
  );
}
