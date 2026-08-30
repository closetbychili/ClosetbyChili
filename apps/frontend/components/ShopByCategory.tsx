import SectionHeading from "./SectionHeading";
import CategoryCard from "./CategoryCard";
import type { CategoryItem } from "@/lib/homepage-data";
import { CATEGORIES } from "@/lib/homepage-data";

export default function ShopByCategory({
  categories,
}: {
  categories?: CategoryItem[];
}) {
  const items = categories !== undefined ? categories : CATEGORIES;

  return (
    <section
      id="shop-by-category"
      className="py-16 sm:py-20 lg:py-24 px-5 sm:px-8 lg:px-12 bg-[#faeceb]/35 border-y border-ink/5"
    >
      <div className="mx-auto max-w-[1440px]">
        {/* Heading */}
        <SectionHeading
          eyebrow="Shop By Category"
          title="Find your signature silhouette."
          subtitle="From flowing anarkalis to effortless everyday kurtis, explore designs tailored for timeless elegance."
          align="center"
        />

        {/* 6 Category Cards: 3 columns x 2 rows on desktop, 2 columns on mobile */}
        {items.length > 0 ? (
          <div className="mt-10 sm:mt-12 grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {items.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="mt-12 text-center py-12 border border-ink/10 rounded-sm bg-[#faf3ef]/60">
            <p className="text-sm font-display text-ink/70">
              Categories are currently being updated.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
