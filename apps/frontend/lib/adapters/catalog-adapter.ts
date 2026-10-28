/**
 * Closet by Chilli — Catalog Data Adapters
 *
 * Transforms backend API DTOs into frontend UI models.
 * Centralizes UI-specific presentations, image mappings, and category subtitles.
 */

import type { Category, ProductDetail, ProductListItem } from '@/lib/api/types';
import type { CategoryItem, ProductItem } from '@/lib/homepage-data';

/**
 * Temporary local image mapping for seeded catalog products.
 * Maps product slugs to available public assets until media service integration.
 */
export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  'sunflower-block-print-kurti': '/assets/products/kurti-1.jpg',
  'chikankari-embroidered-kurti': '/assets/products/kurti-2.jpg',
  'royal-silk-anarkali-set': '/assets/products/kurti-3.jpg',
  'floral-cotton-2-piece-kurta-set': '/assets/products/kurti-1.jpg',
  'ethnic-embroidered-3-piece-suit': '/assets/products/kurti-2.jpg',
  'maxi-ethnic-dress': '/assets/products/kurti-3.jpg',
  'bandhani-print-dupatta': '/assets/products/kurti-1.jpg',
  'rayon-palazzo-pants': '/assets/products/kurti-2.jpg',
};

/**
 * Gallery image assets for Product Detail Page.
 */
export const PRODUCT_GALLERY_MAP: Record<string, string[]> = {
  'sunflower-block-print-kurti': [
    '/assets/products/kurti-1.jpg',
    '/assets/products/kurti-2.jpg',
    '/assets/hero/hero-2.webp',
  ],
  'chikankari-embroidered-kurti': [
    '/assets/products/kurti-2.jpg',
    '/assets/products/kurti-3.jpg',
    '/assets/hero/hero-3.webp',
  ],
  'royal-silk-anarkali-set': [
    '/assets/products/kurti-3.jpg',
    '/assets/products/kurti-1.jpg',
    '/assets/hero/hero-4.webp',
  ],
  'floral-cotton-2-piece-kurta-set': [
    '/assets/products/kurti-1.jpg',
    '/assets/hero/hero-3.webp',
  ],
  'ethnic-embroidered-3-piece-suit': [
    '/assets/products/kurti-2.jpg',
    '/assets/hero/hero-5.webp',
  ],
  'maxi-ethnic-dress': [
    '/assets/products/kurti-3.jpg',
    '/assets/hero/hero-4.webp',
  ],
  'bandhani-print-dupatta': [
    '/assets/products/kurti-1.jpg',
    '/assets/hero/hero-5.webp',
  ],
  'rayon-palazzo-pants': [
    '/assets/products/kurti-2.jpg',
    '/assets/hero/hero-2.webp',
  ],
};

/**
 * Resolves media URLs to ensure relative media paths (e.g., /media/products/...)
 * are properly accessible from the frontend client.
 */
export function resolveMediaUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/media/')) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    try {
      const origin = new URL(apiUrl).origin;
      return `${origin}${url}`;
    } catch {
      return url;
    }
  }
  return url;
}

/**
 * Resolves gallery images for a ProductDetail object (Sprint 0.3 database-driven).
 * Falls back to legacy PRODUCT_GALLERY_MAP / PRODUCT_IMAGE_MAP if no database images exist.
 */
export function getProductImages(product: ProductDetail): string[] {
  if (product.images && product.images.length > 0) {
    return [...product.images]
      .sort((a, b) => a.ordering - b.ordering)
      .map((img) => resolveMediaUrl(img.image_url) || img.image_url);
  }
  return getProductGallery(product.slug).map((url) => resolveMediaUrl(url) || url);
}

/**
 * Resolves gallery images for a given product slug (legacy fallback).
 */
export function getProductGallery(slug: string): string[] {
  return (
    PRODUCT_GALLERY_MAP[slug] ||
    (PRODUCT_IMAGE_MAP[slug] ? [PRODUCT_IMAGE_MAP[slug]] : [])
  );
}

/**
 * Editorial subtitles for catalog taxonomy categories.
 */
export const CATEGORY_SUBTITLE_MAP: Record<string, string> = {
  kurtis: 'Everyday cuts & relaxed silhouettes',
  'kurta-sets': 'Coordinated elegance for every day',
  dresses: 'Modern draping with ethnic charm',
  'anarkali-sets': 'Statement royal flare & twirl',
  'bottom-wear': 'Tailored pants, palazzos & trousers',
  dupattas: 'Handloom silks, organza & zari trims',
  'printed-kurtis': 'Hand-block and contemporary prints',
  'embroidered-kurtis': 'Chikankari & intricate needlework',
  '2-piece-sets': 'Kurta & trousers',
  '3-piece-sets': 'Kurta, bottom & dupatta',
  'palazzo-sets': 'Wide-leg palazzo pairings',
};

/**
 * Editorial category background imagery mappings.
 */
export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  kurtis: '/assets/hero/hero-2.webp',
  'kurta-sets': '/assets/hero/hero-3.webp',
  dresses: '/assets/hero/hero-4.webp',
  'anarkali-sets': '/assets/hero/hero-4.webp',
  'bottom-wear': '/assets/products/kurti-2.jpg',
  dupattas: '/assets/hero/hero-5.webp',
};

/**
 * Adapts a backend ProductListItem DTO into a UI ProductItem.
 */
export function mapProductToUi(
  product: ProductListItem,
  badge?: string
): ProductItem {
  const parsedPrice = product.min_price ? parseFloat(product.min_price) : 0;
  const isNew = product.collections.some((c) => c.slug === 'new-arrivals');
  const isBestseller = product.collections.some(
    (c) => c.slug === 'bestsellers'
  );

  const resolvedBadge =
    badge || (isNew ? 'New' : isBestseller ? 'Bestseller' : undefined);

  const rawImage =
    product.primary_image?.image_url ||
    PRODUCT_IMAGE_MAP[product.slug] ||
    undefined;

  const resolvedImage = resolveMediaUrl(rawImage);

  const originalPrice = parsedPrice > 0 ? Math.round(parsedPrice * 1.3) : undefined;

  return {
    id: product.id,
    name: product.name,
    detail: product.category ? product.category.name : 'Ethnic Wear',
    price: parsedPrice,
    originalPrice,
    badge: resolvedBadge,
    image: resolvedImage,
    href: `/products/${product.slug}`,
  };
}

/**
 * Adapts a backend Category DTO into a UI CategoryItem.
 */
export function mapCategoryToUi(category: Category): CategoryItem {
  const rawCatImage =
    category.image_url ||
    category.image ||
    CATEGORY_IMAGE_MAP[category.slug] ||
    undefined;

  return {
    id: category.id,
    name: category.name,
    subtitle:
      category.short_description ||
      CATEGORY_SUBTITLE_MAP[category.slug] ||
      category.description ||
      undefined,
    image: resolveMediaUrl(rawCatImage),
    imageAlt: category.image_alt || category.name,
    href: `/products?category=${category.slug}`,
  };
}
