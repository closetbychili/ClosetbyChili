import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import HMProductDetailSection from "@/components/HMProductDetailSection";

import { getProduct, getProducts, ApiClientError } from "@/lib/api";
import { getProductImages, mapProductToUi } from "@/lib/adapters/catalog-adapter";
import type { ProductDetail, ProductListItem } from "@/lib/api/types";
import type { ProductItem } from "@/lib/homepage-data";

const getCachedProduct = cache(async (slug: string) => {
  return getProduct(slug, { cache: "no-store" });
});

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
    const product = await getCachedProduct(slug);
    const categoryName = product.category?.name || "Ethnic Wear";

    return {
      title: `${product.name} | ${categoryName} | Closet by Chilli`,
      description:
        product.description ||
        `Buy ${product.name} online from Closet by Chilli. Handcrafted luxury ethnic fashion with Jaipur master craftsmanship.`,
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
    product = await getCachedProduct(slug);

    // Fetch related products from same category or fallback catalog
    if (product.category?.slug) {
      const relatedRes = await getProducts(
        { category: product.category.slug, page_size: 8 },
        { cache: "no-store" }
      );
      relatedProducts = relatedRes.results
        .filter(
          (p: ProductListItem) =>
            p.slug !== slug && p.status === "active" && p.is_active
        )
        .slice(0, 4)
        .map((p) => mapProductToUi(p));
    }

    if (relatedProducts.length < 4) {
      const fallbackRes = await getProducts(
        { page_size: 10 },
        { cache: "no-store" }
      );
      const additional = fallbackRes.results
        .filter(
          (p) =>
            p.slug !== slug &&
            p.status === "active" &&
            p.is_active &&
            !relatedProducts.some((r) => r.href === `/products/${p.slug}`)
        )
        .slice(0, 4 - relatedProducts.length)
        .map((p) => mapProductToUi(p));
      relatedProducts = [...relatedProducts, ...additional];
    }
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.code === "NOT_FOUND")) {
      notFound();
    }
    console.error("Failed to load product detail:", error);
    throw error;
  }

  if (!product || product.status !== "active" || !product.is_active) {
    notFound();
  }

  const galleryImages = getProductImages(product);
  const firstVariant = product.variants.find((v) => v.is_active) || product.variants[0];
  const initialPrice = firstVariant ? parseFloat(firstVariant.retail_price) : 6499;
  const styleId = firstVariant?.sku || `CBC-24-${product.slug.toUpperCase().slice(0, 4)}`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-body-md antialiased selection:bg-primary selection:text-on-primary">
      {/* ── Global Header ──────────────────────────────────────── */}
      <Header />

      <main className="w-full pt-24 sm:pt-28 bg-white flex-1">
        <div className="flex flex-col w-full">
          {/* ── H&M Editorial Experience with 1-then-2 Image Grid & Differential Speed Scroll ── */}
          <HMProductDetailSection
            product={product}
            galleryImages={galleryImages}
            styleId={styleId}
          />

          {/* ── You May Also Like / Recommended Silhouettes ──── */}
          {relatedProducts.length > 0 && (
            <section className="max-w-360 mx-auto w-full px-4 sm:px-6 lg:px-12 py-16">
              <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8 gap-3">
                <div>
                  <span className="font-label-caps text-label-caps uppercase tracking-widest text-primary font-semibold">
                    Signature Edit
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    You May Also Like
                  </h2>
                </div>
                <Link
                  href="/products"
                  className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface hover:text-primary transition-colors flex items-center gap-1"
                >
                  View All Silhouettes →
                </Link>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {relatedProducts.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </section>
          )}

          {/* ── High-Trust Customer Experience & Assurance Strip ── */}
          <section className="w-full bg-surface-container py-10 px-6 lg:px-12 border-t border-outline-variant/30">
            <div className="max-w-360 mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface text-primary flex items-center justify-center shrink-0 shadow-sm border border-outline-variant/20">
                  <span className="material-symbols-outlined text-[26px]">
                    all_inclusive
                  </span>
                </div>
                <div>
                  <h4 className="font-label-caps text-label-caps uppercase font-bold text-on-surface">
                    Pure Handwoven Silks
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Certified mulberry &amp; chanderi weaves
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface text-secondary flex items-center justify-center shrink-0 shadow-sm border border-outline-variant/20">
                  <span className="material-symbols-outlined text-[26px]">
                    architecture
                  </span>
                </div>
                <div>
                  <h4 className="font-label-caps text-label-caps uppercase font-bold text-on-surface">
                    Complimentary Alterations
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Bespoke fitting support in 14 days
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface text-terracotta flex items-center justify-center shrink-0 shadow-sm border border-outline-variant/20">
                  <span className="material-symbols-outlined text-[26px]">
                    redeem
                  </span>
                </div>
                <div>
                  <h4 className="font-label-caps text-label-caps uppercase font-bold text-on-surface">
                    Signature Packaging
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Rigid gift boxes &amp; garment covers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface text-primary flex items-center justify-center shrink-0 shadow-sm border border-outline-variant/20">
                  <span className="material-symbols-outlined text-[26px]">
                    home_repair_service
                  </span>
                </div>
                <div>
                  <h4 className="font-label-caps text-label-caps uppercase font-bold text-on-surface">
                    19,000+ Pin Codes
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Seamless doorstep cash-on-delivery
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ── Global Footer ──────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
