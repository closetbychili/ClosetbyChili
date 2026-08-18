"use client";

import { useState } from "react";
import Image from "next/image";

export default function AboutSection() {
  const [imgError, setImgError] = useState(true); // placeholder default since image doesn't exist yet

  return (
    <section id="about" className="px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* ── Image / Left ──────────────────────────────── */}
          <div className="relative aspect-[4/5] overflow-hidden">
            {imgError ? (
              // Branded placeholder
              <div className="absolute inset-0 bg-gradient-to-br from-ivory via-cream to-ivory">
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, transparent, transparent 25px, #111 25px, #111 26px)",
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Image
                    src="/assets/brand/logo.png"
                    alt="Closet by Chili"
                    width={180}
                    height={72}
                    className="opacity-15"
                  />
                </div>
              </div>
            ) : (
              <img
                src="/assets/about/about-brand.jpg"
                alt="About Closet by Chili — the story behind the brand"
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            )}
          </div>

          {/* ── Story / Right ─────────────────────────────── */}
          <div className="lg:pl-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-chili">
              About Closet by Chili
            </p>

            <h2 className="mt-4 font-display text-3xl leading-tight sm:text-4xl lg:text-5xl">
              Where style meets
              <br />
              <span className="italic">confidence.</span>
            </h2>

            <div className="mt-6 h-px w-12 bg-gold" />

            <p className="mt-6 text-sm leading-7 text-ink/60 sm:text-base lg:text-base lg:leading-8">
              Closet by Chili is where style meets confidence. We believe that
              fashion is not just about fabric and thread — it&rsquo;s about how
              you feel when you step out. Every piece is crafted for the woman
              who carries tradition with boldness and wears modernity with grace.
            </p>

            <p className="mt-5 text-sm leading-7 text-ink/60 sm:text-base lg:text-base lg:leading-8">
              Our designs draw from the richness of Indian heritage — the drape
              of a chili pepper, the elegance of a hanger, the power of red and
              black. Sophistication, boldness, femininity, and timeless quality
              define everything we create.
            </p>

            {/* Brand concept */}
            <div className="mt-8 border-l-2 border-gold/40 pl-6">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 mb-3">
                The Brand Concept
              </p>
              <ul className="space-y-1.5 text-xs text-ink/50 leading-5">
                <li>
                  <span className="text-ink/70 font-medium">C + Hanger</span> —
                  Closet &amp; Fashion
                </li>
                <li>
                  <span className="text-ink/70 font-medium">Chili Drape</span> —
                  Bold, Unique, Stylish
                </li>
                <li>
                  <span className="text-ink/70 font-medium">Red &amp; Black</span>{" "}
                  — Power, Passion, Elegance
                </li>
              </ul>
            </div>

            {/* Brand statement */}
            <blockquote className="mt-8 font-display text-2xl leading-snug text-ink sm:text-3xl">
              &ldquo;We don&rsquo;t just dress you,
              <br />
              we <span className="text-chili italic">express</span> you.&rdquo;
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}
