import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, ArrowRight, RefreshCw, Layers } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCategories, ApiClientError } from "@/lib/api";
import { mapCategoryToUi } from "@/lib/adapters/catalog-adapter";
import type { CategoryItem } from "@/lib/homepage-data";

export const revalidate = 60; // ISR revalidation every 60 seconds

export const metadata: Metadata = {
  title: "Shop by Category | Closet by Chilli",
  description:
    "Explore our complete collection of handcrafted ethnic wear categories, from relaxed kurtis to royal anarkali sets and bespoke draping.",
  alternates: {
    canonical: "/categories",
  },
  openGraph: {
    title: "Shop by Category | Closet by Chilli",
    description:
      "Explore our complete collection of handcrafted ethnic wear categories, from relaxed kurtis to royal anarkali sets.",
    type: "website",
  },
};

export default async function CategoriesPage() {
  let categories: CategoryItem[] = [];
  let apiError = false;

  try {
    const res = await getCategories(
      { page_size: 100, storefront: true },
      { next: { revalidate: 60 } }
    );
    if (res?.results?.length) {
      categories = res.results.map((c) => mapCategoryToUi(c));
    }
  } catch (err) {
    if (err instanceof ApiClientError && err.code === "NETWORK_ERROR") {
      console.warn(
        "[Closet by Chilli] Backend API is offline on localhost:8000. Categories page displaying error boundary."
      );
    } else {
      console.error("Error loading storefront categories for /categories page:", err);
    }
    apiError = true;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary">
      {/* ── Global Site Header ────────────────────────────────── */}
      <Header />

      <main className="flex-1 pt-24 sm:pt-28">
        {/* ── Editorial Header & Breadcrumb ─────────────────────── */}
        <header className="w-full max-w-360 mx-auto px-4 sm:px-6 lg:px-12 pt-6 pb-8 sm:pb-12 border-b border-outline-variant/30">
          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider mb-5"
          >
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="opacity-40">/</span>
            <span className="text-on-surface font-semibold" aria-current="page">
              Categories
            </span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-px w-6 bg-primary" />
                <span className="font-label-caps text-label-caps uppercase text-primary tracking-widest font-semibold">
                  Taxonomy & Silhouettes
                </span>
              </div>
              <h1 className="font-headline-lg sm:text-[44px] text-headline-lg text-on-surface tracking-tight">
                Shop by Category
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-3 leading-relaxed">
                Explore our full spectrum of artisan cuts, coordinated sets, and fluid drapes. Every silhouette is crafted from pure textiles and designed for effortless grace.
              </p>
            </div>

            {/* Quick Stats / Direct Link to All Products */}
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container border border-outline-variant/30 text-label-caps uppercase tracking-wider text-on-surface font-medium text-xs">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>{categories.length} Silhouettes</span>
              </span>
              <Link
                href="/products"
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary hover:text-on-surface transition-colors"
              >
                <span>View Full Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* ── Content Container ─────────────────────────────────── */}
        <section
          className="w-full max-w-360 mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-16"
          aria-label="All Categories Grid"
        >
          {/* ── Error State ── */}
          {apiError ? (
            <div className="rounded-2xl border border-error/20 bg-error/5 p-8 sm:p-12 text-center max-w-xl mx-auto my-8">
              <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                Unable to Load Categories
              </h2>
              <p className="font-body-sm text-on-surface-variant mb-6 leading-relaxed">
                We encountered a connection issue while fetching our category directory. Please refresh the page or explore our full product catalog.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/categories"
                  className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-xs tracking-wider uppercase hover:opacity-90 transition-opacity"
                >
                  Retry
                </Link>
                <Link
                  href="/products"
                  className="px-6 py-2.5 rounded-full border border-outline-variant text-on-surface font-semibold text-xs tracking-wider uppercase hover:bg-surface-container transition-colors"
                >
                  Browse Products
                </Link>
              </div>
            </div>
          ) : categories.length === 0 ? (
            /* ── Empty State ── */
            <div className="text-center py-16 sm:py-24 border border-outline-variant/30 bg-surface-container-low rounded-3xl max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-full bg-surface-container border border-outline-variant/40 flex items-center justify-center mx-auto mb-4 text-primary">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                No Categories Available
              </h2>
              <p className="font-body-md text-on-surface-variant max-w-md mx-auto mb-6">
                Our categories are currently being curated for the upcoming season. Check back soon or view our available styles.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-semibold text-xs tracking-wider uppercase hover:opacity-90 transition-opacity shadow-xs"
              >
                <span>Explore All Products</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* ── Categories Grid ── */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.href || `/products?category=${cat.id}`}
                  className="group flex flex-col items-center w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-[80px] lg:rounded-t-[100px]"
                >
                  {/* Arched Image Container */}
                  <div className="relative w-full aspect-[3/4.2] rounded-t-[80px] lg:rounded-t-[100px] overflow-hidden bg-surface-container shadow-xs transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-md">
                    {cat.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cat.image}
                        alt={cat.imageAlt || cat.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      /* Graceful Fallback for categories without uploaded card media */
                      <div className="w-full h-full bg-linear-to-b from-[#FAF6F2] to-[#F2ECE5] flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-white/80 border border-outline-variant/30 flex items-center justify-center mb-3 shadow-2xs text-primary">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <span className="font-serif italic text-base text-on-surface font-semibold line-clamp-2">
                          {cat.name}
                        </span>
                      </div>
                    )}

                    {/* Gradient & Bottom Title Chip */}
                    <div className="absolute inset-0 bg-linear-to-t from-inverse-surface/75 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300" />
                    <div className="absolute bottom-3.5 inset-x-0 text-center px-2">
                      <span className="font-body-sm text-[12px] text-secondary-fixed tracking-widest uppercase font-semibold">
                        Explore Cuts
                      </span>
                    </div>
                  </div>

                  {/* Typography Information */}
                  <div className="mt-3.5 text-center px-1 w-full">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors truncate">
                      {cat.name}
                    </h2>
                    {cat.subtitle ? (
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">
                        {cat.subtitle}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Site Footer ───────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
