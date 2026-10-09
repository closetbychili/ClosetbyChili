"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { STITCH_HERO_SLIDES } from "@/lib/homepage-data";

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const totalSlides = STITCH_HERO_SLIDES.length;

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setCurrent(index);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5500);
    return () => clearInterval(interval);
  }, [nextSlide, isPaused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      nextSlide();
    } else if (distance < -50) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section
      id="hero-carousel"
      aria-label="Campaign Hero Carousel"
      className="relative w-full overflow-hidden bg-page-bg group/carousel pt-24 sm:pt-28"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full h-145 sm:h-155 lg:h-170 flex items-center">
        {STITCH_HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === current;
          return (
            <div
              key={slide.id}
              data-slide-index={idx}
              className={`hero-slide absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 pointer-events-none z-0"
              }`}
            >
              {/* Background Campaign Photograph & Gradients */}
              <div
                className="absolute inset-0 bg-cover bg-center lg:bg-position-[right_35%] bg-no-repeat transition-transform duration-1000 ease-out"
                style={{ backgroundImage: `url('${slide.image}')` }}
              >
                {/* Desktop Directional Gradient (Keeps photograph clear & vibrant on the right) */}
                <div className="absolute inset-0 bg-linear-to-r from-page-bg via-page-bg/90 lg:via-page-bg/75 to-transparent w-full lg:w-[60%]" />
                {/* Mobile Bottom Scrim for Text Readability */}
                <div className="absolute inset-0 bg-linear-to-t from-page-bg via-page-bg/60 to-transparent opacity-90 lg:hidden" />
              </div>

              {/* Text & CTAs Content Container */}
              <div className="relative h-full max-w-360 mx-auto px-6 sm:px-8 lg:px-16 flex items-center">
                <div className="max-w-2xl py-6 sm:py-10 flex flex-col items-start z-10">
                  {/* Category Eyebrow Tag */}
                  <div
                    className={`inline-flex items-center gap-2.5 px-3 py-1 bg-surface/90 backdrop-blur-sm shadow-xs mb-4 sm:mb-5 border-l-2 ${
                      idx === 1 ? "border-secondary" : "border-primary"
                    }`}
                  >
                    <span
                      className={`font-label-caps text-label-caps uppercase tracking-widest font-semibold ${
                        idx === 1 ? "text-secondary" : "text-primary"
                      }`}
                    >
                      {slide.tag}
                    </span>
                    <span className="text-outline-variant text-[10px]">|</span>
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
                      {slide.subtitle}
                    </span>
                  </div>

                  {/* Headline */}
                  <h1 className="font-headline-lg text-headline-lg lg:text-display-hero text-on-surface tracking-tight leading-[1.1] mb-4 sm:mb-5">
                    {slide.heading.includes("\n") ? (
                      <>
                        {slide.heading.split("\n")[0]}
                        <br />
                        <span className="italic font-normal text-tertiary">
                          {slide.heading.split("\n")[1]}
                        </span>
                      </>
                    ) : (
                      slide.heading
                    )}
                  </h1>

                  {/* Body Copy */}
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-lg mb-6 sm:mb-8 leading-relaxed line-clamp-3 sm:line-clamp-none">
                    {slide.description}
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 w-full sm:w-auto mb-6 sm:mb-8">
                    <Link
                      href="#"
                      data-path={slide.primaryCtaPath}
                      className="px-7 sm:px-8 py-3.5 sm:py-4 bg-primary text-on-primary font-label-caps text-label-caps tracking-widest uppercase hover:bg-primary-container transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-3 font-semibold focus:outline-none"
                    >
                      <span>{slide.primaryCtaText}</span>
                      <span className="material-symbols-outlined text-[18px]">
                        arrow_forward
                      </span>
                    </Link>
                    <Link
                      href="#"
                      data-path={slide.secondaryCtaPath}
                      className="px-6 sm:px-8 py-3.5 sm:py-4 bg-surface/90 border border-border-sand text-on-surface font-label-caps text-label-caps tracking-widest uppercase hover:bg-surface transition-all duration-200 shadow-xs flex items-center justify-center gap-2 focus:outline-none"
                    >
                      <span>{slide.secondaryCtaText}</span>
                    </Link>
                  </div>

                  {/* Trust / Craft Value Markers */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-on-surface-variant">
                    {slide.perks.map((perk, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[20px]">
                          {perk.icon}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {perk.text}
                        </span>
                        {pIdx < slide.perks.length - 1 && (
                          <span className="w-1 h-1 rounded-full bg-outline-variant hidden sm:block ml-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Carousel Arrows (Accessible, Elevated, Refined) ── */}
        <button
          type="button"
          aria-label="Previous Slide"
          onClick={prevSlide}
          className="carousel-prev absolute left-3 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-surface/80 hover:bg-surface border border-outline-variant/40 text-on-surface hover:text-primary transition-all flex items-center justify-center shadow-md backdrop-blur-sm focus:outline-none"
        >
          <span className="material-symbols-outlined text-[24px]">chevron_left</span>
        </button>

        <button
          type="button"
          aria-label="Next Slide"
          onClick={nextSlide}
          className="carousel-next absolute right-3 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-surface/80 hover:bg-surface border border-outline-variant/40 text-on-surface hover:text-primary transition-all flex items-center justify-center shadow-md backdrop-blur-sm focus:outline-none"
        >
          <span className="material-symbols-outlined text-[24px]">chevron_right</span>
        </button>

        {/* ── Bottom Counter & Progress Indicators ── */}
        <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 lg:left-16 z-30 flex items-center gap-5 sm:gap-6">
          <span
            id="carousel-counter"
            className="font-label-caps text-label-caps tracking-widest text-on-surface font-semibold slide-counter"
          >
            0{current + 1} / 0{totalSlides}
          </span>
          <div className="flex items-center gap-2">
            {STITCH_HERO_SLIDES.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                aria-label={`Go to slide ${dotIdx + 1}`}
                onClick={() => goToSlide(dotIdx)}
                className={`carousel-dot h-1.5 transition-all duration-300 rounded-none focus:outline-none ${
                  dotIdx === current
                    ? "w-8 bg-primary"
                    : "w-4 bg-outline-variant/60 hover:bg-outline-variant"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
