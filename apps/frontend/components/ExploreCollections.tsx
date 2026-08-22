"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { COLLECTIONS } from "@/lib/homepage-data";

export default function ExploreCollections() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 px-5 sm:px-8 lg:px-12 bg-[#fff8f7] overflow-hidden">
      <div className="mx-auto max-w-[1440px]">
        {/* ── Section Header: Title on Left, Action on Right (Same Line) ── */}
        <div className="flex items-end justify-between gap-4 pb-6 sm:pb-8 border-b border-ink/8">
          <div>
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.35em] text-chili mb-1.5 sm:mb-2">
              Signature Edits
            </p>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-ink font-normal leading-tight">
              Festive Collections
            </h2>
          </div>

          {/* Action Link on Right */}
          <Link
            href="#festive"
            className="inline-flex items-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] text-ink hover:text-chili transition-colors pb-1 border-b-2 border-ink hover:border-chili whitespace-nowrap shrink-0"
          >
            Explore All
          </Link>
        </div>

        {/* ── Swipeable Carousel: 2 Cards on Mobile, 4 Cards on Desktop ───────── */}
        <div className="mt-8 sm:mt-10 flex gap-3 sm:gap-6 lg:gap-8 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory">
          {COLLECTIONS.map((col, index) => (
            <div
              key={col.id}
              className="w-[calc(50%-6px)] sm:w-[calc(50%-12px)] lg:w-[calc(25%-24px)] flex-shrink-0 snap-start"
            >
              <CollectionCard collection={col} index={index} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CollectionCard({
  collection,
  index,
}: {
  collection: (typeof COLLECTIONS)[0];
  index: number;
}) {
  const [imgError, setImgError] = useState(!collection.image);

  const gradients = [
    "from-[#241315] via-[#1b0f10] to-[#11090a]",
    "from-[#1b221f] via-[#131a17] to-[#0c110f]",
    "from-[#261c16] via-[#1b130e] to-[#120c08]",
    "from-[#221825] via-[#18111a] to-[#100a12]",
    "from-[#1f2022] via-[#151617] to-[#0c0d0d]",
  ];

  return (
    <Link
      href={collection.href}
      className="group relative aspect-[3/4] w-full overflow-hidden block focus:outline-none"
    >
      {/* Background Image / Placeholder */}
      {!imgError && collection.image ? (
        <Image
          src={collection.image}
          alt={collection.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            gradients[index % gradients.length]
          } transition-transform duration-700 ease-out group-hover:scale-105 flex items-center justify-center`}
        >
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #d4af37 0, #d4af37 1px, transparent 0, transparent 24px)",
            }}
          />
        </div>
      )}

      {/* Subtle Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20 group-hover:from-black/85 transition-all duration-300" />

      {/* Centered Collection Name */}
      <div className="absolute inset-0 p-4 sm:p-6 flex flex-col items-center justify-center text-center text-white z-10">
        <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.3em] text-gold/80 font-medium mb-1.5 sm:mb-2">
          Collection
        </span>
        <h3 className="font-display text-base sm:text-xl lg:text-2xl font-normal text-white group-hover:text-gold-light transition-colors leading-tight">
          {collection.name}
        </h3>
        <span className="mt-3 sm:mt-4 text-[8px] sm:text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70 group-hover:text-white border-b border-white/40 pb-0.5 transition-all duration-300">
          Discover Now
        </span>
      </div>
    </Link>
  );
}
