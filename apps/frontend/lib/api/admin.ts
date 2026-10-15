import { apiFetch } from "./client";
import { supabase } from "@/lib/supabase/client";

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

