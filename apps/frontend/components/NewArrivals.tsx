import Link from "next/link";
import SectionHeading from "./SectionHeading";
import ProductCard from "./ProductCard";
import type { ProductItem } from "@/lib/homepage-data";
import { NEW_ARRIVALS } from "@/lib/homepage-data";

export default function NewArrivals({
  products,
}: {
  products?: ProductItem[];
}) {
  const items = products !== undefined ? products : NEW_ARRIVALS;

  return (
    <section
      id="new-arrivals"
      className="py-16 sm:py-20 lg:py-24 px-5 sm:px-8 lg:px-12 bg-[#fff8f7]"
    >
      <div className="mx-auto max-w-[1440px]">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="Curated For You"
          title="New Arrivals"
          subtitle="Fresh silhouettes. New moods. Your next statement."
          align="center"
        />

        {/* 4 Product Cards Grid: 4 columns on Desktop, 2 on Mobile */}
        {items.length > 0 ? (
          <div className="mt-10 sm:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-12 text-center py-12 border border-ink/10 rounded-sm bg-[#faf3ef]/60">
            <p className="text-sm font-display text-ink/70">
              New arrivals are currently being updated. Check back soon.
            </p>
          </div>
        )}

        {/* View All CTA */}
        <div className="mt-10 sm:mt-12 text-center">
          <Link
            href="#new-arrivals"
            className="inline-block border border-ink px-9 py-3.5 sm:py-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] text-ink hover:bg-ink hover:text-[#fff8f7] transition-all duration-300 transform hover:-translate-y-0.5"
          >
            View All
          </Link>
        </div>
      </div>
    </section>
  );
}
