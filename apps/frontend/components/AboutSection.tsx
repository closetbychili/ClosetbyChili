import Link from "next/link";
import Image from "next/image";

export default function AboutSection() {
  return (
    <section id="about" className="py-20 sm:py-24 lg:py-32 px-5 sm:px-8 lg:px-12 bg-[#fff8f7]">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 xl:gap-24 items-center">
          {/* ── Left Column: Editorial Image ───────────────────── */}
          <div className="relative aspect-square sm:aspect-[4/5] lg:aspect-[4/5] w-full overflow-hidden bg-[#f1e7e2] shadow-xl">
            <Image
              src="/assets/hero/hero-3.jpg"
              alt="Craftsmanship and Heritage — The Chili Story"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center"
            />
            {/* Subtle luxury gold border frame */}
            <div className="absolute inset-4 border border-gold/40 pointer-events-none" />
            <div className="absolute bottom-8 left-8 right-8 p-4 bg-ink/75 backdrop-blur-sm text-white text-center hidden sm:block">
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold font-semibold">
                Handcrafted With Care
              </p>
              <p className="text-xs text-white/80 font-light mt-0.5">
                Authentic Indian Textiles · Master Artisans
              </p>
            </div>
          </div>

          {/* ── Right Column: The Chili Story Copy & CTA ────────── */}
          <div className="flex flex-col items-start justify-center lg:pl-4">
            {/* Small label */}
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-8 bg-chili" />
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.35em] text-chili">
                Our Heritage & Vision
              </p>
            </div>

            {/* Heading */}
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-ink font-normal leading-tight mb-6">
              The Chili Story
            </h2>

            {/* Paragraph Text */}
            <p className="text-sm sm:text-base lg:text-lg text-ink/75 leading-relaxed font-light mb-6">
              Born from a love of rich textiles and modern silhouettes, Closet by Chili brings premium Indian fashion to the contemporary woman. We believe in craftsmanship, quality, and designs that empower you to express your true self.
            </p>

            <p className="text-xs sm:text-sm text-ink/60 leading-relaxed font-light mb-8">
              Every garment is an intentional blend of timeless Indian heritage, luxurious natural fabrics, and thoughtful contemporary tailoring crafted for comfort, confidence, and effortless grandeur.
            </p>

            {/* CTA */}
            <div>
              <Link
                href="#about"
                className="inline-block bg-ink text-[#fff8f7] hover:bg-chili hover:text-white px-9 py-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] transition-all duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Read Our Story
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
