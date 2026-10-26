import { apiFetch } from "./client";
import { supabase } from "@/lib/supabase/client";
import type { PaginatedResponse } from "./types";
export type { PaginatedResponse };

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

// =============================================================================
// Admin Orders Listing API (Sprint A4.1)
// =============================================================================

export interface AdminOrderCustomer {
  id: string;
  email: string;
  display_name: string;
  phone: string;
}

export interface AdminOrderListItem {
  id: string;
  order_number: string;
  status: string;
  status_display: string;
  payment_status: string;
  payment_status_display: string;
  currency: string;
  subtotal: string;
  total: string;
  item_count: number;
  customer: AdminOrderCustomer;
  created_at: string;
  updated_at: string;
}

export interface AdminOrdersQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  payment_status?: string;
  created_after?: string;
  created_before?: string;
  customer_id?: string;
  ordering?: string;
}

/**
 * Fetch paginated administrative orders listing.
 */
export async function getAdminOrders(
  params?: AdminOrdersQueryParams,
  token?: string
): Promise<PaginatedResponse<AdminOrderListItem>> {
  const accessToken = await resolveAccessToken(token);
  const query = new URLSearchParams();

  if (params) {
    if (params.page !== undefined && params.page > 0) {
      query.set("page", String(params.page));
    }
    if (params.page_size !== undefined && params.page_size > 0) {
      query.set("page_size", String(params.page_size));
    }
    if (params.search && params.search.trim()) {
      query.set("search", params.search.trim());
    }
    if (params.status && params.status !== "all" && params.status !== "ALL") {
      query.set("status", params.status);
    }
    if (
      params.payment_status &&
      params.payment_status !== "all" &&
      params.payment_status !== "ALL"
    ) {
      query.set("payment_status", params.payment_status);
    }
    if (params.created_after && params.created_after.trim()) {
      query.set("created_after", params.created_after.trim());
    }
    if (params.created_before && params.created_before.trim()) {
      query.set("created_before", params.created_before.trim());
    }
    if (params.customer_id && params.customer_id.trim()) {
      query.set("customer_id", params.customer_id.trim());
    }
    if (params.ordering && params.ordering.trim()) {
      query.set("ordering", params.ordering.trim());
    }
  }

  const qs = query.toString();
  const endpoint = `/admin/orders/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminOrderListItem>>(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

// =============================================================================
// Admin Order Detail API (Sprint A4.2)
// =============================================================================

export interface AdminOrderAddressSnapshot {
  full_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  [key: string]: unknown;
}

export interface AdminOrderItemDetail {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string;
  sku: string;
  unit_price: string;
  quantity: number;
  line_total: string;
  image_url: string | null;
}

export interface AdminOrderPaymentRecord {
  provider: string;
  status: string;
  status_display: string;
  amount: string;
  currency: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderReservation {
  id: string;
  inventory_item_id: string;
  quantity: number;
  status: "active" | "released" | "finalized" | string;
  status_display: string;
  sku: string;
  product_name: string;
  variant_label: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderMovement {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  movement_type_display: string;
  quantity_change: number;
  resulting_quantity: number | null;
  reference: string;
  reason_code: string;
  note: string;
  actor_email: string;
  sku: string;
  product_name: string;
  created_at: string;
}

export interface AdminOrderInventoryLifecycle {
  reservations: AdminOrderReservation[];
  movements: AdminOrderMovement[];
}

export interface AdminOrderAuditLogItem {
  id: string;
  from_status: string;
  to_status: string;
  operation_type: string;
  operation_type_display: string;
  actor_email: string;
  note: string;
  created_at: string;
}

export interface AdminOrderStatusTransitionPayload {
  target_status: string;
  note?: string;
}

export interface AdminOrderCancelPayload {
  reason?: string;
  note?: string;
}

export interface AdminOrderDetail {
  id: string;
  order_number: string;
  idempotency_key: string | null;
  status: string;
  status_display: string;
  payment_status: string;
  payment_status_display: string;
  currency: string;
  subtotal: string;
  discount: string;
  shipping_amount: string;
  tax_amount: string;
  total: string;
  item_count: number;
  total_units: number;
  customer: AdminOrderCustomer;
  shipping_address: AdminOrderAddressSnapshot;
  billing_address: AdminOrderAddressSnapshot;
  items: AdminOrderItemDetail[];
  payments: AdminOrderPaymentRecord[];
  payment: AdminOrderPaymentRecord | null;
  shipments?: AdminShipmentSummary[];
  inventory: AdminOrderInventoryLifecycle;
  audit_logs: AdminOrderAuditLogItem[];
  created_at: string;
  updated_at: string;
}

/**
 * Fetch detailed administrative order information by order ID or order number.
 */
export async function getAdminOrderDetail(
  orderId: string,
  token?: string
): Promise<AdminOrderDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/orders/${encodeURIComponent(orderId)}/`;

  return apiFetch<AdminOrderDetail>(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Transition order status following strict state machine rules.
 */
export async function transitionAdminOrderStatus(
  orderId: string,
  payload: AdminOrderStatusTransitionPayload,
  token?: string
): Promise<AdminOrderDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/orders/${encodeURIComponent(orderId)}/transition/`;

  return apiFetch<AdminOrderDetail>(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Cancel an unpaid pending order and release stock reservations.
 */
export async function cancelAdminOrder(
  orderId: string,
  payload: AdminOrderCancelPayload,
  token?: string
): Promise<AdminOrderDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/orders/${encodeURIComponent(orderId)}/cancel/`;

  return apiFetch<AdminOrderDetail>(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch privileged order audit history timeline.
 */
export async function getAdminOrderHistory(
  orderId: string,
  token?: string
): Promise<AdminOrderAuditLogItem[]> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/orders/${encodeURIComponent(orderId)}/history/`;

  return apiFetch<AdminOrderAuditLogItem[]>(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

// ============================================================================
// Sprint A4.4 — Admin Payment Operations & Reconciliation
// ============================================================================

export type PaymentDiscrepancyStatus =
  | "MATCHED"
  | "AMOUNT_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "STATUS_CONFLICT"
  | "DUPLICATE_ATTEMPT"
  | "NEEDS_REVIEW";

export interface AdminPaymentCustomer {
  id: string;
  email: string;
  display_name: string;
}

export interface AdminPaymentRecord {
  id: string;
  order_id: string;
  order_number: string;
  customer: AdminPaymentCustomer;
  provider: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: string;
  currency: string;
  payment_status: string;
  payment_status_display: string;
  order_status: string;
  order_status_display: string;
  discrepancy_status: PaymentDiscrepancyStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminPaymentDetail extends AdminPaymentRecord {
  subtotal: string;
  discount: string;
  shipping_amount: string;
  tax_amount: string;
  discrepancy_details: string[];
  is_reconciled: boolean;
  reconciled_at: string | null;
  audit_logs: AdminOrderAuditLogItem[];
}

export interface AdminPaymentQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  payment_status?: string;
  provider?: string;
  discrepancy_status?: PaymentDiscrepancyStatus | string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
}

export interface AdminPaymentReconcileResult {
  detail: string;
  outcome: "RECONCILED" | "ALREADY_PAID" | "UNPAID_ON_GATEWAY";
  payment_status: string;
  order_status: string;
  order_number: string;
  provider: string;
  reconciled_payment_id: string | null;
  reconciled_at: string;
}

/**
 * Fetch paginated administrative payment records with search and filtering.
 */
export async function getAdminPayments(
  params: AdminPaymentQueryParams = {},
  token?: string
): Promise<PaginatedResponse<AdminPaymentRecord>> {
  const accessToken = await resolveAccessToken(token);
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.payment_status?.trim()) searchParams.set("payment_status", params.payment_status.trim());
  if (params.provider?.trim()) searchParams.set("provider", params.provider.trim());
  if (params.discrepancy_status?.trim()) searchParams.set("discrepancy_status", params.discrepancy_status.trim());
  if (params.date_from?.trim()) searchParams.set("date_from", params.date_from.trim());
  if (params.date_to?.trim()) searchParams.set("date_to", params.date_to.trim());
  if (params.ordering?.trim()) searchParams.set("ordering", params.ordering.trim());

  const qs = searchParams.toString();
  const endpoint = `/admin/payments/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminPaymentRecord>>(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Fetch detailed payment inspection record including discrepancy evidence and audit trail.
 */
export async function getAdminPaymentDetail(
  paymentId: string,
  token?: string
): Promise<AdminPaymentDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/payments/${encodeURIComponent(paymentId)}/`;

  return apiFetch<AdminPaymentDetail>(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Execute server-side live reconciliation for an eligible payment with Razorpay gateway.
 */
export async function reconcileAdminPayment(
  paymentId: string,
  token?: string
): Promise<AdminPaymentReconcileResult> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/payments/${encodeURIComponent(paymentId)}/reconcile/`;

  return apiFetch<AdminPaymentReconcileResult>(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

// =============================================================================
// Sprint A4.5 — Admin Shipment & Fulfillment Management
// =============================================================================

export type AdminShipmentStatus =
  | "PENDING"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED";

export interface AdminShipmentSummary {
  id: string;
  status: AdminShipmentStatus;
  status_display: string;
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  internal_note: string;
  dispatched_at: string | null;
  dispatched_by_email: string;
  delivered_at: string | null;
  delivered_by_email: string;
  created_at: string;
  updated_at: string;
}

export interface AdminShipmentListItem {
  id: string;
  order_id: string;
  order_number: string;
  order_status: string;
  order_status_display: string;
  order_payment_status: string;
  order_payment_status_display: string;
  status: AdminShipmentStatus;
  status_display: string;
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  internal_note: string;
  dispatched_at: string | null;
  dispatched_by_email: string;
  delivered_at: string | null;
  delivered_by_email: string;
  customer_email: string;
  customer_name: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminShipmentAuditLogItem {
  id: string;
  from_status: string;
  to_status: string;
  event_type: string;
  event_type_display: string;
  actor_email: string;
  note: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminShipmentDetailOrder {
  id: string;
  order_number: string;
  status: string;
  status_display: string;
  payment_status: string;
  payment_status_display: string;
  currency: string;
  total: string;
  customer: AdminOrderCustomer;
  shipping_address: AdminOrderAddressSnapshot;
  items: AdminOrderItemDetail[];
  created_at: string;
}

export interface AdminShipmentDetail {
  id: string;
  status: AdminShipmentStatus;
  status_display: string;
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  internal_note: string;
  dispatched_at: string | null;
  dispatched_by_email: string;
  delivered_at: string | null;
  delivered_by_email: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  order: AdminShipmentDetailOrder;
  audit_logs: AdminShipmentAuditLogItem[];
}

export interface AdminShipmentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  carrier?: string;
  order_id?: string;
  order_number?: string;
  created_after?: string;
  created_before?: string;
  dispatched_after?: string;
  dispatched_before?: string;
  delivered_after?: string;
  delivered_before?: string;
  ordering?: string;
}

export interface AdminCreateShipmentPayload {
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  status?: "PENDING" | "READY_TO_SHIP";
  internal_note?: string;
}

export interface AdminUpdateShipmentTrackingPayload {
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  internal_note?: string;
}

export interface AdminShipmentDispatchPayload {
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  note?: string;
}

export interface AdminShipmentTransitionPayload {
  target_status: AdminShipmentStatus;
  note?: string;
}

/**
 * Fetch paginated list of shipments with search, status/carrier filters, and sorting.
 */
export async function getAdminShipments(
  params?: AdminShipmentListParams,
  token?: string
): Promise<PaginatedResponse<AdminShipmentListItem>> {
  const accessToken = await resolveAccessToken(token);
  const query = new URLSearchParams();

  if (params) {
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    if (params.status && params.status.trim() && params.status !== "ALL") {
      query.set("status", params.status.trim());
    }
    if (params.carrier && params.carrier.trim() && params.carrier !== "ALL") {
      query.set("carrier", params.carrier.trim());
    }
    if (params.order_id && params.order_id.trim()) query.set("order_id", params.order_id.trim());
    if (params.order_number && params.order_number.trim()) {
      query.set("order_number", params.order_number.trim());
    }
    if (params.created_after && params.created_after.trim()) {
      query.set("created_after", params.created_after.trim());
    }
    if (params.created_before && params.created_before.trim()) {
      query.set("created_before", params.created_before.trim());
    }
    if (params.dispatched_after && params.dispatched_after.trim()) {
      query.set("dispatched_after", params.dispatched_after.trim());
    }
    if (params.dispatched_before && params.dispatched_before.trim()) {
      query.set("dispatched_before", params.dispatched_before.trim());
    }
    if (params.delivered_after && params.delivered_after.trim()) {
      query.set("delivered_after", params.delivered_after.trim());
    }
    if (params.delivered_before && params.delivered_before.trim()) {
      query.set("delivered_before", params.delivered_before.trim());
    }
    if (params.ordering && params.ordering.trim()) query.set("ordering", params.ordering.trim());
  }

  const qs = query.toString();
  const endpoint = `/admin/shipments/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminShipmentListItem>>(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Fetch detailed single shipment record with order details, addresses, and audit logs.
 */
export async function getAdminShipmentDetail(
  shipmentId: string,
  token?: string
): Promise<AdminShipmentDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/shipments/${encodeURIComponent(shipmentId)}/`;

  return apiFetch<AdminShipmentDetail>(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Create a new shipment for an eligible customer order.
 */
export async function createAdminOrderShipment(
  orderId: string,
  payload: AdminCreateShipmentPayload,
  token?: string
): Promise<AdminShipmentDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/orders/${encodeURIComponent(orderId)}/shipments/`;

  return apiFetch<AdminShipmentDetail>(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Update carrier and tracking information without mutating shipment status.
 */
export async function updateAdminShipmentTracking(
  shipmentId: string,
  payload: AdminUpdateShipmentTrackingPayload,
  token?: string
): Promise<AdminShipmentDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/shipments/${encodeURIComponent(shipmentId)}/tracking/`;

  return apiFetch<AdminShipmentDetail>(endpoint, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Dispatch an eligible shipment, setting dispatched timestamp and synchronizing order status.
 */
export async function dispatchAdminShipment(
  shipmentId: string,
  payload?: AdminShipmentDispatchPayload,
  token?: string
): Promise<AdminShipmentDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/shipments/${encodeURIComponent(shipmentId)}/dispatch/`;

  return apiFetch<AdminShipmentDetail>(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });
}

/**
 * Transition shipment status (IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED, RETURNED).
 */
export async function transitionAdminShipmentStatus(
  shipmentId: string,
  payload: AdminShipmentTransitionPayload,
  token?: string
): Promise<AdminShipmentDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/shipments/${encodeURIComponent(shipmentId)}/transition/`;

  return apiFetch<AdminShipmentDetail>(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

// =============================================================================
// Admin Coupon Management (Sprint A5.1)
// =============================================================================

export type AdminCouponDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type AdminCouponLifecycleStatus =
  | "SCHEDULED"
  | "CURRENTLY_VALID"
  | "EXPIRED"
  | "INACTIVE";

export type AdminCouponTargetingMode =
  | "ALL_PRODUCTS"
  | "SPECIFIC_PRODUCTS"
  | "SPECIFIC_CATEGORIES"
  | "SPECIFIC_COLLECTIONS"
  | "PRODUCTS_AND_CATEGORIES"
  | "PRODUCTS_AND_COLLECTIONS"
  | "CATEGORIES_AND_COLLECTIONS"
  | "MIXED";

export interface AdminCouponTargetItem {
  id: string;
  name: string;
  slug: string;
  status?: string;
  is_active?: boolean;
}

export interface AdminCouponAuditLogItem {
  id: string;
  event_type: "CREATED" | "UPDATED" | "ACTIVATED" | "DEACTIVATED";
  actor_id?: string | null;
  actor_email: string | null;
  notes: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminCoupon {
  id: string;
  code: string;
  name: string;
  description: string;
  discount_type: AdminCouponDiscountType;
  discount_value: string;
  currency: string;
  targeting_mode: AdminCouponTargetingMode;
  target_summary?: string;
  applicable_products_count?: number;
  applicable_categories_count?: number;
  applicable_collections_count?: number;
  min_order_subtotal: string | null;
  max_discount_amount: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  lifecycle_status: AdminCouponLifecycleStatus;
  usage_limit: number | null;
  per_customer_limit: number | null;
  is_first_order_only: boolean;
  usage_count: number | null;
  total_redemptions?: number;
  remaining_capacity?: number | null;
  active_reservations_count?: number;
  created_at: string;
  updated_at: string;
  created_by_email?: string | null;
  updated_by_email?: string | null;
}

export interface AdminCouponRedemption {
  id: string;
  coupon_id: string;
  coupon_code: string;
  coupon_name: string;
  customer_id: string;
  customer_email_masked: string;
  customer_display: string;
  order_id: string | null;
  order_number: string | null;
  state: "RESERVED" | "REDEEMED" | "RELEASED";
  discount_amount: string;
  currency: string;
  idempotency_key: string | null;
  reserved_at: string;
  expires_at: string | null;
  finalized_at: string | null;
  released_at: string | null;
  release_reason: string;
  created_at: string;
  updated_at: string;
}

export interface AdminCouponRedemptionQueryParams {
  page?: number;
  page_size?: number;
  state?: "RESERVED" | "REDEEMED" | "RELEASED" | string;
  search?: string;
}

export interface AdminCouponDetail extends AdminCoupon {
  applicable_products: AdminCouponTargetItem[];
  applicable_categories: AdminCouponTargetItem[];
  applicable_collections: AdminCouponTargetItem[];
  audit_logs: AdminCouponAuditLogItem[];
}

export interface AdminCouponQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: string | boolean;
  discount_type?: AdminCouponDiscountType | string;
  targeting_mode?: AdminCouponTargetingMode | string;
  lifecycle?: "scheduled" | "currently_valid" | "expired" | "inactive" | string;
  ordering?: string;
}

export interface AdminCreateCouponPayload {
  code: string;
  name: string;
  description?: string;
  discount_type: AdminCouponDiscountType;
  discount_value: string | number;
  currency?: string;
  targeting_mode?: AdminCouponTargetingMode;
  product_ids?: string[];
  category_ids?: string[];
  collection_ids?: string[];
  min_order_subtotal?: string | number | null;
  max_discount_amount?: string | number | null;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
  usage_limit?: number | null;
  per_customer_limit?: number | null;
  is_first_order_only?: boolean;
}

export interface AdminUpdateCouponPayload {
  code?: string;
  name?: string;
  description?: string;
  discount_type?: AdminCouponDiscountType;
  discount_value?: string | number;
  currency?: string;
  targeting_mode?: AdminCouponTargetingMode;
  product_ids?: string[];
  category_ids?: string[];
  collection_ids?: string[];
  min_order_subtotal?: string | number | null;
  max_discount_amount?: string | number | null;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
  usage_limit?: number | null;
  per_customer_limit?: number | null;
  is_first_order_only?: boolean;
}

export async function getAdminCoupons(
  params?: AdminCouponQueryParams,
  token?: string
): Promise<PaginatedResponse<AdminCoupon>> {
  const accessToken = await resolveAccessToken(token);
  const query = new URLSearchParams();

  if (params) {
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    if (params.is_active !== undefined && params.is_active !== "" && params.is_active !== "all") {
      query.set("is_active", String(params.is_active));
    }
    if (params.discount_type && params.discount_type !== "ALL" && params.discount_type !== "all") {
      query.set("discount_type", params.discount_type);
    }
    if (params.targeting_mode && params.targeting_mode !== "ALL" && params.targeting_mode !== "all") {
      query.set("targeting_mode", params.targeting_mode);
    }
    if (params.lifecycle && params.lifecycle !== "ALL" && params.lifecycle !== "all") {
      query.set("lifecycle", params.lifecycle);
    }
    if (params.ordering && params.ordering.trim()) {
      query.set("ordering", params.ordering.trim());
    }
  }

  const qs = query.toString();
  const endpoint = `/admin/coupons/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminCoupon>>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getAdminCouponDetail(
  couponId: string,
  token?: string
): Promise<AdminCouponDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/coupons/${encodeURIComponent(couponId)}/`;

  return apiFetch<AdminCouponDetail>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function createAdminCoupon(
  payload: AdminCreateCouponPayload,
  token?: string
): Promise<AdminCouponDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/coupons/`;

  return apiFetch<AdminCouponDetail>(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateAdminCoupon(
  couponId: string,
  payload: AdminUpdateCouponPayload,
  token?: string
): Promise<AdminCouponDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/coupons/${encodeURIComponent(couponId)}/`;

  return apiFetch<AdminCouponDetail>(endpoint, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function activateAdminCoupon(
  couponId: string,
  token?: string
): Promise<AdminCouponDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/coupons/${encodeURIComponent(couponId)}/activate/`;

  return apiFetch<AdminCouponDetail>(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

export async function deactivateAdminCoupon(
  couponId: string,
  token?: string
): Promise<AdminCouponDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/coupons/${encodeURIComponent(couponId)}/deactivate/`;

  return apiFetch<AdminCouponDetail>(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

export async function getAdminCouponRedemptions(
  couponId: string,
  params?: AdminCouponRedemptionQueryParams,
  token?: string
): Promise<PaginatedResponse<AdminCouponRedemption>> {
  const accessToken = await resolveAccessToken(token);
  const query = new URLSearchParams();

  if (params) {
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    if (params.state && params.state !== "ALL" && params.state !== "all") {
      query.set("state", params.state);
    }
    if (params.search && params.search.trim()) {
      query.set("search", params.search.trim());
    }
  }

  const qs = query.toString();
  const endpoint = `/admin/coupons/${encodeURIComponent(couponId)}/redemptions/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminCouponRedemption>>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
export interface AdminCouponReportOverview {
  date_range: {
    start_date: string | null;
    end_date: string | null;
  };
  coupons_created?: number;
  coupons_created_count?: number;
  active_coupons?: number;
  active_coupons_count?: number;
  successful_redemptions_count: number;
  reserved_redemptions_count: number;
  released_redemptions_count: number;
  total_discount_granted: string;
  paid_orders_count?: number;
  paid_orders_revenue?: string;
  total_paid_revenue?: string;
  gross_subtotal_before_discount?: string;
  distinct_customers_count: number;
  average_discount_per_redemption: string;
  average_paid_order_value?: string;
  average_order_value_before_discount?: string;
  average_order_value_after_discount?: string;
  total_configured_capacity?: number | null;
  total_remaining_capacity?: number | null;
  global_capacity_metrics?: {
    total_configured_capacity?: number | null;
    total_redemptions_used?: number;
    total_remaining_capacity?: number | null;
    unlimited_coupons_count?: number;
  } | null;
  orders_by_status?: Record<string, number>;
  orders_by_order_status?: Record<string, number>;
  orders_by_payment_status?: Record<string, number>;
}

export interface AdminCouponPerformanceItem {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  lifecycle_status: "scheduled" | "currently_valid" | "expired" | "inactive";
  discount_type: AdminCouponDiscountType;
  discount_value: string;
  currency: string;
  usage_limit: number | null;
  per_customer_limit: number | null;
  start_date: string;
  end_date: string | null;
  successful_redemptions_count: number;
  distinct_customers_count: number;
  paid_order_count: number;
  paid_order_revenue: string;
  total_discount_amount: string;
  gross_subtotal_before_discount: string;
  average_order_value_before_discount: string;
  average_order_value_after_discount: string;
  remaining_capacity: number | null;
  last_redemption_at: string | null;
}

export interface AdminCouponPerformanceParams {
  page?: number;
  page_size?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  is_active?: string | boolean;
  discount_type?: string;
  lifecycle_status?: string;
  ordering?: string;
}

export interface AdminCouponRedemptionReportItem {
  id: string;
  coupon_id: string;
  coupon_code: string;
  coupon_name: string;
  order_id: string | null;
  order_number: string | null;
  customer_email_masked: string;
  state: "RESERVED" | "REDEEMED" | "RELEASED";
  discount_amount: string;
  currency: string;
  created_at: string;
  finalized_at: string | null;
  released_at: string | null;
  release_reason: string;
  order_status: string | null;
  payment_status: string | null;
}

export interface AdminCouponRedemptionsReportParams {
  page?: number;
  page_size?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  state?: string;
  order_status?: string;
  payment_status?: string;
  ordering?: string;
}

export async function getAdminCouponReportsOverview(
  params?: { start_date?: string; end_date?: string },
  token?: string
): Promise<AdminCouponReportOverview> {
  const accessToken = await resolveAccessToken(token);
  const query = new URLSearchParams();

  if (params?.start_date) query.set("start_date", params.start_date);
  if (params?.end_date) query.set("end_date", params.end_date);

  const qs = query.toString();
  const endpoint = `/admin/coupons/reports/overview/${qs ? `?${qs}` : ""}`;

  return apiFetch<AdminCouponReportOverview>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getAdminCouponReportsPerformance(
  params?: AdminCouponPerformanceParams,
  token?: string
): Promise<PaginatedResponse<AdminCouponPerformanceItem>> {
  const accessToken = await resolveAccessToken(token);
  const query = new URLSearchParams();

  if (params) {
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    if (params.start_date) query.set("start_date", params.start_date);
    if (params.end_date) query.set("end_date", params.end_date);
    if (params.is_active !== undefined && params.is_active !== "" && params.is_active !== "all") {
      query.set("is_active", String(params.is_active));
    }
    if (params.discount_type && params.discount_type !== "ALL" && params.discount_type !== "all") {
      query.set("discount_type", params.discount_type);
    }
    if (params.lifecycle_status && params.lifecycle_status !== "ALL" && params.lifecycle_status !== "all") {
      query.set("lifecycle_status", params.lifecycle_status);
    }
    if (params.ordering && params.ordering.trim()) {
      query.set("ordering", params.ordering.trim());
    }
  }

  const qs = query.toString();
  const endpoint = `/admin/coupons/reports/performance/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminCouponPerformanceItem>>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getAdminCouponReportsRedemptions(
  params?: AdminCouponRedemptionsReportParams,
  token?: string
): Promise<PaginatedResponse<AdminCouponRedemptionReportItem>> {
  const accessToken = await resolveAccessToken(token);
  const query = new URLSearchParams();

  if (params) {
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    if (params.start_date) query.set("start_date", params.start_date);
    if (params.end_date) query.set("end_date", params.end_date);
    if (params.state && params.state !== "ALL" && params.state !== "all") {
      query.set("state", params.state);
    }
    if (params.order_status && params.order_status !== "ALL" && params.order_status !== "all") {
      query.set("order_status", params.order_status);
    }
    if (params.payment_status && params.payment_status !== "ALL" && params.payment_status !== "all") {
      query.set("payment_status", params.payment_status);
    }
    if (params.ordering && params.ordering.trim()) {
      query.set("ordering", params.ordering.trim());
    }
  }

  const qs = query.toString();
  const endpoint = `/admin/coupons/reports/redemptions/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminCouponRedemptionReportItem>>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export interface AdminCustomer {
  id: string;
  email: string;
  display_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_order_count: number;
  successful_paid_order_count: number;
  total_paid_spend: string;
  latest_order_date: string | null;
  currency: string;
}

export interface AdminCustomerDetail extends AdminCustomer {
  supabase_user_id: string;
}

export interface AdminCustomerQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort?: string;
  date_from?: string;
  date_to?: string;
  has_orders?: string | boolean;
  status?: string;
  role?: string;
}

export async function getAdminCustomers(
  params?: AdminCustomerQueryParams,
  token?: string
): Promise<PaginatedResponse<AdminCustomer>> {
  const accessToken = await resolveAccessToken(token);
  const query = new URLSearchParams();

  if (params) {
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    if (params.sort && params.sort.trim()) query.set("sort", params.sort.trim());
    if (params.date_from) query.set("date_from", params.date_from);
    if (params.date_to) query.set("date_to", params.date_to);
    if (params.has_orders !== undefined && params.has_orders !== "" && params.has_orders !== "all") {
      query.set("has_orders", String(params.has_orders));
    }
    if (params.status && params.status !== "all") {
      query.set("status", params.status);
    }
    if (params.role && params.role !== "all") {
      query.set("role", params.role);
    }
  }

  const qs = query.toString();
  const endpoint = `/admin/customers/${qs ? `?${qs}` : ""}`;

  return apiFetch<PaginatedResponse<AdminCustomer>>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getAdminCustomerDetail(
  customerId: string,
  token?: string
): Promise<AdminCustomerDetail> {
  const accessToken = await resolveAccessToken(token);
  const endpoint = `/admin/customers/${encodeURIComponent(customerId)}/`;

  return apiFetch<AdminCustomerDetail>(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

