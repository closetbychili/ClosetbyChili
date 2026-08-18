export default function BrandStatement() {
  return (
    <section className="py-24 sm:py-32 lg:py-40 px-6 sm:px-12 bg-[#faeceb]/25 border-y border-ink/5">
      <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
        {/* Subtle decorative motif */}
        <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
          <span className="h-px w-10 sm:w-16 bg-gold/50" />
          <span className="w-2 h-2 rotate-45 border border-gold/70" />
          <span className="h-px w-10 sm:w-16 bg-gold/50" />
        </div>

        {/* Large Centered Editorial Heading */}
        <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-normal text-ink leading-[1.2] tracking-tight">
          We don&rsquo;t just dress you,
          <br />
          we <span className="text-chili italic font-normal">express</span> you.
        </h2>

        {/* Subtext description */}
        <p className="mt-6 sm:mt-8 text-xs sm:text-sm uppercase tracking-[0.3em] text-ink/50 font-medium">
          Closet By Chili · Modern Indian Couture
        </p>
      </div>
    </section>
  );
}
