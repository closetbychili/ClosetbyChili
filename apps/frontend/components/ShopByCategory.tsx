import SectionHeading from "./SectionHeading";
import CategoryCard from "./CategoryCard";
import { CATEGORIES } from "@/lib/homepage-data";

export default function ShopByCategory() {
  return (
    <section
      id="shop-by-category"
      className="py-20 sm:py-24 lg:py-28 px-5 sm:px-8 lg:px-12 bg-[#faeceb]/35 border-y border-ink/5"
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
        <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {CATEGORIES.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
