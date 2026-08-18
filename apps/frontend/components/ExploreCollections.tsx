"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import { COLLECTIONS } from "@/lib/homepage-data";

export default function ExploreCollections() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-20 sm:py-24 lg:py-28 px-5 sm:px-8 lg:px-12 bg-[#fff8f7] overflow-hidden">
      <div className="mx-auto max-w-[1440px]">
        {/* Section Header with Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 sm:pb-12 border-b border-ink/8">
          <div>
            <SectionHeading
              eyebrow="Signature Edits"
              title="Explore Collections"
              align="left"
            />
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              aria-label="Scroll collections left"
              onClick={() => scroll("left")}
              className="w-10 h-10 rounded-full border border-ink/20 flex items-center justify-center text-ink hover:border-chili hover:text-chili transition-colors"
            >
              <ChevronLeft size={18} strokeWidth={1.5} />
            </button>
            <button
              aria-label="Scroll collections right"
              onClick={() => scroll("right")}
              className="w-10 h-10 rounded-full border border-ink/20 flex items-center justify-center text-ink hover:border-chili hover:text-chili transition-colors"
            >
              <ChevronRight size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Horizontally Scrolling 4:3 Cards Carousel */}
        <div
          ref={scrollRef}
          className="mt-8 sm:mt-10 flex gap-4 sm:gap-6 lg:gap-8 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-4 -mx-5 px-5 sm:mx-0 sm:px-0"
        >
          {COLLECTIONS.map((col, index) => (
            <div
              key={col.id}
              className="w-[280px] sm:w-[360px] lg:w-[420px] flex-shrink-0 snap-start"
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
      className="group relative aspect-[4/3] w-full overflow-hidden block focus:outline-none"
    >
      {/* Background Image / Placeholder */}
      {!imgError && collection.image ? (
        <Image
          src={collection.image}
          alt={collection.name}
          fill
          sizes="(max-width: 768px) 80vw, 420px"
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
      <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center text-white z-10">
        <span className="text-[9px] uppercase tracking-[0.3em] text-gold/80 font-medium mb-2">
          Collection
        </span>
        <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-normal text-white group-hover:text-gold-light transition-colors leading-tight">
          {collection.name}
        </h3>
        <span className="mt-4 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70 group-hover:text-white border-b border-white/40 pb-0.5 transition-all duration-300">
          Discover Now
        </span>
      </div>
    </Link>
  );
}
