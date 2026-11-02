import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminAnalyticsPage from "@/app/admin/(shell)/analytics/page";
import * as adminApi from "@/lib/api/admin";

// Mock AdminGuard context
vi.mock("@/components/admin/AdminGuard", () => ({
  useAdminContext: () => ({
    adminUser: {
      id: "admin-uuid-1",
      email: "closetbychili@gmail.com",
      role: "admin",
      is_admin: true,
      is_staff: true,
      is_active: true,
      created_at: "2026-10-15T14:41:27Z",
    },
  }),
}));

// Mock adminApi
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminAnalytics: vi.fn(),
  };
});

const mockPopulatedAnalytics: adminApi.AdminAnalyticsData = {
  period: "30d",
  period_label: "Last 30 Days",
  granularity: "day",
  date_range: {
    current_start: "2026-09-15T00:00:00Z",
    current_end: "2026-10-15T00:00:00Z",
    previous_start: "2026-08-16T00:00:00Z",
    previous_end: "2026-09-15T00:00:00Z",
  },
  kpi_summary: {
    gross_sales: {
      value: "16000.00",
      currency: "INR",
      previous_value: "8000.00",
      change_percentage: 100.0,
      definition: "Monetary sum of catalog subtotal across paid, non-cancelled orders.",
    },
    net_revenue: {
      value: "15000.00",
      currency: "INR",
      previous_value: "7500.00",
      change_percentage: 100.0,
      definition: "Realized revenue collected from customers for successful sales.",
    },
    total_orders: {
      value: 6,
      previous_value: 3,
      change_percentage: 100.0,
      paid_orders_count: 2,
      definition: "Total count of order records created within the selected timeframe.",
    },
    average_order_value: {
      value: "7500.00",
      currency: "INR",
      previous_value: "3750.00",
      change_percentage: 100.0,
      definition: "Net revenue divided by count of paid, non-cancelled orders.",
    },
    units_sold: {
      value: 3,
      previous_value: 2,
      change_percentage: 50.0,
      definition: "Total count of physical item units purchased in confirmed paid orders.",
    },
    new_customers: {
      value: 5,
      previous_value: 2,
      change_percentage: 150.0,
      total_registered_customers: 24,
      definition: "Count of new customer accounts registered within the period.",
    },
  },
  revenue_time_series: [
    {
      date: "2026-10-05",
      revenue: "5000.00",
      gross_sales: "6000.00",
      orders_count: 1,
    },
    {
      date: "2026-10-09",
      revenue: "10000.00",
      gross_sales: "10000.00",
      orders_count: 1,
    },
  ],
  order_analytics: {
    total_orders: 6,
    paid_orders: 2,
    unpaid_orders: 2,
    cancelled_orders: {
      count: 2,
      total_value: "5000.00",
      rate_pct: 33.3,
    },
    refunded_orders: {
      count: 1,
      total_value: "2000.00",
      rate_pct: 16.7,
    },
    status_breakdown: {
      CONFIRMED: 1,
      PROCESSING: 1,
      PENDING: 2,
      CANCELLED: 2,
      DELIVERED: 0,
      SHIPPED: 0,
    },
    payment_status_breakdown: {
      PAID: 2,
      PENDING: 2,
      FAILED: 1,
      REFUNDED: 1,
    },
    payment_amount_breakdown: {
      PAID: "15000.00",
      PENDING: "6000.00",
      FAILED: "10000.00",
      REFUNDED: "2000.00",
    },
  },
  product_performance: {
    top_by_revenue: [
      {
        product_id: "prod-saree-1",
        product_name: "Royal Banarasi Saree",
        units_sold: 1,
        revenue: "10000.00",
        orders_count: 1,
      },
      {
        product_id: "prod-kurta-1",
        product_name: "Ivory Chanderi Kurta",
        units_sold: 2,
        revenue: "6000.00",
        orders_count: 1,
      },
    ],
    top_by_units: [
      {
        product_id: "prod-kurta-1",
        product_name: "Ivory Chanderi Kurta",
        units_sold: 2,
        revenue: "6000.00",
        orders_count: 1,
      },
      {
        product_id: "prod-saree-1",
        product_name: "Royal Banarasi Saree",
        units_sold: 1,
        revenue: "10000.00",
        orders_count: 1,
      },
    ],
    slow_moving: [
      {
        product_id: "prod-shawl-1",
        product_name: "Vintage Shawl",
        units_sold: 0,
        revenue: "0.00",
        available_stock: 50,
      },
    ],
  },
  category_performance: [
    {
      category_id: "cat-silk",
      category_name: "Silk Sarees",
      category_slug: "silk-sarees",
      revenue: "10000.00",
      units_sold: 1,
      orders_count: 1,
      contribution_percentage: 62.5,
    },
    {
      category_id: "cat-cotton",
      category_name: "Chanderi Kurtas",
      category_slug: "chanderi-kurtas",
      revenue: "6000.00",
      units_sold: 2,
      orders_count: 1,
      contribution_percentage: 37.5,
    },
  ],
  customer_analytics: {
    total_registered_customers: 24,
    new_registered_customers: 5,
    customer_growth_trend: [
      { date: "2026-10-01", count: 2 },
      { date: "2026-10-08", count: 3 },
    ],
    ordering_behavior: {
      total_unique_buyers: 2,
      returning_buyers_count: 1,
      returning_buyers_percentage: 50.0,
      first_time_buyers_count: 1,
      first_time_buyers_percentage: 50.0,
    },
  },
};

