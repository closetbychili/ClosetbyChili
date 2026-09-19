import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import NewArrivals from "@/components/NewArrivals";
import ShopByCategory from "@/components/ShopByCategory";
import ShopBySet from "@/components/ShopBySet";
import Bestsellers from "@/components/Bestsellers";
import FestiveCollection from "@/components/FestiveCollection";
import AboutSection from "@/components/AboutSection";
import BrandStatement from "@/components/BrandStatement";
import CustomerReviews from "@/components/CustomerReviews";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

import { getCategories, getProducts, ApiClientError } from "@/lib/api";
import { mapCategoryToUi, mapProductToUi } from "@/lib/adapters/catalog-adapter";
import type { CategoryItem, ProductItem } from "@/lib/homepage-data";

export default async function Home() {
  let newArrivalsProducts: ProductItem[] | undefined = undefined;
  let bestsellersProducts: ProductItem[] | undefined = undefined;
  let categoriesList: CategoryItem[] | undefined = undefined;

  try {
    const [newArrivalsRes, bestsellersRes, categoriesRes] = await Promise.all([
      getProducts(
        { collection: "new-arrivals", page_size: 4 },
        { next: { revalidate: 60 } }
      ),
      getProducts(
        { collection: "bestsellers", page_size: 8 },
        { next: { revalidate: 60 } }
      ),
      getCategories(
        { page_size: 20 },
        { next: { revalidate: 60 } }
      ),
    ]);

    newArrivalsProducts = newArrivalsRes.results.map((p) =>
      mapProductToUi(p, "New")
    );

    bestsellersProducts = bestsellersRes.results.map((p) =>
      mapProductToUi(p, "Bestseller")
    );

    // Filter to active root categories (parent is null)
    const rootCategories = categoriesRes.results.filter(
      (c) => c.parent === null && c.is_active
    );
    const selectedCategories =
      rootCategories.length > 0
        ? rootCategories
        : categoriesRes.results.filter((c) => c.is_active);

    categoriesList = selectedCategories.slice(0, 6).map(mapCategoryToUi);
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "NETWORK_ERROR") {
      // Backend not running on localhost:8000 during standalone frontend development
      console.warn(
        "[Closet by Chilli] Backend API is offline on localhost:8000. Homepage is using fallback catalog data."
      );
    } else {
      console.error("Failed to load catalog data for homepage:", error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-ivory text-ink font-body selection:bg-chili selection:text-ivory">
      {/* ── Sticky Header with 3 Balanced Zones & Real Logo ── */}
      <Header />

      <main className="flex-1">
        {/* ── Hero: Full-Width Editorial Hero Carousel (5 Slides) ── */}
        <HeroCarousel />

        {/* ── Section 1: New Arrivals (4 Cards in 1 Row) ────────── */}
        <NewArrivals products={newArrivalsProducts} />

        {/* ── Section 2: Shop by Category (6 Editorial 3:4 Cards) ── */}
        <ShopByCategory categories={categoriesList} />

        {/* ── Section 3: Shop by Set (3 Large 4:5 Editorial Cards) ── */}
        <ShopBySet />

        {/* ── Section 4: Bestsellers (Warm Blush Background + Carousel) ── */}
        <Bestsellers products={bestsellersProducts} />

        {/* ── Section 5: Festive Collection (Full-Width Editorial Banner) ── */}
        <FestiveCollection />

        {/* ── Section 6: About / The Chili Story (50/50 Two-Column) ── */}
        <AboutSection />

        {/* ── Section 7: Brand Statement (Editorial Luxury Campaign Quote) ── */}
        <BrandStatement />

        {/* ── Section 8: Customer Reviews (Loved by You) ─────────── */}
        <CustomerReviews />

        {/* ── Section 10: Newsletter (Join the Chili List) ───────── */}
        <Newsletter />
      </main>

      {/* ── Deep Crimson 5-Column Footer with Real Logo ─────────── */}
      <Footer />
    </div>
  );
}
