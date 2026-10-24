import { apiFetch } from "./client";
import { supabase } from "@/lib/supabase/client";
import type { PaginatedResponse } from "./types";

export interface AdminUser {
  id: string;
  email: string;
  role: "admin";
  is_admin: boolean;
  is_staff: boolean;
  is_active: boolean;
  created_at: string;
}

export interface StatusBreakdown {
  [status: string]: number;
}

export interface MetricCardData<T = number | string> {
  value: T;
  previous_value?: T | null;
  change_percentage?: number | null;
  definition?: string;
  currency?: string;
  paid_orders_count?: number;
  status_breakdown?: StatusBreakdown;
  payment_status_breakdown?: StatusBreakdown;
}

export interface DashboardMetrics {
  total_orders: MetricCardData<number>;
  gross_revenue: MetricCardData<string>;
  average_order_value: MetricCardData<string>;
  low_stock_variants: {
    count: number;
    threshold: number;
    definition: string;
  };
}

export interface SalesOverviewPoint {
  date: string;
  orders_count: number;
  revenue: string;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  created_at: string;
  customer_email: string;
  total: string;
  currency: string;
  status: string;
  payment_status: string;
  items_count: number;
}

export interface LowStockAlert {
  id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  variant_label: string;
  quantity_available: number;
  quantity_reserved: number;
}

export interface TopSellingProduct {
  product_id: string | null;
  product_name: string;
  units_sold: number;
  revenue: string;
}

export interface AdminDashboardOverview {
  period: "7d" | "30d" | "90d" | "all";
  date_range: {
    start: string | null;
    end: string;
  };
  metrics: DashboardMetrics;
  sales_overview: SalesOverviewPoint[];
  recent_orders: RecentOrder[];
  low_stock_alerts: LowStockAlert[];
  top_selling_products: TopSellingProduct[];
}

export interface DashboardQueryParams {
  period?: "7d" | "30d" | "90d" | "all";
  low_stock_threshold?: number;
}

/**
 * Verify administrative authorization against the backend API.
 * Uses trusted server-side authorization check.
 * Throws ApiClientError (401/403) if unauthenticated or not an admin.
 */
