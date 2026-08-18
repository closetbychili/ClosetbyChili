import Link from "next/link";
import SectionHeading from "./SectionHeading";
import ProductCard from "./ProductCard";
import { BESTSELLERS as BESTSELLERS_DATA } from "@/lib/homepage-data";

export default function Bestsellers() {
  return (
    <section id="bestsellers" className="px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        {/* ── Heading ──────────────────────────────────────── */}
        <SectionHeading
          eyebrow="Loved by Many"
          title="Bestsellers"
          align="center"
        />

        {/* ── Product Grid ─────────────────────────────────── */}
        <div className="mt-12 grid gap-x-5 gap-y-10 grid-cols-2 lg:grid-cols-3">
          {BESTSELLERS_DATA.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* ── View All CTA ─────────────────────────────────── */}
        <div className="mt-14 text-center">
          <Link
            href="/collections/bestsellers"
            className="inline-block border border-ink px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink transition-all hover:bg-ink hover:text-cream"
          >
            View All Bestsellers
          </Link>
        </div>
      </div>
    </section>
  );
}
