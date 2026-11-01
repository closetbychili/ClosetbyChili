import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import ShopByCategory from "@/components/ShopByCategory";
import NewArrivals from "@/components/NewArrivals";
import EditorialFeature from "@/components/EditorialFeature";
import Bestsellers from "@/components/Bestsellers";
import WholesaleB2B from "@/components/WholesaleB2B";
import SocialSalon from "@/components/SocialSalon";
import Footer from "@/components/Footer";

import { getProducts, getCategories } from "@/lib/api/catalog";
import { mapProductToUi, mapCategoryToUi } from "@/lib/adapters/catalog-adapter";
import type { CategoryItem, ProductItem } from "@/lib/homepage-data";

export const revalidate = 60; // ISR revalidation every 60 seconds

export default async function Home() {
  let newArrivals: ProductItem[] | undefined;
  let bestsellers: ProductItem[] | undefined;
  let categories: CategoryItem[] | undefined;

  try {
    // 1. Fetch initial collections and categories concurrently
    const [naRes, bsRes, catRes] = await Promise.allSettled([
      getProducts({ collection: "new-arrivals", page_size: 4 }, { next: { revalidate: 60 } }),
      getProducts({ collection: "bestsellers", page_size: 4 }, { next: { revalidate: 60 } }),
      getCategories({ page_size: 100, storefront: true }, { next: { revalidate: 60 } }),
    ]);

    // Handle Categories
    if (catRes.status === "fulfilled" && catRes.value?.results?.length > 0) {
      categories = catRes.value.results.map((c) => mapCategoryToUi(c));
    }

    // Process primary results
    if (naRes.status === "fulfilled" && naRes.value?.results?.length > 0) {
      newArrivals = naRes.value.results
        .filter((p) => p.status === "active" && p.is_active)
        .map((p) => mapProductToUi(p, "New"));
    }

    if (bsRes.status === "fulfilled" && bsRes.value?.results?.length > 0) {
      bestsellers = bsRes.value.results
        .filter((p) => p.status === "active" && p.is_active)
        .map((p) => mapProductToUi(p, "Bestseller"));
    }

    // 2. Identify fallback requirements to avoid redundant or sequential waterfalls
    const naNeedsFallback = !newArrivals || newArrivals.length === 0;
    const bsNeedsFallback = !bestsellers || bestsellers.length === 0;

    if (naNeedsFallback && bsNeedsFallback) {
      // Both sections require fallbacks: fetch a single 8-item batch concurrently to avoid duplicate queries
      const fallbackRes = await getProducts(
        { page_size: 8, ordering: "-created_at" },
        { next: { revalidate: 60 } }
      ).catch(() => null);

      if (fallbackRes?.results?.length) {
        const active = fallbackRes.results.filter(
          (p) => p.status === "active" && p.is_active
        );
        newArrivals = active.slice(0, 4).map((p) => mapProductToUi(p, "New"));
        // Use subsequent items for bestsellers if available, otherwise reuse active
        const bsSlice = active.length > 4 ? active.slice(4, 8) : active.slice(0, 4);
        bestsellers = bsSlice.map((p) => mapProductToUi(p, "Bestseller"));
      }
    } else if (naNeedsFallback) {
      const fallbackNa = await getProducts(
        { page_size: 4, ordering: "-created_at" },
        { next: { revalidate: 60 } }
      ).catch(() => null);
      if (fallbackNa?.results?.length) {
        newArrivals = fallbackNa.results
          .filter((p) => p.status === "active" && p.is_active)
          .map((p) => mapProductToUi(p, "New"));
      }
    } else if (bsNeedsFallback) {
      const fallbackBs = await getProducts(
        { page_size: 4, ordering: "-created_at" },
        { next: { revalidate: 60 } }
      ).catch(() => null);
      if (fallbackBs?.results?.length) {
        bestsellers = fallbackBs.results
          .filter((p) => p.status === "active" && p.is_active)
          .map((p) => mapProductToUi(p, "Bestseller"));
      }
    }
  } catch (err) {
    console.error("Failed to load products/categories from DB for homepage:", err);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary">
      {/* ── Sticky Refined Header with Announcement Bar & Search ── */}
      <Header />

      <main className="flex-1 w-full bg-background">
        <div className="flex flex-col w-full">
          {/* ── Section 1: Hero Campaign Carousel (4 Slides) ── */}
          <HeroCarousel />

          {/* ── Section 2: Shop by Category (5 Arched Cards from DB) ── */}
          <ShopByCategory categories={categories} />

          {/* ── Section 3: New Arrivals Grid (4 Columns from DB) ── */}
          <NewArrivals products={newArrivals} />

          {/* ── Section 4: Asymmetric Editorial Feature (Brand Manifesto) ── */}
          <EditorialFeature />

          {/* ── Section 5: Most Loved / Best-Sellers (3-Col Spotlight from DB) ── */}
          <Bestsellers products={bestsellers} />

          {/* ── Section 6: Wholesale & B2B Pathway (Boutique Concierge) ── */}
          <WholesaleB2B />

          {/* ── Section 8: Instagram & Social Editorial Gallery (The Social Salon) ── */}
          <SocialSalon />
        </div>
      </main>

      {/* ── Footer with Links, Newsletter, and Payment Badges ── */}
      <Footer />
    </div>
  );
}
