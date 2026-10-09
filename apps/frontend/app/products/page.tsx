import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, ShieldCheck, Scissors, Truck, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ProductFilters from "@/components/ProductFilters";
import ProductPagination from "@/components/ProductPagination";

import { getCategories, getCollections, getProducts, ApiClientError } from "@/lib/api";
import { mapProductToUi } from "@/lib/adapters/catalog-adapter";
import type { CategorySummary, CollectionSummary } from "@/lib/api/types";
import type { ProductItem } from "@/lib/homepage-data";

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    collection?: string;
    search?: string;
    ordering?: string;
    page?: string;
    page_size?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const categoryName = params.category
    ? params.category.replace(/-/g, " ")
    : "";
  const title = categoryName
    ? `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} | Closet by Chilli`
    : "Catalog & Ethnic Wear | Closet by Chilli";

  return {
    title,
    description:
      "Explore the Closet by Chilli catalog of handcrafted kurtis, kurta sets, anarkalis, and luxury ethnic wear.",
  };
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams;

  const categorySlug = params.category || undefined;
  const collectionSlug = params.collection || undefined;
  const searchTerm = params.search || undefined;
  const ordering = params.ordering || "-created_at";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = 12; // 12 items per page for a balanced grid

  let products: ProductItem[] = [];
  let totalCount = 0;
  let categories: CategorySummary[] = [];
  let collections: CollectionSummary[] = [];
  let apiError = false;

  try {
    const [productsRes, categoriesRes, collectionsRes] = await Promise.all([
      getProducts(
        {
          category: categorySlug,
          collection: collectionSlug,
          search: searchTerm,
          ordering,
          page: currentPage,
          page_size: pageSize,
        },
        { next: { revalidate: 30 } }
      ),
      getCategories({ page_size: 50 }, { next: { revalidate: 60 } }),
      getCollections({ page_size: 50 }, { next: { revalidate: 60 } }),
    ]);

    products = productsRes.results.map((p) => mapProductToUi(p));
    totalCount = productsRes.count;

    categories = categoriesRes.results
      .filter((c) => c.is_active)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      }));

    collections = collectionsRes.results
      .filter((c) => c.is_active)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      }));
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "NETWORK_ERROR") {
      console.warn(
        "[Closet by Chilli] Backend API is offline on localhost:8000. Catalog page displaying error boundary."
      );
    } else {
      console.error("Error loading products catalog:", error);
    }
    apiError = true;
  }

  // Derive dynamic page title and narrative based on active filters
  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const activeCollection = collections.find((c) => c.slug === collectionSlug);

  const pageTitle = activeCategory
    ? activeCategory.name
    : activeCollection
    ? activeCollection.name
    : searchTerm
    ? `Search: "${searchTerm}"`
    : "All Silhouettes";

  const pageSubtitle = activeCategory
    ? `Explore our curated selection of handcrafted ${activeCategory.name.toLowerCase()} in breathable mulmul and pure Chanderi.`
    : activeCollection
    ? `Handcrafted pieces from our exclusive ${activeCollection.name.toLowerCase()} capsule.`
    : "Where pure Chanderi silks and structured drape silhouettes merge with bold Indian crimson hues. Tailored to flatter, crafted to empower the modern muse.";

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary">
      {/* ── Global Site Header ────────────────────────────────── */}
      <Header />

      <main className="flex-1 pt-24 sm:pt-28">
        {/* ── Editorial Collection Header & Lead Narrative ────── */}
        <header className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 pt-6 pb-6">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider mb-5">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="opacity-40">/</span>
            <Link href="/products" className="hover:text-primary transition-colors">
              Ready-to-Wear
            </Link>
            <span className="opacity-40">/</span>
            <span className="text-primary font-bold">{pageTitle}</span>
          </nav>

          {/* Main Title Split */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-outline-variant/30">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-primary/10 text-primary font-label-caps text-[10px] px-2.5 py-1 tracking-widest font-semibold uppercase">
                  Jaipur Artisanal Edit
                </span>
                <span className="text-on-surface-variant font-body text-xs">
                  {totalCount} {totalCount === 1 ? "Curated Silhouette" : "Curated Silhouettes"}
                </span>
              </div>
              <h1 className="font-headline-lg text-3xl sm:text-4xl lg:text-5xl text-on-surface tracking-tight font-semibold">
                {pageTitle}
              </h1>
              <p className="font-body text-xs sm:text-sm text-on-surface-variant mt-3 max-w-xl leading-relaxed">
                {pageSubtitle}
              </p>
            </div>

            {/* Quick Metrics Ribbon */}
            <div className="flex items-center gap-6 bg-surface-container-low p-4 shadow-xs border border-outline-variant/30 self-start lg:self-end">
              <div className="flex flex-col">
                <span className="font-headline-sm text-lg sm:text-xl text-primary font-semibold">
                  100%
                </span>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
                  Pure Mulberry &amp; Chanderi
                </span>
              </div>
              <div className="w-px h-8 bg-surface-container-highest" />
              <div className="flex flex-col">
                <span className="font-headline-sm text-lg sm:text-xl text-secondary font-semibold">
                  ₹1,299+
                </span>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
                  Artisanal Starting Price
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main Catalog Section (Filters + Product Grid) ────── */}
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 pb-12">
          <ProductFilters
            categories={categories}
            collections={collections}
            totalCount={totalCount}
          >
            {/* ── Products Grid / States ──────────────────────── */}
            {apiError ? (
              <div className="my-8 p-8 sm:p-12 text-center border border-primary/20 bg-surface-container-low rounded-xs shadow-xs">
                <h2 className="font-headline-sm text-xl text-on-surface mb-2 font-semibold">
                  Unable to load silhouettes
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto mb-6">
                  We are experiencing a temporary network issue connecting to the product database. Please try refreshing the catalog.
                </p>
                <Link
                  href="/products"
                  className="inline-block bg-primary text-on-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-primary-container transition-colors shadow-xs"
                >
                  Reload Catalog
                </Link>
              </div>
            ) : products.length > 0 ? (
              <div className="w-full flex flex-col gap-8">
                {/* Product Grid */}
                <div className="catalog-product-grid grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                  {/* First 4 products */}
                  {products.slice(0, 4).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}

                  {/* In-Grid Bespoke Atelier Service Interstitial Banner */}
                  <section className="col-span-2 md:col-span-3 xl:col-span-4 bg-surface-container-low p-6 sm:p-8 lg:p-10 relative overflow-hidden shadow-xs border border-outline-variant/30 my-2">
                    <div className="relative z-10 max-w-2xl flex flex-col gap-3">
                      <span className="font-label-caps text-xs text-primary uppercase font-bold tracking-widest flex items-center gap-2">
                        <Sparkles size={16} />
                        Bespoke Atelier Service
                      </span>
                      <h2 className="font-headline-md text-xl sm:text-2xl lg:text-3xl text-on-surface leading-tight font-semibold">
                        Flawless Silhouette, Made For You.
                      </h2>
                      <p className="font-body text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                        Every Closet by Chilli ensemble qualifies for our complimentary Master Tailor Custom Fitting service. Simply enter your bust, waist, and length measurements during checkout, or schedule a complimentary 15-minute video consultation with our Jaipur design studio.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Link
                          href="/account"
                          className="bg-primary text-on-primary font-label-caps text-xs uppercase px-5 py-2.5 tracking-widest hover:bg-primary-container transition-colors shadow-xs font-semibold"
                        >
                          Book Virtual Fitting
                        </Link>
                        <Link
                          href="/about"
                          className="bg-surface text-on-surface font-label-caps text-xs uppercase px-5 py-2.5 tracking-widest hover:bg-surface-container-highest transition-colors shadow-xs border border-outline-variant/30"
                        >
                          Explore Atelier Guide
                        </Link>
                      </div>
                    </div>
                  </section>

                  {/* Remaining products */}
                  {products.slice(4).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination Controls */}
                <ProductPagination
                  totalCount={totalCount}
                  pageSize={pageSize}
                  currentPage={currentPage}
                />
              </div>
            ) : (
              <div className="my-8 p-8 sm:p-16 text-center border border-outline-variant/30 bg-surface rounded-xs shadow-xs">
                <h2 className="font-headline-sm text-xl sm:text-2xl text-on-surface mb-2 font-semibold">
                  No silhouettes found
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto mb-6">
                  We couldn&apos;t find any pieces matching your active filters. Try adjusting your search or clearing selected categories.
                </p>
                <Link
                  href="/products"
                  className="inline-block bg-primary text-on-primary px-7 py-3 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-primary-container transition-all shadow-xs"
                >
                  Clear All Filters
                </Link>
              </div>
            )}
          </ProductFilters>
        </div>

        {/* ── Closet by Chilli Brand Assurance Bar ────────────── */}
        <section className="w-full bg-surface-container-low py-12 px-4 sm:px-6 lg:px-12 border-t border-outline-variant/30 my-6">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* 1 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 bg-primary/10 text-primary flex items-center justify-center shadow-2xs border border-primary/20">
                <ShieldCheck size={24} />
              </div>
              <div className="flex flex-col">
                <h4 className="font-headline-sm text-base text-on-surface font-semibold">
                  100% Pure Handwoven Silks
                </h4>
                <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Directly sourced from artisanal clusters in Chanderi, Banaras, and Jaipur with silk purity certificates.
                </p>
              </div>
            </div>

            {/* 2 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 bg-secondary/15 text-secondary flex items-center justify-center shadow-2xs border border-secondary/20">
                <Scissors size={24} />
              </div>
              <div className="flex flex-col">
                <h4 className="font-headline-sm text-base text-on-surface font-semibold">
                  Master Tailor Alterations
                </h4>
                <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Enjoy complimentary doorstep alterations within 14 days of delivery for a bespoke couture fit.
                </p>
              </div>
            </div>

            {/* 3 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 bg-tertiary/10 text-tertiary flex items-center justify-center shadow-2xs border border-tertiary/20">
                <Truck size={24} />
              </div>
              <div className="flex flex-col">
                <h4 className="font-headline-sm text-base text-on-surface font-semibold">
                  Express Nationwide Dispatch
                </h4>
                <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Bestsellers dispatched within 24–48 hours across metro cities with live SMS &amp; WhatsApp tracking.
                </p>
              </div>
            </div>

            {/* 4 */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 bg-on-surface/10 text-on-surface flex items-center justify-center shadow-2xs border border-outline-variant/30">
                <RefreshCw size={24} />
              </div>
              <div className="flex flex-col">
                <h4 className="font-headline-sm text-base text-on-surface font-semibold">
                  Effortless Exchanges
                </h4>
                <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Hassle-free 7-day doorstep reverse pick up and quick exchanges with zero questions asked.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Global Site Footer ────────────────────────────────── */}
      <Footer />
    </div>
  );
}
