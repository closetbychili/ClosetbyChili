import SectionHeading from "./SectionHeading";
import CategoryCard from "./CategoryCard";
import { HOMEPAGE_CATEGORIES } from "@/lib/homepage-data";

export default function ShopByCategory() {
  return (
    <section id="shop-by-category" className="bg-ivory/50 px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        {/* ── Heading ──────────────────────────────────────── */}
        <SectionHeading
          eyebrow="Shop by Category"
          title="Shop by Category"
          align="center"
        />

        {/* ── Category Grid ────────────────────────────────── */}
        <div className="mt-12 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {HOMEPAGE_CATEGORIES.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}
