import Link from "next/link";
import SectionHeading from "./SectionHeading";
import ProductCard from "./ProductCard";
import { NEW_ARRIVALS } from "@/lib/homepage-data";

export default function NewArrivals() {
  return (
    <section id="new-arrivals" className="px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        {/* ── Heading ──────────────────────────────────────── */}
        <SectionHeading
          eyebrow="New Arrivals"
          title="New Arrivals"
          subtitle="Fresh silhouettes. New moods. Your next statement."
          align="center"
        />

        {/* ── Product Grid ─────────────────────────────────── */}
        <div className="mt-12 grid gap-x-5 gap-y-10 grid-cols-2 lg:grid-cols-3">
          {NEW_ARRIVALS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* ── View All CTA ─────────────────────────────────── */}
        <div className="mt-14 text-center">
          <Link
            href="/collections/new-arrivals"
            className="inline-block border border-ink px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink transition-all hover:bg-ink hover:text-cream"
          >
            View All New Arrivals
          </Link>
        </div>
      </div>
    </section>
  );
}
