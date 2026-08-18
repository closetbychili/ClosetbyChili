import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-[700px] lg:min-h-[800px] bg-ink text-white flex items-center overflow-hidden">
      {/* ── Background: elegant branded pattern ────────────── */}
      <div className="absolute inset-0">
        {/* Subtle diagonal fabric texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(212,175,55,0.3) 40px, rgba(212,175,55,0.3) 41px)",
          }}
        />
        {/* Warm gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/95 to-[#2a1012]" />
        {/* Gold accent glow */}
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-gold/5 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-chili/8 blur-[100px]" />
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-[1400px] px-6 py-32 lg:px-10 lg:py-40 w-full">
        <div className="max-w-2xl animate-fade-up">
          {/* Eyebrow */}
          <p className="mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-gold">
            <span className="inline-block h-px w-8 bg-gold/50" />
            Bold · Feminine · Timeless
          </p>

          {/* Headline */}
          <h1 className="font-display text-4xl leading-[1.05] tracking-[-0.01em] sm:text-5xl lg:text-7xl">
            We don&rsquo;t just
            <br />
            dress you, we{" "}
            <span className="text-chili italic">express</span> you.
          </h1>

          {/* Supporting copy */}
          <p className="mt-7 max-w-lg text-sm leading-7 text-white/55 sm:text-base lg:text-lg lg:leading-8">
            Contemporary ethnic wear designed for women who wear confidence
            as beautifully as they wear tradition.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="#new-arrivals"
              className="bg-cream px-7 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white"
            >
              Shop New Arrivals
            </Link>
            <Link
              href="#festive"
              className="border border-white/30 px-7 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-all hover:border-gold hover:text-gold"
            >
              Explore Festive
            </Link>
          </div>
        </div>

        {/* ── Right decorative element ──────────────────────── */}
        <div className="hidden lg:block absolute right-10 top-1/2 -translate-y-1/2">
          {/* Vertical gold line with brand accent */}
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
            <div className="h-2 w-2 rotate-45 border border-gold/40" />
            <div className="h-32 w-px bg-gradient-to-b from-transparent via-gold/20 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
