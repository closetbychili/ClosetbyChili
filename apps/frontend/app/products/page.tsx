import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ProductFilters from "@/components/ProductFilters";
import ProductPagination from "@/components/ProductPagination";

import { getCategories, getCollections, getProducts } from "@/lib/api";
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
  const pageSize = 12; // 12 items per page for a balanced 4x3 grid

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
    console.error("Error loading products catalog:", error);
    apiError = true;
  }

  // Derive dynamic page title based on active filters
  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const activeCollection = collections.find((c) => c.slug === collectionSlug);

  const pageTitle = activeCategory
    ? activeCategory.name
    : activeCollection
    ? activeCollection.name
    : searchTerm
    ? `Search: "${searchTerm}"`
    : "All Products";

  const pageSubtitle = activeCategory
    ? `Explore our curated selection of ${activeCategory.name.toLowerCase()}.`
    : activeCollection
    ? `Handcrafted pieces from our ${activeCollection.name.toLowerCase()}.`
    : "Handcrafted silhouettes tailored for contemporary grace and timeless comfort.";

  return (
    <div className="min-h-screen flex flex-col bg-[#fff8f7] text-[#111111] font-body selection:bg-[#8b000a] selection:text-[#fff8f7]">
      {/* ── Header ────────────────────────────────────────────── */}
      <Header />

      <main className="flex-1 pt-28 sm:pt-32 pb-16 sm:pb-20 lg:pb-24 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          {/* ── Breadcrumb ────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="mb-4 sm:mb-6">
            <ol className="flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-ink/40">
              <li>
                <Link href="/" className="hover:text-chili transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li className="text-ink font-semibold">{pageTitle}</li>
            </ol>
          </nav>

          {/* ── Page Header ──────────────────────────────────── */}
          <div className="mb-8 sm:mb-10 pb-6 border-b border-[#111111]/8">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.35em] text-chili mb-2">
              Closet by Chilli
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-ink font-normal leading-tight">
              {pageTitle}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-ink/60 font-light max-w-2xl">
              {pageSubtitle}
            </p>
          </div>

          {/* ── Filter & Search Controls ─────────────────────── */}
          <ProductFilters
            categories={categories}
            collections={collections}
            totalCount={totalCount}
          />

          {/* ── Products Grid / Empty / Error States ──────────── */}
          {apiError ? (
            <div className="my-12 p-8 sm:p-12 text-center border border-[#8b000a]/15 bg-[#faf3ef] rounded-sm">
              <h2 className="font-display text-xl text-ink mb-2">
                Unable to load catalog
              </h2>
              <p className="text-xs sm:text-sm text-ink/60 max-w-md mx-auto mb-6">
                We are experiencing a temporary network issue connecting to the
                product database. Please try refreshing the page.
              </p>
              <Link
                href="/products"
                className="inline-block border border-ink bg-ink text-[#fff8f7] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-chili hover:border-chili transition-colors"
              >
                Reload Catalog
              </Link>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* ── Pagination ────────────────────────────────── */}
              <ProductPagination
                totalCount={totalCount}
                pageSize={pageSize}
                currentPage={currentPage}
              />
            </>
          ) : (
            <div className="my-12 p-8 sm:p-16 text-center border border-[#111111]/8 bg-white rounded-sm shadow-2xs">
              <h2 className="font-display text-xl sm:text-2xl text-ink mb-2">
                No products found
              </h2>
              <p className="text-xs sm:text-sm text-ink/60 max-w-md mx-auto mb-6">
                We couldn&apos;t find any products matching your active filters.
                Try adjusting your search or clearing selected categories.
              </p>
              <Link
                href="/products"
                className="inline-block border border-ink px-7 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink hover:bg-ink hover:text-[#fff8f7] transition-all"
              >
                Clear All Filters
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
