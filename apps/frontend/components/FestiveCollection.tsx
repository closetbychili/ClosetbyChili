import Link from "next/link";
import Image from "next/image";

export default function FestiveCollection() {
  return (
    <section id="festive" className="relative w-full h-[600px] sm:h-[700px] lg:h-[800px] bg-ink overflow-hidden flex items-center justify-center">
      {/* ── Background: Luxury Festive Photography / Texture ── */}
      <div className="absolute inset-0">
        <Image
          src="/assets/hero/hero-5.jpg"
          alt="Celebrate in Your Own Style — Festive Collection"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />

        {/* Rich multi-layer vignette and atmospheric shading */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/70" />

        {/* Ambient warm gold accent glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold/10 blur-[140px] pointer-events-none" />
      </div>

      {/* ── Editorial Campaign Content ──────────────────────── */}
      <div className="relative z-10 mx-auto max-w-[1440px] px-6 sm:px-12 text-center flex flex-col items-center">
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="h-px w-8 bg-gold/60" />
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.4em] text-gold">
            The Festive Edit 2024
          </p>
          <span className="h-px w-8 bg-gold/60" />
        </div>

        {/* Main Heading */}
        <h2 className="font-display text-3xl sm:text-5xl lg:text-7xl font-normal text-white leading-[1.1] tracking-tight max-w-4xl drop-shadow-md">
          Celebrate in Your Own Style.
        </h2>

        {/* Subtitle description */}
        <p className="mt-6 text-sm sm:text-base lg:text-lg text-white/80 max-w-xl leading-relaxed font-light">
          Opulent brocades, hand-woven zari borders, and silhouettes designed to make every special occasion unforgettable.
        </p>

        {/* CTA */}
        <div className="mt-8 sm:mt-10">
          <Link
            href="#festive"
            className="inline-block bg-[#fff8f7] text-ink hover:bg-gold hover:text-ink px-10 py-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5"
          >
            Explore Festive
          </Link>
        </div>
      </div>
    </section>
  );
}
