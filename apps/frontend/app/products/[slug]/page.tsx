import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductVariantSelector from "@/components/ProductVariantSelector";
import ProductStickyMobileBar from "@/components/ProductStickyMobileBar";

import { getProduct, getProducts, ApiClientError } from "@/lib/api";
import { getProductImages, mapProductToUi } from "@/lib/adapters/catalog-adapter";
import type { ProductDetail, ProductListItem } from "@/lib/api/types";
import type { ProductItem } from "@/lib/homepage-data";

const getCachedProduct = cache(async (slug: string) => {
  return getProduct(slug);
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
        { category: product.category.slug, page_size: 5 },
        { next: { revalidate: 60 } }
      );
      relatedProducts = relatedRes.results
        .filter((p: ProductListItem) => p.slug !== slug)
        .slice(0, 4)
        .map((p) => mapProductToUi(p));
    }

    if (relatedProducts.length < 4) {
      const fallbackRes = await getProducts(
        { page_size: 6 },
        { next: { revalidate: 60 } }
      );
      const additional = fallbackRes.results
        .filter((p) => p.slug !== slug && !relatedProducts.some((r) => r.href === `/products/${p.slug}`))
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

  if (!product) {
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

      <main className="w-full pt-20 bg-background flex-1">
        <div className="flex flex-col w-full">
          {/* ── Top Breadcrumb Bar ────────────────────────────── */}
          <div className="w-full bg-surface-container-low/70 py-3.5 px-6 lg:px-12 border-b border-outline-variant/30">
            <div className="max-w-[1440px] mx-auto flex items-center justify-between text-body-sm font-body-sm">
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-on-surface-variant flex-wrap">
                <Link href="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
                <span className="text-outline text-xs">/</span>
                <Link href="/products" className="hover:text-primary transition-colors">
                  Shop
                </Link>
                {product.category && (
                  <>
                    <span className="text-outline text-xs">/</span>
                    <Link
                      href={`/products?category=${product.category.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {product.category.name}
                    </Link>
                  </>
                )}
                <span className="text-outline text-xs">/</span>
                <span className="text-on-surface font-medium truncate max-w-[220px] sm:max-w-none">
                  {product.name}
                </span>
              </nav>

              <div className="hidden sm:flex items-center gap-4 text-on-surface-variant text-label-caps font-label-caps">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  SIGNATURE RUNWAY EDIT
                </span>
                <span className="opacity-30">|</span>
                <span>STYLE ID: {styleId}</span>
              </div>
            </div>
          </div>

          {/* ── Primary Product Hero & Commerce Grid ──────────── */}
          <section className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-12 py-8 lg:py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-start">
              {/* LEFT COLUMN: Fashion Imagery Grid (7 cols) */}
              <div className="lg:col-span-7">
                <ProductImageGallery
                  images={galleryImages}
                  productName={product.name}
                  badge="Bestseller"
                  fabricBadge="100% Mulberry Silk"
                />
              </div>

              {/* RIGHT COLUMN: Commerce Actions & Guarantees (5 cols sticky) */}
              <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-28">
                {/* Header & Category Meta */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps uppercase tracking-widest text-primary font-semibold">
                      Closet by Chili — Atelier Series
                    </span>
                    <span className="text-body-sm font-body-sm text-on-surface-variant">
                      {styleId}
                    </span>
                  </div>

                  <h1 className="font-headline-lg text-headline-lg text-on-surface leading-tight tracking-tight">
                    {product.name}
                  </h1>

                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    {product.description ||
                      "Two-piece power ensemble featuring sculpted peak lapels, tailored cigarette trousers, and bespoke artisanal finishing in signature Chili Red."}
                  </p>

                  {/* Reviews Rating Strip */}
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex items-center bg-secondary-fixed text-on-secondary-fixed px-2.5 py-1 gap-1 text-label-caps font-label-caps font-bold">
                      <span>4.9</span>
                      <span
                        className="material-symbols-outlined text-[14px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface font-medium underline underline-offset-2 cursor-pointer hover:text-primary">
                      184 Verified Reviews
                    </span>
                    <span className="text-outline text-xs">•</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      12 Questions Answered
                    </span>
                  </div>
                </div>

                {/* Interactive Variant Selector & Commercial Actions */}
                <ProductVariantSelector
                  productName={product.name}
                  productSlug={product.slug}
                  variants={product.variants}
                />
              </div>
            </div>
          </section>

          {/* ── Deep Editorial Specifications & Details Accordions ── */}
          <section className="w-full bg-surface-container-low/50 py-12 px-4 sm:px-6 lg:px-12 border-y border-outline-variant/30">
            <div className="max-w-[1440px] mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Editorial Quote & Mood Card */}
                <div className="lg:col-span-4 bg-inverse-surface text-inverse-on-surface p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden shadow-lg min-h-[420px]">
                  <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex flex-col gap-6 relative z-10">
                    <span className="text-secondary-fixed text-4xl font-headline-lg font-serif">
                      “
                    </span>
                    <p className="font-title-editorial text-headline-sm italic leading-snug text-secondary-fixed">
                      We don’t just dress you, we{" "}
                      <span className="text-primary-fixed underline decoration-secondary">
                        express
                      </span>{" "}
                      you.
                    </p>
                    <div className="w-12 h-0.5 bg-secondary" />
                    <p className="font-body-md text-body-md text-surface-dim leading-relaxed">
                      Crafted for the modern woman who commands the room. The Scarlet Empress draws its lineage from classical Indian royal drapes transformed into crisp, unapologetic contemporary power dressing.
                    </p>
                  </div>
                  <div className="pt-8 border-t border-surface-dim/20 mt-8 flex items-center justify-between text-body-sm font-body-sm text-secondary-fixed-dim">
                    <span>CLOSET BY CHILI</span>
                    <span className="font-label-caps text-label-caps tracking-widest uppercase">
                      JAIPUR ATELIER
                    </span>
                  </div>
                </div>

                {/* Specifications Breakdown Accordions */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                  {/* Accordion Item 1: Description & Craft */}
                  <details className="group bg-surface p-6 shadow-sm open:shadow-md transition-all duration-200 border border-outline-variant/30" open>
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                        Product Story &amp; Craftsmanship
                      </span>
                      <span className="material-symbols-outlined text-[22px] text-outline group-open:rotate-180 transition-transform">
                        expand_more
                      </span>
                    </summary>
                    <div className="pt-4 text-body-md font-body-md text-on-surface-variant flex flex-col gap-3 leading-relaxed">
                      <p>
                        The {product.name} represents the pinnacle of modern ethnic crossover tailoring. Hand-cut from pure luxury natural fabrics with high tensile strength and luminous silken sheen, each piece features structured shoulder pads, peak lapels, and custom brass-cast heraldic buttons dipped in antique matte gold.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="bg-surface-container-low p-3.5 border border-outline-variant/30">
                          <span className="font-label-caps text-label-caps uppercase text-primary font-semibold block mb-1">
                            Silken Drape
                          </span>
                          <p className="text-body-sm text-on-surface">
                            32 Momme Grade-6A Mulberry Silk shell with stretch silk lining.
                          </p>
                        </div>
                        <div className="bg-surface-container-low p-3.5 border border-outline-variant/30">
                          <span className="font-label-caps text-label-caps uppercase text-primary font-semibold block mb-1">
                            Tailored Silhouette
                          </span>
                          <p className="text-body-sm text-on-surface">
                            Double darted front with gentle suppression at the natural waistline.
                          </p>
                        </div>
                        <div className="bg-surface-container-low p-3.5 border border-outline-variant/30">
                          <span className="font-label-caps text-label-caps uppercase text-primary font-semibold block mb-1">
                            Trouser Construction
                          </span>
                          <p className="text-body-sm text-on-surface">
                            High-rise cut with concealed side zipper and functional slash pockets.
                          </p>
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Accordion Item 2: Fabric & Care Instructions */}
                  <details className="group bg-surface p-6 shadow-sm open:shadow-md transition-all duration-200 border border-outline-variant/30">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
                        Fabric Composition &amp; Care
                      </span>
                      <span className="material-symbols-outlined text-[22px] text-outline group-open:rotate-180 transition-transform">
                        expand_more
                      </span>
                    </summary>
                    <div className="pt-4 text-body-md font-body-md text-on-surface-variant flex flex-col gap-3 leading-relaxed">
                      <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                          <strong>Outer Fabric:</strong> 100% Pure Mulberry Silk Crepe (Heavy Weight 32 Momme).
                        </li>
                        <li>
                          <strong>Inner Lining:</strong> 100% Viscose Satin for maximum breathability during long festive celebrations.
                        </li>
                        <li>
                          <strong>Hardware:</strong> Hand-cast anti-tarnish gold alloy buttons with royal seal emboss.
                        </li>
                        <li>
                          <strong>Wash Care:</strong> Strictly Dry Clean Only. Store in the complimentary breathable cotton garment bag provided with your order.
                        </li>
                        <li>
                          <strong>Pressing:</strong> Low-temperature steam iron with protective pressing cloth. Do not apply direct hot iron to silk fabric.
                        </li>
                      </ul>
                    </div>
                  </details>

                  {/* Accordion Item 3: Sizing & Measurement Table */}
                  <details className="group bg-surface p-6 shadow-sm open:shadow-md transition-all duration-200 border border-outline-variant/30">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-outline inline-block" />
                        Garment Measurements (Inches)
                      </span>
                      <span className="material-symbols-outlined text-[22px] text-outline group-open:rotate-180 transition-transform">
                        expand_more
                      </span>
                    </summary>
                    <div className="pt-4 overflow-x-auto">
                      <table className="w-full text-left font-body-sm text-body-sm border-collapse">
                        <thead>
                          <tr className="bg-surface-container font-label-caps text-label-caps uppercase text-on-surface">
                            <th className="p-3">Size</th>
                            <th className="p-3">Bust</th>
                            <th className="p-3">Blazer Waist</th>
                            <th className="p-3">Blazer Length</th>
                            <th className="p-3">Trouser Waist</th>
                            <th className="p-3">Trouser Inseam</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container-high text-on-surface-variant">
                          <tr>
                            <td className="p-3 font-semibold text-on-surface">XS</td>
                            <td className="p-3">34&quot;</td>
                            <td className="p-3">28&quot;</td>
                            <td className="p-3">28.5&quot;</td>
                            <td className="p-3">26&quot;</td>
                            <td className="p-3">28&quot;</td>
                          </tr>
                          <tr className="bg-surface-container-low/50">
                            <td className="p-3 font-semibold text-on-surface">S</td>
                            <td className="p-3">36&quot;</td>
                            <td className="p-3">30&quot;</td>
                            <td className="p-3">29&quot;</td>
                            <td className="p-3">28&quot;</td>
                            <td className="p-3">28.5&quot;</td>
                          </tr>
                          <tr className="bg-primary/5 font-medium text-primary">
                            <td className="p-3 font-bold text-primary">M (Standard)</td>
                            <td className="p-3">38&quot;</td>
                            <td className="p-3">32&quot;</td>
                            <td className="p-3">29.5&quot;</td>
                            <td className="p-3">30&quot;</td>
                            <td className="p-3">29&quot;</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold text-on-surface">L</td>
                            <td className="p-3">40&quot;</td>
                            <td className="p-3">34&quot;</td>
                            <td className="p-3">30&quot;</td>
                            <td className="p-3">32&quot;</td>
                            <td className="p-3">29.5&quot;</td>
                          </tr>
                          <tr className="bg-surface-container-low/50">
                            <td className="p-3 font-semibold text-on-surface">XL</td>
                            <td className="p-3">42&quot;</td>
                            <td className="p-3">36&quot;</td>
                            <td className="p-3">30.5&quot;</td>
                            <td className="p-3">34&quot;</td>
                            <td className="p-3">30&quot;</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-body-sm text-outline mt-3 italic">
                        *All measurements are garment specifications. Allow a 0.5-inch artisan tolerance.
                      </p>
                    </div>
                  </details>

                  {/* Accordion Item 4: Packaging, Shipping & Delivery */}
                  <details className="group bg-surface p-6 shadow-sm open:shadow-md transition-all duration-200 border border-outline-variant/30">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-terracotta inline-block" />
                        Luxury Unboxing &amp; Delivery Terms
                      </span>
                      <span className="material-symbols-outlined text-[22px] text-outline group-open:rotate-180 transition-transform">
                        expand_more
                      </span>
                    </summary>
                    <div className="pt-4 text-body-md font-body-md text-on-surface-variant flex flex-col gap-3 leading-relaxed">
                      <p>
                        Every Closet by Chili piece arrives in our signature matte black magnetic luxury box wrapped in crimson tissue, tied with bespoke gold-stamped satin ribbons, and accompanied by a heavy canvas garment travel cover and an embossed thank-you note from our founders.
                      </p>
                      <div className="flex items-center gap-4 text-body-sm font-body-sm pt-2">
                        <span className="flex items-center gap-1.5 text-on-surface">
                          <span className="material-symbols-outlined text-[18px] text-primary">
                            local_shipping
                          </span>{" "}
                          Express Air Dispatch (3-4 Days)
                        </span>
                        <span className="flex items-center gap-1.5 text-on-surface">
                          <span className="material-symbols-outlined text-[18px] text-secondary">
                            verified
                          </span>{" "}
                          Guaranteed Transit Insurance
                        </span>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </section>

          {/* ── Luxury Packaging & Unboxing Visual Showcase ────── */}
          <section className="w-full bg-surface-container-low/60 py-16 px-4 sm:px-6 lg:px-12 border-t border-outline-variant/30">
            <div className="max-w-[1440px] mx-auto">
              <div className="text-center max-w-xl mx-auto mb-12">
                <span className="font-label-caps text-label-caps uppercase tracking-widest text-primary font-semibold">
                  The Unboxing Ritual
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface mt-1">
                  Packaged to Perfection
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                  From textured paper bags to customized satin ribbons and brass clothing tags, luxury awaits before the garment touches your skin.
                </p>
              </div>

              {/* 6-Grid Packaging Tiles matching the Brand Moodboard */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="flex flex-col items-center bg-surface p-3 text-center shadow-sm border border-outline-variant/30">
                  <div className="aspect-square w-full bg-surface-container mb-3 overflow-hidden relative">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuASCGBoluFPvumrqa9MlorOhBrNnBr1BDBPdvzzwyFAdgF-_XFRlJLjnT8gvOFr38vPPTKlmI9lu35h3W_AhM0Y9PUYIUzIyP8GA8PyMKH8ol3gtfsBuvAbFvsQtA7GIvbfDQ3QFu1XzkSHXvnk4wMW7WEADXW-XEjcOMaUiRAfU6RUmMshXqdAsl6VmqxX1DCDjgL3nFevFKmEA0pXi9zggjuf4jaoXnYbwjgH-airnQ0E5Don26W-Og"
                      alt="Luxury matte black Closet by Chili shopping bag with gold foil embossed logo"
                      fill
                      sizes="(max-width: 768px) 50vw, 16vw"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface font-semibold">
                    Bespoke Bag
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                    Heavyweight 350 GSM
                  </span>
                </div>

                <div className="flex flex-col items-center bg-surface p-3 text-center shadow-sm border border-outline-variant/30">
                  <div className="aspect-square w-full bg-surface-container mb-3 overflow-hidden relative">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaK5iYcqyJWYmRN_mT2fg9mgs51Uz7vwaVf_-F_bZzyjoAA04usH4McQFZytJowWEEREDzu7GKGQtDrBHBwQBn6qng8iHnAfsnXw4IayirCtWGPnsyhBxznBYCsQ9LSamPMJHLGfjT_y4EqPsHYPRSzPjJl-Lnz-a46FsLFHZMsbWjkZswwshiS7fhCO69KK_fDAbVlJ1I_UfTcd4uMxVSo5fW3FTtDrN-O5yqP_RQUcpyINefcUJF3w"
                      alt="Rich red crinkled tissue paper sealed with black wax seal sticker"
                      fill
                      sizes="(max-width: 768px) 50vw, 16vw"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface font-semibold">
                    Tissue Wrap
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                    Wax Seal Emblem
                  </span>
                </div>

                <div className="flex flex-col items-center bg-surface p-3 text-center shadow-sm border border-outline-variant/30">
                  <div className="aspect-square w-full bg-surface-container mb-3 overflow-hidden relative">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_iVdG2IbE3onQxHA9fYZdgK6tvZTlQmI7XYSM2wgDK8hbqYzljRTD1iXXgXfFRUnXwjuPDw_X0HUqBN1gxAM5_H1YDE6-9dxsrRAWrbRLjWrziMSZt48VETsHv97hxcJszaXqk4ORKBOTQGElywV27oFpXi0eRGKhjqZMmCZu8v_TZ3u9knOefq299gyaB2LbbNx1Lt2Pvz0nECxtj1mcJ9dOUl0LgkZGckvVq3rJXDSqdQlOwmWPoQ"
                      alt="Thick textured cotton-rag clothing price tag with gold foil border"
                      fill
                      sizes="(max-width: 768px) 50vw, 16vw"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface font-semibold">
                    Clothing Tag
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                    Gilded Emboss
                  </span>
                </div>

                <div className="flex flex-col items-center bg-surface p-3 text-center shadow-sm border border-outline-variant/30">
                  <div className="aspect-square w-full bg-surface-container mb-3 overflow-hidden relative">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCI6PTwiK96yRN367kxvvI7XWR0ztIquX0A9KbZTNFRuj7cJICkMpm7UqCEULEuxD1yXc8B3AcO0EIrq6W7J1f1bndR4GOQ26Kjko5cLRBHoDpeHcLf0JhD0DOdxyna9SaRcWYwPERktKyC7Npm9I7dMFMQAf7VFvLe8GAJBMzGyNW4EArwOmNsI98qROjx_sFFFZuWMRbI4ptf7d2FfWSIY_zAx0QaEmySWyqIpeuksrBJ8Fy15Kfs7g"
                      alt="Glossy scarlet red satin ribbon roll printed with gold typography Closet by Chili"
                      fill
                      sizes="(max-width: 768px) 50vw, 16vw"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface font-semibold">
                    Satin Ribbon
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                    Gold Typography
                  </span>
                </div>

                <div className="flex flex-col items-center bg-surface p-3 text-center shadow-sm border border-outline-variant/30">
                  <div className="aspect-square w-full bg-surface-container mb-3 overflow-hidden relative">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRW4IjXn-PuCUJEI_sE-qUmvxmfkUm_yVSL9ukBEsshqlQjzWh0X0w08R3eBnICYIwamQoQHviWOArzHnBb5xJEcMJfz5MEA2FrORKzEORmAEn_Rx3BhJRj-BXFFBssl3GF8BwIgNYLJ8SYHfIytne6NzN4EDt5tJuAXjYUpExw4P27t2aTdz6f9clWOBDfd6W8tWnco2vf8fVZypWmG4pQGzsMcH4wXZqCFvLVmZNMNAUcflI_mPcGw"
                      alt="Ivory pure linen garment cover bag with heavy gold zipper"
                      fill
                      sizes="(max-width: 768px) 50vw, 16vw"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface font-semibold">
                    Garment Cover
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                    Breathable Linen
                  </span>
                </div>

                <div className="flex flex-col items-center bg-surface p-3 text-center shadow-sm border border-outline-variant/30">
                  <div className="aspect-square w-full bg-surface-container mb-3 overflow-hidden relative">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuB533wOIVWGnIZZEzSQa-NxvmvCP4cJt_35jqgl8YaP3_xBdfyXZlpnKnKM4Ysv6NK3lxJJlJob3qlPHciSwUOaeKEAUdjFO_YLJ1_j6BQIFniHTivEE3dQfvVAh5TtCmxytWqNPJqZAbPP8QMVefhLJITW8gGJp3bfnWUwhdls_sj9YuD9dF5hA9zuB5A7f9SdMAA9jCt62jn0-31Fyi0a9rwmo37kDBbxxZ2TarOv4cw8dfIyQAiX8w"
                      alt="Midnight black letterpress thank you card with gold foil cursive typography"
                      fill
                      sizes="(max-width: 768px) 50vw, 16vw"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface font-semibold">
                    Thank You Card
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                    Personalized Note
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ── You May Also Like / Recommended Silhouettes ──── */}
          {relatedProducts.length > 0 && (
            <section className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-12 py-16">
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
            <div className="max-w-[1440px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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

          {/* ── Sticky Bottom Purchase Bar for Mobile Screens ── */}
          <ProductStickyMobileBar
            price={initialPrice}
            variantId={firstVariant?.id}
            defaultSize={firstVariant?.size || "M"}
          />
        </div>
      </main>

      {/* ── Global Footer ──────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
