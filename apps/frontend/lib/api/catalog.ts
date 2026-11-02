/**
 * Closet by Chilli — Catalog API Functions
 *
 * Typed functions interacting with the Django REST Catalog API:
 * - GET /api/v1/catalog/categories/
 * - GET /api/v1/catalog/categories/{id}/
 * - GET /api/v1/catalog/collections/
 * - GET /api/v1/catalog/collections/{id}/
 * - GET /api/v1/catalog/products/
 * - GET /api/v1/catalog/products/{slug}/
 *
 * Next.js Data Cache / ISR:
 * Configured with standard revalidation intervals and cache tags
 * for targeted invalidation via /api/revalidate.
 */

import { apiFetch } from './client';
import type {
  Category,
  CategoryListParams,
  Collection,
  CollectionListParams,
  PaginatedResponse,
  ProductDetail,
  ProductListItem,
  ProductListParams,
  RequestOptions,
} from './types';

// Default revalidation TTLs (in seconds)
export const CATALOG_CACHE_TTL = {
  CATEGORIES: 600,   // ~10 minutes
  COLLECTIONS: 600,  // ~10 minutes
  PRODUCT_LIST: 180, // ~3 minutes
  PRODUCT_DETAIL: 180, // ~3 minutes
  HOMEPAGE: 300,     // ~5 minutes
} as const;

/**
 * Merges caller next options with defaults, ensuring tags are deduplicated.
 */
function mergeNextOptions(
  defaultRevalidate: number,
  defaultTags: string[],
  callerOptions?: RequestOptions
) {
  const callerNext = callerOptions?.next;
  const mergedTags = callerNext?.tags
    ? Array.from(new Set([...defaultTags, ...callerNext.tags]))
    : defaultTags;

  return {
    revalidate: callerNext?.revalidate ?? defaultRevalidate,
    tags: mergedTags,
  };
}

/**
 * Fetches paginated product taxonomy categories.
 * Default cache: 10 minutes with tags ['catalog', 'categories'].
 */
export async function getCategories(
  params?: CategoryListParams,
  options?: RequestOptions
): Promise<PaginatedResponse<Category>> {
  const next = mergeNextOptions(
    CATALOG_CACHE_TTL.CATEGORIES,
    ['catalog', 'categories'],
    options
  );

  return apiFetch<PaginatedResponse<Category>>('/catalog/categories/', {
    ...options,
    next,
    params: {
      ...params,
      ...options?.params,
    },
  });
}

/**
 * Fetches a single category by its UUID or slug.
 * Default cache: 10 minutes with tags ['catalog', 'categories', `category-${id}`].
 */
export async function getCategory(
  id: string,
  options?: RequestOptions
): Promise<Category> {
  const next = mergeNextOptions(
    CATALOG_CACHE_TTL.CATEGORIES,
    ['catalog', 'categories', `category-${id}`],
    options
  );

  return apiFetch<Category>(`/catalog/categories/${encodeURIComponent(id)}/`, {
    ...options,
    next,
  });
}

/**
 * Fetches paginated merchandising collections.
 * Default cache: 10 minutes with tags ['catalog', 'collections'].
 */
export async function getCollections(
  params?: CollectionListParams,
  options?: RequestOptions
): Promise<PaginatedResponse<Collection>> {
  const next = mergeNextOptions(
    CATALOG_CACHE_TTL.COLLECTIONS,
    ['catalog', 'collections'],
    options
  );

  return apiFetch<PaginatedResponse<Collection>>('/catalog/collections/', {
    ...options,
    next,
    params: {
      ...params,
      ...options?.params,
    },
  });
}

/**
 * Fetches a single collection by its UUID or slug.
 * Default cache: 10 minutes with tags ['catalog', 'collections', `collection-${id}`].
 */
export async function getCollection(
  id: string,
  options?: RequestOptions
): Promise<Collection> {
  const next = mergeNextOptions(
    CATALOG_CACHE_TTL.COLLECTIONS,
    ['catalog', 'collections', `collection-${id}`],
    options
  );

  return apiFetch<Collection>(`/catalog/collections/${encodeURIComponent(id)}/`, {
    ...options,
    next,
  });
}

/**
 * Fetches paginated products matching optional filters (category, collection, search, ordering).
 * Default cache: 3 minutes with tags ['catalog', 'products'] plus scoped filters.
 */
export async function getProducts(
  params?: ProductListParams,
  options?: RequestOptions
): Promise<PaginatedResponse<ProductListItem>> {
  const mergedParams = {
    ...params,
    ...options?.params,
  };

  const defaultTags = ['catalog', 'products'];
  if (mergedParams?.category) {
    defaultTags.push(`category-${mergedParams.category}`);
  }
  if (mergedParams?.collection) {
    defaultTags.push(`collection-${mergedParams.collection}`);
  }

  const next = mergeNextOptions(
    CATALOG_CACHE_TTL.PRODUCT_LIST,
    defaultTags,
    options
  );

  return apiFetch<PaginatedResponse<ProductListItem>>('/catalog/products/', {
    ...options,
    next,
    params: mergedParams,
  });
}

/**
 * Fetches a single product by its URL-safe slug with active variants.
 * Default cache: 3 minutes with tags ['catalog', 'products', `product-${slug}`].
 */
export async function getProduct(
  slug: string,
  options?: RequestOptions
): Promise<ProductDetail> {
  const next = mergeNextOptions(
    CATALOG_CACHE_TTL.PRODUCT_DETAIL,
    ['catalog', 'products', `product-${slug}`],
    options
  );

  return apiFetch<ProductDetail>(
    `/catalog/products/${encodeURIComponent(slug)}/`,
    {
      ...options,
      next,
    }
  );
}
