import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import NewArrivals from "@/components/NewArrivals";
import ShopByCategory from "@/components/ShopByCategory";
import ShopBySet from "@/components/ShopBySet";
import Bestsellers from "@/components/Bestsellers";
import FestiveCollection from "@/components/FestiveCollection";
import AboutSection from "@/components/AboutSection";
import BrandStatement from "@/components/BrandStatement";
import ExploreCollections from "@/components/ExploreCollections";
import CustomerReviews from "@/components/CustomerReviews";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fff8f7] text-[#111111] font-body selection:bg-[#8b000a] selection:text-[#fff8f7]">
      {/* ── Sticky Header with 3 Balanced Zones & Real Logo ── */}
      <Header />

      <main className="flex-1">
        {/* ── Hero: Full-Width Editorial Hero Carousel (5 Slides) ── */}
        <HeroCarousel />

        {/* ── Section 1: New Arrivals (4 Cards in 1 Row) ────────── */}
        <NewArrivals />

        {/* ── Section 2: Shop by Category (6 Editorial 3:4 Cards) ── */}
        <ShopByCategory />

        {/* ── Section 3: Shop by Set (3 Large 4:5 Editorial Cards) ── */}
        <ShopBySet />

        {/* ── Section 4: Bestsellers (Warm Blush Background + Carousel) ── */}
        <Bestsellers />

        {/* ── Section 5: Festive Collection (Full-Width Editorial Banner) ── */}
        <FestiveCollection />

        {/* ── Section 6: About / The Chili Story (50/50 Two-Column) ── */}
        <AboutSection />

        {/* ── Section 7: Brand Statement (Editorial Luxury Campaign Quote) ── */}
        <BrandStatement />

        {/* ── Section 8: Explore Collections (Horizontal Scroll) ── */}
        <ExploreCollections />

        {/* ── Section 9: Customer Reviews (Loved by You) ─────────── */}
        <CustomerReviews />

        {/* ── Section 10: Newsletter (Join the Chili List) ───────── */}
        <Newsletter />
      </main>

      {/* ── Deep Crimson 5-Column Footer with Real Logo ─────────── */}
      <Footer />
    </div>
  );
}