describe("Admin Analytics & Business Intelligence Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the analytics page header and date range controls", async () => {
    vi.mocked(adminApi.getAdminAnalytics).mockResolvedValue(mockPopulatedAnalytics);

    render(<AdminAnalyticsPage />);

    expect(screen.getByText("Analytics & Business Intelligence")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Actionable revenue velocity, merchandising turnover, order fulfillment, and patron acquisition insights."
      )
    ).toBeInTheDocument();

    // Check presets are rendered
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last 7 Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last 30 Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last 90 Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "This Month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last Month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom Range" })).toBeInTheDocument();
  });

  it("fetches and renders all 6 KPI cards with formatted values and deltas", async () => {
    vi.mocked(adminApi.getAdminAnalytics).mockResolvedValue(mockPopulatedAnalytics);

    render(<AdminAnalyticsPage />);

    await waitFor(() => {
      // KPI Titles
      expect(screen.getByText("Gross Sales")).toBeInTheDocument();
      expect(screen.getByText("Net Revenue")).toBeInTheDocument();
      expect(screen.getByText("Total Orders")).toBeInTheDocument();
      expect(screen.getByText("Average Order Value")).toBeInTheDocument();
      expect(screen.getAllByText("Units Sold")[0]).toBeInTheDocument();
      expect(screen.getByText("New Customers")).toBeInTheDocument();

      // Formatted Values in INR
      expect(screen.getByText("₹16,000.00")).toBeInTheDocument();
      expect(screen.getAllByText("₹15,000.00")[0]).toBeInTheDocument();
      expect(screen.getByText("₹7,500.00")).toBeInTheDocument();
    });
  });

  it("renders revenue trend, order breakdowns, product performance, categories, and customer insights", async () => {
    vi.mocked(adminApi.getAdminAnalytics).mockResolvedValue(mockPopulatedAnalytics);

    render(<AdminAnalyticsPage />);

    await waitFor(() => {
      // Revenue Chart Section
      expect(screen.getByText("Revenue & Sales Velocity")).toBeInTheDocument();

      // Order Status Section
      expect(screen.getByText("Order Status & Fulfillment")).toBeInTheDocument();
      expect(screen.getByText("Payment & Attrition Insights")).toBeInTheDocument();
      expect(screen.getByText("Cancelled Orders")).toBeInTheDocument();
      expect(screen.getByText("Refunded Orders")).toBeInTheDocument();

      // Product Performance Section
      expect(screen.getByText("Product & Silhouette Performance")).toBeInTheDocument();
      expect(screen.getByText("Royal Banarasi Saree")).toBeInTheDocument();
      expect(screen.getByText("Ivory Chanderi Kurta")).toBeInTheDocument();

      // Category Section
      expect(screen.getByText("Category Contribution & Taxonomy Velocity")).toBeInTheDocument();
      expect(screen.getAllByText("Silk Sarees")[0]).toBeInTheDocument();
      expect(screen.getByText("Chanderi Kurtas")).toBeInTheDocument();
      expect(screen.getByText("62.5% Share")).toBeInTheDocument();

      // Customer Section
      expect(screen.getByText("Patron Intelligence & Acquisition")).toBeInTheDocument();
      expect(screen.getByText("Returning Patrons")).toBeInTheDocument();
      expect(screen.getByText("First-Time Buyers")).toBeInTheDocument();
    });
  });

  it("allows switching period presets and re-fetching data", async () => {
    vi.mocked(adminApi.getAdminAnalytics).mockResolvedValue(mockPopulatedAnalytics);

    render(<AdminAnalyticsPage />);

    await waitFor(() => {
      expect(adminApi.getAdminAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ period: "30d" })
      );
    });

    // Click "Last 7 Days"
    const last7Btn = screen.getByRole("button", { name: "Last 7 Days" });
    fireEvent.click(last7Btn);

    await waitFor(() => {
      expect(adminApi.getAdminAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ period: "7d" })
      );
    });
  });

  it("handles product performance tab switching between Revenue, Units, and Slow-Moving", async () => {
    vi.mocked(adminApi.getAdminAnalytics).mockResolvedValue(mockPopulatedAnalytics);

    render(<AdminAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("Royal Banarasi Saree")).toBeInTheDocument();
    });

    // Click "Slow-Moving" tab
    const slowTab = screen.getByRole("button", { name: /slow-moving/i });
    fireEvent.click(slowTab);

    await waitFor(() => {
      expect(screen.getByText("Vintage Shawl")).toBeInTheDocument();
      expect(screen.getByText("50 in stock")).toBeInTheDocument();
    });
  });

  it("handles API error state with retry action", async () => {
    vi.mocked(adminApi.getAdminAnalytics).mockRejectedValueOnce(
      new Error("Network connection lost")
    );

    render(<AdminAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("Analytics Data Error")).toBeInTheDocument();
      expect(screen.getByText("Network connection lost")).toBeInTheDocument();
    });

    // Mock recovery on retry
    vi.mocked(adminApi.getAdminAnalytics).mockResolvedValueOnce(mockPopulatedAnalytics);

    const retryBtn = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("₹16,000.00")).toBeInTheDocument();
    });
  });
});
