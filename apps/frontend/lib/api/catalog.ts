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

/**
 * Fetches paginated product taxonomy categories.
 */
export async function getCategories(
  params?: CategoryListParams,
  options?: RequestOptions
): Promise<PaginatedResponse<Category>> {
  return apiFetch<PaginatedResponse<Category>>('/catalog/categories/', {
    ...options,
    params: {
      ...params,
      ...options?.params,
    },
  });
}

/**
 * Fetches a single category by its UUID.
 */
export async function getCategory(
  id: string,
  options?: RequestOptions
): Promise<Category> {
  return apiFetch<Category>(`/catalog/categories/${encodeURIComponent(id)}/`, options);
}

/**
 * Fetches paginated merchandising collections.
 */
export async function getCollections(
  params?: CollectionListParams,
  options?: RequestOptions
): Promise<PaginatedResponse<Collection>> {
  return apiFetch<PaginatedResponse<Collection>>('/catalog/collections/', {
    ...options,
    params: {
      ...params,
      ...options?.params,
    },
  });
}

/**
 * Fetches a single collection by its UUID.
 */
export async function getCollection(
  id: string,
  options?: RequestOptions
): Promise<Collection> {
  return apiFetch<Collection>(`/catalog/collections/${encodeURIComponent(id)}/`, options);
}

/**
 * Fetches paginated products matching optional filters (category, collection, search, ordering).
 */
export async function getProducts(
  params?: ProductListParams,
  options?: RequestOptions
): Promise<PaginatedResponse<ProductListItem>> {
  return apiFetch<PaginatedResponse<ProductListItem>>('/catalog/products/', {
    ...options,
    params: {
      ...params,
      ...options?.params,
    },
  });
}

/**
 * Fetches a single product by its URL-safe slug with active variants.
 */
export async function getProduct(
  slug: string,
  options?: RequestOptions
): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(
    `/catalog/products/${encodeURIComponent(slug)}/`,
    options
  );
}