export async function verifyAdminAuth(token?: string): Promise<AdminUser> {
  let accessToken = token;
  if (!accessToken) {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token;
  }
  if (!accessToken) {
    throw new Error("Authentication required");
  }

  return apiFetch<AdminUser>("/admin/auth/verify/", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Fetch overview dashboard metrics, time-series, alerts and orders.
 */
export async function getAdminDashboardOverview(
  params?: DashboardQueryParams,
  token?: string
): Promise<AdminDashboardOverview> {
  let accessToken = token;
  if (!accessToken) {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token;
  }
  if (!accessToken) {
    throw new Error("Authentication required");
  }

  const searchParams = new URLSearchParams();
  if (params?.period) searchParams.set("period", params.period);
  if (params?.low_stock_threshold !== undefined) {
    searchParams.set("low_stock_threshold", String(params.low_stock_threshold));
  }

  const qs = searchParams.toString();
  const endpoint = `/admin/dashboard/overview/${qs ? `?${qs}` : ""}`;

  return apiFetch<AdminDashboardOverview>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// =============================================================================
// Admin Product Listing API (Sprint A2.1)
// =============================================================================

export interface AdminProductStockSummary {
  total_available: number;
  total_reserved: number;
  status: "in_stock" | "low_stock" | "out_of_stock" | "untracked" | "no_variants";
}

export interface AdminProductListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "draft" | "active" | "archived";
  is_active: boolean;
  category: import("./types").CategorySummary | null;
  collections: import("./types").CollectionSummary[];
  primary_image: import("./types").ProductImage | null;
  sku: string | null;
  skus: string[];
  min_price: string | null;
  max_price: string | null;
  variant_count: number;
  stock_summary: AdminProductStockSummary;
  readiness?: {
    is_ready: boolean;
    can_publish: boolean;
    total_errors: number;
    total_warnings: number;
  };
  created_at: string;
  updated_at: string;
}

export interface AdminProductListParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  collection?: string;
  status?: "all" | "draft" | "active" | "archived" | string;
  is_active?: boolean;
  ordering?: string;
}

/**
 * Fetch paginated administrative products matching optional filters and search.
 */
export async function getAdminProducts(
  params?: AdminProductListParams,
  token?: string
): Promise<import("./types").PaginatedResponse<AdminProductListItem>> {
  let accessToken = token;
  if (!accessToken) {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token;
  }
  if (!accessToken) {
    throw new Error("Authentication required");
  }

  const queryParams: Record<string, string | number | boolean | undefined | null> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.page_size) queryParams.page_size = params.page_size;
  if (params?.search) queryParams.search = params.search;
  if (params?.category && params.category !== "all") queryParams.category = params.category;
  if (params?.collection && params.collection !== "all") queryParams.collection = params.collection;
  if (params?.status && params.status !== "all") queryParams.status = params.status;
  if (params?.is_active !== undefined) queryParams.is_active = params.is_active;
  if (params?.ordering) queryParams.ordering = params.ordering;

  return apiFetch<import("./types").PaginatedResponse<AdminProductListItem>>("/admin/products/", {
    params: queryParams,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// =============================================================================
// Admin Product Create & Edit API (Sprint A2.2)
// =============================================================================

export interface AdminProductImage {
  id: string;
  product: string;
  image_url: string;
  alt_text: string;
  ordering: number;
  is_primary: boolean;
  public_id?: string;
  width?: number;
  height?: number;
  format?: string;
  resource_type?: string;
  bytes?: number;
  created_at?: string;
}

export interface AdminProductVariantInventory {
  quantity_available: number;
  quantity_reserved: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  threshold: number;
}

export interface AdminProductVariant {
  id: string;
  product: string;
  sku: string;
  size: string;
  color: string;
  retail_price: string;
  sale_price: string | null;
  is_active: boolean;
  inventory?: AdminProductVariantInventory;
  created_at?: string;
  updated_at?: string;
}

export interface ProductValidationError {
  code: string;
  section: "basic" | "images" | "variants" | "inventory";
  field: string;
  message: string;
  item_id?: string | null;
}

export interface ProductReadinessSection {
  is_valid: boolean;
  errors: ProductValidationError[];
  warnings: ProductValidationError[];
}

export interface ProductReadiness {
  is_ready?: boolean;
  can_publish?: boolean;
  summary?: {
    total_errors: number;
    total_warnings: number;
  };
  sections?: {
    basic: ProductReadinessSection;
    images: ProductReadinessSection;
    variants: ProductReadinessSection;
    inventory: ProductReadinessSection;
  };
  errors?: ProductValidationError[];
  warnings?: ProductValidationError[];
  // Backwards compatibility aliases
  is_ready_for_publish?: boolean;
  has_title?: boolean;
  has_name?: boolean;
  has_category?: boolean;
  has_active_variants?: boolean;
  has_variants?: boolean;
  has_prices?: boolean;
  has_price?: boolean;
  has_images?: boolean;
  issues?: string[];
  missing_requirements?: string[];
}

export interface AdminProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "draft" | "active" | "archived";
  is_active: boolean;
  category: import("./types").CategorySummary | null;
  category_id: string | null;
  collections: import("./types").CollectionSummary[];
  collection_ids: string[];
  images?: AdminProductImage[];
  variants?: AdminProductVariant[];
  readiness?: ProductReadiness;
  created_at: string;
  updated_at: string;
}

export interface CreateProductPayload {
  name: string;
  slug?: string;
  description?: string;
  category?: string | null;
  category_id?: string | null;
  collections?: string[];
  collection_ids?: string[];
  status?: "draft" | "active" | "archived";
  is_active?: boolean;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

/**
 * Helper to retrieve an access token from Supabase session if not passed explicitly.
 */
async function resolveAccessToken(token?: string): Promise<string> {
  if (token) return token;
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("Authentication required");
  }
  return accessToken;
}

/**
 * Create a new product silhouette in the atelier catalog.
 */
export async function createAdminProduct(
  payload: CreateProductPayload,
  token?: string
): Promise<AdminProductDetail> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminProductDetail>("/admin/products/", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Fetch a single product silhouette by UUID for administration and editing.
 */
export async function getAdminProduct(
  id: string,
  token?: string
): Promise<AdminProductDetail> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminProductDetail>(`/admin/products/${encodeURIComponent(id)}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Update an existing product silhouette.
 */
export async function updateAdminProduct(
  id: string,
  payload: UpdateProductPayload,
  token?: string
): Promise<AdminProductDetail> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminProductDetail>(`/admin/products/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Validate a product silhouette against storefront catalog publication rules.
 */
export async function validateAdminProduct(
  id: string,
  token?: string
): Promise<ProductReadiness> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<ProductReadiness>(`/admin/products/${encodeURIComponent(id)}/validate/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Publish a product silhouette to the public catalog after verifying readiness.
 */
export async function publishAdminProduct(
  id: string,
  token?: string
): Promise<{ message: string; product: AdminProductDetail; validation: ProductReadiness }> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<{ message: string; product: AdminProductDetail; validation: ProductReadiness }>(
    `/admin/products/${encodeURIComponent(id)}/publish/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Archive a product silhouette, hiding it from storefront listings.
 */
export async function archiveAdminProduct(
  id: string,
  token?: string
): Promise<{ message: string; product: AdminProductDetail }> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<{ message: string; product: AdminProductDetail }>(
    `/admin/products/${encodeURIComponent(id)}/archive/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Restore an archived or active product silhouette to draft status.
 */
export async function draftAdminProduct(
  id: string,
  token?: string
): Promise<{ message: string; product: AdminProductDetail }> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<{ message: string; product: AdminProductDetail }>(
    `/admin/products/${encodeURIComponent(id)}/draft/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// =============================================================================
// Media & Gallery API
// =============================================================================

export interface MediaUploadResponse {
  id?: string;
  image_url: string;
  secure_url?: string;
  public_id?: string;
  original_name: string;
  file_size?: number;
  width?: number;
  height?: number;
  format?: string;
  resource_type?: string;
  bytes?: number;
  alt_text?: string;
  created_at?: string;
}

export interface AdminMediaUsageProduct {
  id: string;
  name: string;
  slug: string;
  status?: string;
  is_primary?: boolean;
}

export interface AdminMediaUsageCategory {
  id: string;
  name: string;
  slug: string;
}

export interface AdminMediaItem {
  id: string;
  image_url: string;
  public_id: string;
  original_filename: string;
  alt_text: string;
  width?: number | null;
  height?: number | null;
  format?: string;
  resource_type?: string;
  bytes?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  products: AdminMediaUsageProduct[];
  categories: AdminMediaUsageCategory[];
  usage_type: "product" | "category" | "mixed" | "unassigned";
  is_used: boolean;
}

export interface AdminMediaQueryParams {
  search?: string;
  usage_type?: "all" | "product" | "category" | "unassigned";
  ordering?: "-created_at" | "created_at" | "original_filename" | "-original_filename";
  page?: number;
  page_size?: number;
}

export interface AdminMediaListResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  results: AdminMediaItem[];
}

/**
 * Fetch paginated media assets from the central media library.
 */
export async function fetchAdminMedia(
  params?: AdminMediaQueryParams,
  token?: string
): Promise<AdminMediaListResponse> {
  const accessToken = await resolveAccessToken(token);
  const searchParams = new URLSearchParams();

  if (params?.search) searchParams.set("search", params.search);
  if (params?.usage_type && params.usage_type !== "all") {
    searchParams.set("usage_type", params.usage_type);
  }
  if (params?.ordering) searchParams.set("ordering", params.ordering);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size) searchParams.set("page_size", String(params.page_size));

  const qs = searchParams.toString();
  const endpoint = `/admin/media/${qs ? `?${qs}` : ""}`;

  return apiFetch<AdminMediaListResponse>(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Fetch single media asset details with complete usage relationships.
 */
export async function fetchAdminMediaDetail(
  id: string,
  token?: string
): Promise<AdminMediaItem> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminMediaItem>(`/admin/media/${encodeURIComponent(id)}/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Update media asset alt_text and synchronize across all catalog references.
 */
export async function updateAdminMediaAltText(
  id: string,
  altText: string,
  token?: string
): Promise<AdminMediaItem> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminMediaItem>(`/admin/media/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    body: JSON.stringify({ alt_text: altText }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Safely delete an unassigned media asset from Cloudinary and DB.
 */
export async function deleteAdminMedia(
  id: string,
  token?: string
): Promise<void> {
  const accessToken = await resolveAccessToken(token);

  await apiFetch<void>(`/admin/media/${encodeURIComponent(id)}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Upload a media file to the backend media storage.
 */
export async function uploadAdminMedia(
  file: File,
  altText?: string,
  token?: string
): Promise<MediaUploadResponse> {
  const accessToken = await resolveAccessToken(token);
  const formData = new FormData();
  formData.append("file", file);
  if (altText) {
    formData.append("alt_text", altText);
  }

  return apiFetch<MediaUploadResponse>("/admin/media/upload/", {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Create a gallery image for a product.
 */
export async function createProductImage(
  productId: string,
  payload: { image_url: string; alt_text?: string; is_primary?: boolean; ordering?: number },
  token?: string
): Promise<AdminProductImage> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminProductImage>(`/admin/products/${encodeURIComponent(productId)}/images/`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Update a product image (e.g. set primary or change alt_text).
 */
export async function updateProductImage(
  productId: string,
  imageId: string,
  payload: Partial<{ image_url: string; alt_text: string; is_primary: boolean; ordering: number }>,
  token?: string
): Promise<AdminProductImage> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminProductImage>(
    `/admin/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Delete a product image from the gallery.
 */
export async function deleteProductImage(
  productId: string,
  imageId: string,
  token?: string
): Promise<{ success: boolean; message: string }> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<{ success: boolean; message: string }>(
    `/admin/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}/`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Directly upload and persist a product gallery image in Cloudinary and DB atomically.
 */
export async function uploadAdminProductImageFile(
  productId: string,
  file: File,
  options?: { alt_text?: string; is_primary?: boolean; ordering?: number },
  token?: string
): Promise<AdminProductImage> {
  const accessToken = await resolveAccessToken(token);
  const formData = new FormData();
  formData.append("file", file);
  if (options?.alt_text) formData.append("alt_text", options.alt_text);
  if (options?.is_primary !== undefined) formData.append("is_primary", String(options.is_primary));
  if (options?.ordering !== undefined) formData.append("ordering", String(options.ordering));

  return apiFetch<AdminProductImage>(
    `/admin/products/${encodeURIComponent(productId)}/images/`,
    {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Reorder product images.
 */
export async function reorderProductImages(
  productId: string,
  imageOrders: { id: string; ordering: number }[],
  token?: string
): Promise<AdminProductImage[]> {
  const accessToken = await resolveAccessToken(token);
  const image_ids = imageOrders.map((item) => item.id);

  return apiFetch<AdminProductImage[]>(
    `/admin/products/${encodeURIComponent(productId)}/images/reorder/`,
    {
      method: "POST",
      body: JSON.stringify({ image_ids, images: imageOrders }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// =============================================================================
// Variant & Inventory Management API
// =============================================================================

export interface CreateVariantPayload {
  sku: string;
  size?: string;
  color?: string;
  retail_price: number | string;
  sale_price?: number | string | null;
  is_active?: boolean;
  initial_stock?: number;
}

export type UpdateVariantPayload = Partial<CreateVariantPayload>;

/**
 * List variants for a product.
 */
export async function getProductVariants(
  productId: string,
  token?: string
): Promise<AdminProductVariant[]> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminProductVariant[]>(
    `/admin/products/${encodeURIComponent(productId)}/variants/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Create a new variant under a product.
 */
export async function createProductVariant(
  productId: string,
  payload: CreateVariantPayload,
  token?: string
): Promise<AdminProductVariant> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminProductVariant>(
    `/admin/products/${encodeURIComponent(productId)}/variants/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Update an existing variant.
 */
export async function updateProductVariant(
  productId: string,
  variantId: string,
  payload: UpdateVariantPayload,
  token?: string
): Promise<AdminProductVariant> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminProductVariant>(
    `/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Safely delete or deactivate a variant.
 */
export async function deleteProductVariant(
  productId: string,
  variantId: string,
  token?: string
): Promise<{ success: boolean; message: string; deactivated?: boolean }> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<{ success: boolean; message: string; deactivated?: boolean }>(
    `/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}/`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

export interface StockAdjustmentPayload {
  adjustment_type: "delta" | "set" | "increase" | "decrease";
  quantity: number;
  reason?: string;
  reason_code?: string;
  reference?: string;
  note?: string;
  idempotency_key?: string;
}

export interface StockAdjustmentResponse {
  message: string;
  variant_id: string;
  sku?: string;
  quantity_available: number;
  quantity_reserved: number;
  quantity_on_hand?: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  stock_status_label?: string;
  low_stock_threshold?: number;
  change_delta?: number;
  resulting_quantity?: number;
  movement_id?: string;
  idempotent_replay?: boolean;
}

/**
 * Execute an auditable inventory stock adjustment for a variant.
 */
export async function adjustVariantStock(
  variantId: string,
  payload: StockAdjustmentPayload,
  token?: string
): Promise<StockAdjustmentResponse> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<StockAdjustmentResponse>(
    `/admin/variants/${encodeURIComponent(variantId)}/stock-adjustment/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// =============================================================================
// Category & Collection Administration API (Sprint A2.5)
// =============================================================================

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string;
  image_url?: string;
  image?: string;
  image_public_id?: string;
  image_alt?: string;
  ordering?: number;
  is_visible_on_storefront?: boolean;
  parent: string | null;
  parent_slug: string | null;
  parent_name: string | null;
  children: import("./types").CategorySummary[];
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  image_url?: string;
  image_alt?: string;
  ordering?: number;
  is_visible_on_storefront?: boolean;
  parent?: string | null;
  is_active?: boolean;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export interface AdminCategoryListParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: string | boolean;
  parent?: string;
  ordering?: string;
  all?: boolean;
}

export interface AdminCollection {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionPayload {
  name: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
}

export type UpdateCollectionPayload = Partial<CreateCollectionPayload>;

export interface AdminCollectionListParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: string | boolean;
  ordering?: string;
  all?: boolean;
}

export interface AdminCollectionProduct {
  id: string;
  product_id: string;
  name: string;
  slug: string;
  status: string;
  sku: string | null;
  primary_image: import("./types").ProductImage | null;
  is_product_active: boolean;
  ordering: number;
  is_active: boolean;
  created_at: string;
}

/**
 * Fetch categories for admin management.
 */
export async function getAdminCategories(
  params?: AdminCategoryListParams,
  token?: string
): Promise<import("./types").PaginatedResponse<AdminCategory>> {
  const accessToken = await resolveAccessToken(token);
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size) searchParams.set("page_size", String(params.page_size));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.is_active !== undefined) searchParams.set("is_active", String(params.is_active));
  if (params?.parent) searchParams.set("parent", params.parent);
  if (params?.ordering) searchParams.set("ordering", params.ordering);
  if (params?.all) searchParams.set("all", "true");

  const qs = searchParams.toString();
  const endpoint = `/admin/categories/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminCategory> | AdminCategory[]>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((data) => {
    if (Array.isArray(data)) {
      return {
        count: data.length,
        next: null,
        previous: null,
        results: data,
      };
    }
    return data;
  });
}

/**
 * Fetch a single category by UUID.
 */
export async function getAdminCategory(
  id: string,
  token?: string
): Promise<AdminCategory> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminCategory>(`/admin/categories/${encodeURIComponent(id)}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Create a new taxonomy category.
 */
export async function createAdminCategory(
  payload: CreateCategoryPayload,
  token?: string
): Promise<AdminCategory> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminCategory>("/admin/categories/", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Update an existing category.
 */
export async function updateAdminCategory(
  id: string,
  payload: UpdateCategoryPayload,
  token?: string
): Promise<AdminCategory> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminCategory>(`/admin/categories/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Safely delete a category. Throws ApiClientError if referenced by products or children.
 */
export async function deleteAdminCategory(
  id: string,
  token?: string
): Promise<void> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<void>(`/admin/categories/${encodeURIComponent(id)}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Upload, replace or update category card image directly to Cloudinary via backend.
 */
export async function uploadAdminCategoryImage(
  categoryId: string,
  file: File,
  altText?: string,
  token?: string
): Promise<AdminCategory> {
  const accessToken = await resolveAccessToken(token);
  const formData = new FormData();
  formData.append("file", file);
  if (altText !== undefined) {
    formData.append("alt_text", altText);
  }

  return apiFetch<AdminCategory>(`/admin/categories/${encodeURIComponent(categoryId)}/image/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });
}

/**
 * Remove category card image and safely clean up Cloudinary asset.
 */
export async function deleteAdminCategoryImage(
  categoryId: string,
  token?: string
): Promise<AdminCategory> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminCategory>(`/admin/categories/${encodeURIComponent(categoryId)}/image/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Fetch collections for admin management.
 */
export async function getAdminCollections(
  params?: AdminCollectionListParams,
  token?: string
): Promise<import("./types").PaginatedResponse<AdminCollection>> {
  const accessToken = await resolveAccessToken(token);
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size) searchParams.set("page_size", String(params.page_size));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.is_active !== undefined) searchParams.set("is_active", String(params.is_active));
  if (params?.ordering) searchParams.set("ordering", params.ordering);
  if (params?.all) searchParams.set("all", "true");

  const qs = searchParams.toString();
  const endpoint = `/admin/collections/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminCollection> | AdminCollection[]>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((data) => {
    if (Array.isArray(data)) {
      return {
        count: data.length,
        next: null,
        previous: null,
        results: data,
      };
    }
    return data;
  });
}

/**
 * Fetch a single collection by UUID.
 */
export async function getAdminCollection(
  id: string,
  token?: string
): Promise<AdminCollection> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminCollection>(`/admin/collections/${encodeURIComponent(id)}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Create a new merchandising collection.
 */
export async function createAdminCollection(
  payload: CreateCollectionPayload,
  token?: string
): Promise<AdminCollection> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminCollection>("/admin/collections/", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Update an existing collection.
 */
export async function updateAdminCollection(
  id: string,
  payload: UpdateCollectionPayload,
  token?: string
): Promise<AdminCollection> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminCollection>(`/admin/collections/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Safely delete a collection.
 */
export async function deleteAdminCollection(
  id: string,
  token?: string
): Promise<void> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<void>(`/admin/collections/${encodeURIComponent(id)}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * List products assigned to a collection.
 */
export async function getAdminCollectionProducts(
  collectionId: string,
  token?: string
): Promise<AdminCollectionProduct[]> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminCollectionProduct[]>(
    `/admin/collections/${encodeURIComponent(collectionId)}/products/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Assign a product to a collection.
 */
export async function assignProductToCollection(
  collectionId: string,
  payload: { product_id?: string; product_ids?: string[]; ordering?: number },
  token?: string
): Promise<AdminCollectionProduct | AdminCollectionProduct[]> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<AdminCollectionProduct | AdminCollectionProduct[]>(
    `/admin/collections/${encodeURIComponent(collectionId)}/products/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

/**
 * Remove a product from a collection.
 */
export async function removeProductFromCollection(
  collectionId: string,
  productId: string,
  token?: string
): Promise<void> {
  const accessToken = await resolveAccessToken(token);

  return apiFetch<void>(
    `/admin/collections/${encodeURIComponent(collectionId)}/products/${encodeURIComponent(productId)}/`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// =============================================================================
// Inventory Domain Interfaces & API Calls (Sprint A3.2)
// =============================================================================

export interface AdminInventoryMovement {
  id: string;
  movement_type: string;
  movement_type_display: string;
  is_manual?: boolean;
  quantity_change: number;
  reason_code?: string;
  reason_display?: string;
  note?: string;
  resulting_quantity?: number | null;
  actor_email?: string;
  reference: string;
  idempotency_key?: string;
  created_at: string;
}

export interface AdminInventoryDetailImage {
  id: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  ordering: number;
}

export interface AdminInventoryDetail extends AdminInventoryItem {
  low_stock_threshold: number;
  images: AdminInventoryDetailImage[];
  recent_movements: AdminInventoryMovement[];
}


export interface AdminInventoryItem {
  id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_status: "draft" | "active" | "archived";
  product_is_active: boolean;
  category_name: string | null;
  category_id: string | null;
  thumbnail_url: string | null;
  sku: string;
  size: string;
  color: string;
  variant_title: string;
  retail_price: string;
  sale_price: string | null;
  is_active: boolean;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  stock_status_label: "In Stock" | "Low Stock" | "Out of Stock";
  low_stock_threshold: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  is_alert_acknowledged: boolean;
  alert_acknowledged_at: string | null;
  last_movement_at: string | null;
  last_movement: AdminInventoryMovement | null;
  created_at: string;
  updated_at: string;
}

export interface AdminInventorySummary {
  active_variants_tracked: number;
  total_on_hand: number;
  total_reserved: number;
  total_available: number;
  out_of_stock_variants: number;
  low_stock_variants: number;
  in_stock_variants: number;
  unacknowledged_alerts?: number;
  low_stock_threshold: number;
}

export interface AdminInventoryQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  stock_status?: "in_stock" | "low_stock" | "out_of_stock" | "all";
  category?: string;
  is_active?: boolean;
  acknowledged?: boolean;
  ordering?: string;
  low_stock_threshold?: number;
}

/**
 * Fetch paginated inventory list for admin console.
 */
export async function getAdminInventory(
  params?: AdminInventoryQueryParams,
  token?: string
): Promise<PaginatedResponse<AdminInventoryItem>> {
  const accessToken = await resolveAccessToken(token);

  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.page_size) queryParams.set("page_size", String(params.page_size));
  if (params?.search) queryParams.set("search", params.search);
  if (params?.stock_status && params.stock_status !== "all") {
    queryParams.set("stock_status", params.stock_status);
  }
  if (params?.category && params.category !== "all") {
    queryParams.set("category", params.category);
  }
  if (params?.is_active !== undefined) {
    queryParams.set("is_active", String(params.is_active));
  }
  if (params?.acknowledged !== undefined) {
    queryParams.set("acknowledged", String(params.acknowledged));
  }
  if (params?.ordering) queryParams.set("ordering", params.ordering);
  if (params?.low_stock_threshold) {
    queryParams.set("low_stock_threshold", String(params.low_stock_threshold));
  }

  const qs = queryParams.toString();
  const endpoint = `/admin/inventory/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminInventoryItem>>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Fetch aggregated inventory summary metrics.
 */
export async function getAdminInventorySummary(
  params?: { low_stock_threshold?: number; category?: string },
  token?: string
): Promise<AdminInventorySummary> {
  const accessToken = await resolveAccessToken(token);

  const queryParams = new URLSearchParams();
  if (params?.low_stock_threshold) {
    queryParams.set("low_stock_threshold", String(params.low_stock_threshold));
  }
  if (params?.category && params.category !== "all") {
    queryParams.set("category", params.category);
  }

  const qs = queryParams.toString();
  const endpoint = `/admin/inventory/summary/${qs ? `?${qs}` : ""}`;

  return apiFetch<AdminInventorySummary>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Fetch authoritative inventory detail for a variant.
 */
export async function getAdminInventoryDetail(
  variantId: string,
  params?: { low_stock_threshold?: number },
  token?: string
): Promise<AdminInventoryDetail> {
  const accessToken = await resolveAccessToken(token);
  const queryParams = new URLSearchParams();
  if (params?.low_stock_threshold) {
    queryParams.set("low_stock_threshold", String(params.low_stock_threshold));
  }
  const qs = queryParams.toString();
  const endpoint = `/admin/inventory/${variantId}/${qs ? `?${qs}` : ""}`;

  return apiFetch<AdminInventoryDetail>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

/**
 * Adjust stock for a variant via authoritative inventory service.
 */
export async function adjustInventoryStock(
  variantId: string,
  payload: StockAdjustmentPayload,
  token?: string
): Promise<StockAdjustmentResponse> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/inventory/${variantId}/adjust/`;

  return apiFetch<StockAdjustmentResponse>(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch paginated movement history for a variant.
 */
export async function getAdminInventoryMovements(
  variantId: string,
  params?: {
    page?: number;
    page_size?: number;
    movement_type?: string;
    reason_code?: string;
    is_manual?: boolean;
  },
  token?: string
): Promise<PaginatedResponse<AdminInventoryMovement>> {
  const accessToken = await resolveAccessToken(token);
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", String(params.page));
  if (params?.page_size) queryParams.set("page_size", String(params.page_size));
  if (params?.movement_type && params.movement_type !== "all") {
    queryParams.set("movement_type", params.movement_type);
  }
  if (params?.reason_code && params.reason_code !== "all") {
    queryParams.set("reason_code", params.reason_code);
  }
  if (params?.is_manual !== undefined) {
    queryParams.set("is_manual", String(params.is_manual));
  }

  const qs = queryParams.toString();
  const endpoint = `/admin/inventory/${variantId}/movements/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminInventoryMovement>>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export interface UpdateThresholdResponse {
  variant_id: string;
  low_stock_threshold: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  stock_status_label: "In Stock" | "Low Stock" | "Out of Stock";
  quantity_available: number;
  is_alert_acknowledged: boolean;
  message: string;
}

export interface AcknowledgeAlertResponse {
  variant_id: string;
  is_alert_acknowledged: boolean;
  alert_acknowledged_at: string | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  stock_status_label: "In Stock" | "Low Stock" | "Out of Stock";
  message: string;
}

/**
 * Configure low-stock threshold for a variant.
 */
export async function updateInventoryThreshold(
  variantId: string,
  threshold: number,
  token?: string
): Promise<UpdateThresholdResponse> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/inventory/${variantId}/threshold/`;

  return apiFetch<UpdateThresholdResponse>(endpoint, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ low_stock_threshold: threshold }),
  });
}

/**
 * Acknowledge or dismiss an inventory alert for a variant.
 */
export async function acknowledgeInventoryAlert(
  variantId: string,
  acknowledged: boolean = true,
  token?: string
): Promise<AcknowledgeAlertResponse> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/inventory/${variantId}/acknowledge/`;

  return apiFetch<AcknowledgeAlertResponse>(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ acknowledged }),
  });
}






