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

export interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string;
  ordering: number;
  is_primary: boolean;
}

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
  primary_image?: ProductImage | null;
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
  images?: ProductImage[];
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

// =============================================================================
// Cart Domain Types
// =============================================================================

export interface CartProductSummary {
  id: string;
  name: string;
  slug: string;
  category_name?: string;
  category_slug?: string;
}

export interface CartVariantSummary {
  id: string;
  sku: string;
  size: string;
  color: string;
  retail_price: string;
  product: CartProductSummary;
}

export interface CartItem {
  id: string;
  variant: CartVariantSummary;
  quantity: number;
  unit_price: string;
  line_total: string;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: string | null;
  user_id?: string | null;
  session_key: string | null;
  items: CartItem[];
  item_count: number;
  subtotal: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AddToCartPayload {
  variant_id: string;
  quantity?: number;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

// =============================================================================
// Address & Checkout Domain Types
// =============================================================================

export interface Address {
  id: string;
  user: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  landmark: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: 'HOME' | 'OFFICE' | 'OTHER';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressPayload {
  user_id?: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  address_type?: 'HOME' | 'OFFICE' | 'OTHER';
  is_default?: boolean;
}

export interface CheckoutOrderItem {
  id: string;
  product: string;
  variant: string;
  product_name: string;
  variant_name: string;
  sku: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface CheckoutAddressSnapshot {
  id: string;
  full_name: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  address_type?: string;
  is_default?: boolean;
}

export interface CheckoutOrder {
  id: string;
  order_number: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  currency: string;
  subtotal: string;
  discount: string;
  shipping_amount: string;
  tax_amount: string;
  total: string;
  shipping_address_snapshot: CheckoutAddressSnapshot;
  billing_address_snapshot: CheckoutAddressSnapshot;
  created_at: string;
  updated_at: string;
  item_count: number;
  items: CheckoutOrderItem[];
  razorpay_order_id?: string | null;
}

export interface PlaceOrderPayload {
  shipping_address_id: string;
  idempotency_key?: string;
}

export interface RazorpayOrderSession {
  razorpay_order_id: string;
  key_id: string;
  amount: number;
  currency: string;
  order_number: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
