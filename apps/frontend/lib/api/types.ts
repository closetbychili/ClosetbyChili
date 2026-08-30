/**
 * Closet by Chilli — Catalog API TypeScript Types
 *
 * Exact type definitions mirroring the Django REST Framework API contract:
 * - apps/backend/apps/catalog/serializers.py
 * - docs/07-api-architecture.md
 * - docs/35-api-error-response-standards.md
 */

// =============================================================================
// Pagination & Common Envelopes
// =============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, string[] | string | unknown>;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

// =============================================================================
// Category Types
// =============================================================================

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent: string | null;
  parent_slug: string | null;
  children: CategorySummary[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

// =============================================================================
// Collection Types
// =============================================================================

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
}

// =============================================================================
// Product Variant Types
// =============================================================================

export interface ProductVariantSummary {
  id: string;
  sku: string;
  size: string;
  color: string;
  retail_price: string;
  is_active: boolean;
}

// =============================================================================
// Product Types
// =============================================================================

export type ProductStatus = 'draft' | 'active' | 'archived';

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: ProductStatus;
  is_active: boolean;
  category: CategorySummary | null;
  collections: CollectionSummary[];
  min_price: string | null;
  variant_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: ProductStatus;
  is_active: boolean;
  category: CategorySummary | null;
  collections: CollectionSummary[];
  variants: ProductVariantSummary[];
  created_at: string;
  updated_at: string;
}

export interface ProductListParams {
  page?: number;
  page_size?: number;
  category?: string;
  collection?: string;
  search?: string;
  ordering?: string;
}

// =============================================================================
// Fetch & Request Options
// =============================================================================

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}
