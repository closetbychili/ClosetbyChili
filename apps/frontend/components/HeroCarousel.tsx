"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HERO_SLIDES } from "@/lib/homepage-data";

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => clearInterval(timer);
  }, [nextSlide, isPaused]);

  return (
    <section
      aria-label="Editorial Hero Carousel"
      className="relative w-full min-h-screen h-screen bg-ink overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Slide Images & Background Overlays ────────────────── */}
      {HERO_SLIDES.map((slide, index) => {
        const isActive = index === current;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* Slide Image */}
            <div className="relative w-full h-full">
              <Image
                src={slide.image}
                alt={slide.heading}
                fill
                priority={index === 0}
                className={`object-cover object-center transform transition-transform duration-[8000ms] ease-out ${
                  isActive ? "scale-105" : "scale-100"
                }`}
                sizes="100vw"
              />

              {/* Top contrast gradient specifically for transparent header navigation readability */}
              <div
                className="absolute inset-x-0 top-0 h-44 z-10 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)",
                }}
              />

              {/* Refined editorial multi-gradient overlay for optimal readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
            </div>

            {/* Slide Content Overlay (Centered with top offset for fixed header) */}
            <div className="absolute inset-0 flex items-center justify-center text-center px-6 sm:px-12 z-20 pt-16 sm:pt-20">
              <div className="max-w-3xl mx-auto flex flex-col items-center">
                {/* Small Top Label / Tag */}
                <div className="flex items-center justify-center gap-3 mb-4 sm:mb-5">
                  <span className="h-[1px] w-6 sm:w-10 bg-gold/70" />
                  <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.35em] uppercase text-gold">
                    {slide.tag}
                  </p>
                  <span className="h-[1px] w-6 sm:w-10 bg-gold/70" />
                </div>

                {/* Subtitle if available */}
                {slide.subtitle && (
                  <p className="text-xs sm:text-sm font-medium tracking-[0.2em] uppercase text-white/80 mb-2 sm:mb-3">
                    {slide.subtitle}
                  </p>
                )}

                {/* Main Heading (Cinzel typography) */}
                <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl xl:text-7xl text-white font-normal leading-[1.12] tracking-tight whitespace-pre-line drop-shadow-sm mb-6 sm:mb-8">
                  {slide.heading}
                </h1>

                {/* CTA Button */}
                <div>
                  <Link
                    href={slide.ctaHref}
                    className="inline-block bg-[#fff8f7] text-ink hover:bg-gold hover:text-ink px-8 sm:px-10 py-3.5 sm:py-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] transition-all duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {slide.ctaText}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Navigation Arrows ─────────────────────────────────── */}
      <button
        aria-label="Previous slide"
        onClick={prevSlide}
        className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full text-white/70 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all duration-200 border border-white/10 hidden sm:flex items-center justify-center"
      >
        <ChevronLeft size={22} strokeWidth={1.5} />
      </button>
      <button
        aria-label="Next slide"
        onClick={nextSlide}
        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full text-white/70 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all duration-200 border border-white/10 hidden sm:flex items-center justify-center"
      >
        <ChevronRight size={22} strokeWidth={1.5} />
      </button>

      {/* ── Bottom Carousel Indicators & Slide Counter ─────────── */}
      <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 z-30 flex flex-col sm:flex-row items-center justify-center sm:justify-between px-6 sm:px-12 max-w-[1440px] mx-auto gap-4">
        {/* Slide counter */}
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-medium hidden sm:block">
          <span className="text-white font-bold">0{current + 1}</span> / 0
          {HERO_SLIDES.length}
        </div>

        {/* Indicator Bars / Dots */}
        <div className="flex items-center gap-2.5">
          {HERO_SLIDES.map((slide, index) => {
            const active = index === current;
            return (
              <button
                key={slide.id}
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => setCurrent(index)}
                className={`transition-all duration-300 rounded-full h-1 sm:h-1.5 ${
                  active ? "w-8 sm:w-10 bg-gold" : "w-2 sm:w-2.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            );
          })}
        </div>

        {/* Brand statement micro-text */}
        <div className="text-[10px] uppercase tracking-[0.25em] text-gold/80 font-medium hidden sm:block">
          Handcrafted In India
        </div>
      </div>
    </section>
  );
}
