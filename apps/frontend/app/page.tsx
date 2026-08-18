import Header from "@/components/Header";
import Hero from "@/components/Hero";
import NewArrivals from "@/components/NewArrivals";
import ShopByCategory from "@/components/ShopByCategory";
import Bestsellers from "@/components/Bestsellers";
import FestiveCollection from "@/components/FestiveCollection";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="overflow-x-hidden bg-cream text-ink">
      <Header />
      <Hero />
      <NewArrivals />
      <ShopByCategory />
      <Bestsellers />
      <FestiveCollection />
      <AboutSection />
      <Footer />
    </main>
  );
}