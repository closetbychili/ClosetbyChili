import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductVariantSelector from "@/components/ProductVariantSelector";

import { getProduct, getProducts, ApiClientError } from "@/lib/api";
import { getProductGallery, mapProductToUi } from "@/lib/adapters/catalog-adapter";
import type { ProductDetail, ProductListItem } from "@/lib/api/types";
import type { ProductItem } from "@/lib/homepage-data";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getProduct(slug);
    const categoryName = product.category?.name || "Ethnic Wear";

    return {
      title: `${product.name} | ${categoryName} | Closet by Chilli`,
      description:
        product.description ||
        `Buy ${product.name} online from Closet by Chilli. Handcrafted luxury ethnic fashion.`,
    };
  } catch {
    return {
      title: "Product Not Found | Closet by Chilli",
      description: "Explore handcrafted luxury ethnic wear at Closet by Chilli.",
    };
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;

  let product: ProductDetail | null = null;
  let relatedProducts: ProductItem[] = [];

  try {
    product = await getProduct(slug);

    // Fetch related products from same category or bestsellers
    if (product.category?.slug) {
      const relatedRes = await getProducts(
        { category: product.category.slug, page_size: 4 },
        { next: { revalidate: 60 } }
      );
      relatedProducts = relatedRes.results
        .filter((p: ProductListItem) => p.slug !== slug)
        .slice(0, 4)
        .map((p) => mapProductToUi(p));
    }
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.code === "NOT_FOUND")) {
      notFound();
    }
    console.error("Failed to load product detail:", error);
    throw error;
  }

  if (!product) {
    notFound();
  }

  const galleryImages = getProductGallery(product.slug);

  return (
    <div className="min-h-screen flex flex-col bg-[#fff8f7] text-[#111111] font-body selection:bg-[#8b000a] selection:text-[#fff8f7]">
      {/* ── Header ────────────────────────────────────────────── */}
      <Header />

      <main className="flex-1 pt-28 sm:pt-32 pb-16 sm:pb-24 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          {/* ── Breadcrumb Navigation ─────────────────────────── */}
          <nav aria-label="Breadcrumb" className="mb-6 sm:mb-8">
            <ol className="flex items-center flex-wrap gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-ink/40">
              <li>
                <Link href="/" className="hover:text-chili transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link
                  href="/products"
                  className="hover:text-chili transition-colors"
                >
                  Catalog
                </Link>
              </li>
              {product.category && (
                <>
                  <li>/</li>
                  <li>
                    <Link
                      href={`/products?category=${product.category.slug}`}
                      className="hover:text-chili transition-colors"
                    >
                      {product.category.name}
                    </Link>
                  </li>
                </>
              )}
              <li>/</li>
              <li className="text-ink font-semibold truncate max-w-[200px] sm:max-w-none">
                {product.name}
              </li>
            </ol>
          </nav>

          {/* ── 2-Column Product Detail Layout ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16">
            {/* Left Column: Image Gallery (5 / 12 cols on desktop) */}
            <div className="lg:col-span-6 xl:col-span-5">
              <ProductImageGallery
                images={galleryImages}
                productName={product.name}
              />
            </div>

            {/* Right Column: Product Info & Actions (7 / 12 cols) */}
            <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-start">
              {/* Category & Collection Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {product.category && (
                  <Link
                    href={`/products?category=${product.category.slug}`}
                    className="text-[10px] font-semibold uppercase tracking-[0.25em] text-chili hover:underline"
                  >
                    {product.category.name}
                  </Link>
                )}
                {product.collections.map((col) => (
                  <span
                    key={col.id}
                    className="text-[9px] font-medium uppercase tracking-[0.18em] text-ink/50 bg-[#f4ebe6] px-2 py-0.5 rounded-xs"
                  >
                    {col.name}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink font-normal leading-tight tracking-tight">
                {product.name}
              </h1>

              {/* Editorial Description */}
              {product.description && (
                <p className="mt-4 text-xs sm:text-sm text-ink/75 leading-relaxed font-light">
                  {product.description}
                </p>
              )}

              <div className="my-6 border-t border-[#111111]/8" />

              {/* Variant Selector & Add to Bag */}
              <ProductVariantSelector
                productName={product.name}
                productSlug={product.slug}
                variants={product.variants}
              />

              {/* Product Specifications & Care Accordion */}
              <div className="mt-8 pt-6 border-t border-[#111111]/8 flex flex-col gap-4 text-xs">
                <details className="group border-b border-[#111111]/8 pb-4" open>
                  <summary className="font-display text-sm font-medium text-ink cursor-pointer flex justify-between items-center list-none">
                    <span>Fabric, Craft & Care</span>
                    <span className="text-ink/40 group-open:rotate-180 transition-transform">
                      ↓
                    </span>
                  </summary>
                  <div className="mt-3 text-ink/70 leading-relaxed font-light space-y-1.5 pl-1">
                    <p>• Premium handcrafted natural fabrics crafted by master artisans.</p>
                    <p>• Dry clean recommended for first wash; gentle hand wash in cold water thereafter.</p>
                    <p>• Iron on reverse with medium temperature.</p>
                  </div>
                </details>

                <details className="group border-b border-[#111111]/8 pb-4">
                  <summary className="font-display text-sm font-medium text-ink cursor-pointer flex justify-between items-center list-none">
                    <span>Shipping & Delivery</span>
                    <span className="text-ink/40 group-open:rotate-180 transition-transform">
                      ↓
                    </span>
                  </summary>
                  <div className="mt-3 text-ink/70 leading-relaxed font-light space-y-1.5 pl-1">
                    <p>• Orders dispatched within 24–48 hours across India.</p>
                    <p>• Standard delivery timeframe: 3–5 business days.</p>
                    <p>• Tracking number provided via SMS and email upon shipment.</p>
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* ── Related Products Carousel / Grid ─────────────── */}
          {relatedProducts.length > 0 && (
            <div className="mt-20 sm:mt-24 pt-12 border-t border-[#111111]/8">
              <div className="flex items-end justify-between mb-8 sm:mb-10">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.3em] text-chili mb-1">
                    Curated Pairings
                  </p>
                  <h2 className="font-display text-xl sm:text-2xl lg:text-3xl text-ink font-normal">
                    You May Also Love
                  </h2>
                </div>
                <Link
                  href="/products"
                  className="text-xs uppercase tracking-[0.2em] font-semibold text-ink hover:text-chili transition-colors pb-0.5 border-b border-ink"
                >
                  View All
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                {relatedProducts.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
