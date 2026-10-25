import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminOverviewPage from "@/app/admin/(shell)/page";
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
    getAdminDashboardOverview: vi.fn(),
  };
});

const mockPopulatedOverview: adminApi.AdminDashboardOverview = {
  period: "30d",
  date_range: {
    start: "2026-09-15T00:00:00Z",
    end: "2026-10-15T00:00:00Z",
  },
  metrics: {
    total_orders: {
      value: 2,
      previous_value: 1,
      change_percentage: 100.0,
      definition: "Total placed orders",
      status_breakdown: { PENDING: 2 },
    },
    gross_revenue: {
      value: "3298.00",
      currency: "INR",
      previous_value: "1000.00",
      change_percentage: 229.8,
      paid_orders_count: 2,
      definition: "Monetary sum of orders where payment_status = PAID and status != CANCELLED.",
    },
    average_order_value: {
      value: "1649.00",
      currency: "INR",
      previous_value: "1000.00",
      change_percentage: 64.9,
      definition: "Gross revenue divided by count of paid, non-cancelled orders.",
    },
    low_stock_variants: {
      count: 3,
      threshold: 5,
      definition: "Count of product variants with quantity_available <= 5.",
    },
  },
  sales_overview: [
    {
      date: "2026-10-05",
      orders_count: 1,
      revenue: "799.00",
    },
    {
      date: "2026-10-09",
      orders_count: 1,
      revenue: "2499.00",
    },
  ],
  recent_orders: [
    {
      id: "ord-1",
      order_number: "CBC-2026-000002",
      created_at: "2026-10-09T17:07:33Z",
      customer_email: "mandaliasumit@gmail.com",
      total: "2499.00",
      currency: "INR",
      status: "PENDING",
      payment_status: "PAID",
      items_count: 1,
    },
    {
      id: "ord-2",
      order_number: "CBC-2026-000001",
      created_at: "2026-10-05T13:27:27Z",
      customer_email: "mandaliasumit@gmail.com",
      total: "799.00",
      currency: "INR",
      status: "PENDING",
      payment_status: "PAID",
      items_count: 1,
    },
  ],
  low_stock_alerts: [
    {
      id: "inv-1",
      variant_id: "var-1",
      sku: "SBP-KRT-GRN-M",
      product_name: "Sunflower Block Print Kurti",
      variant_label: "M / Green",
      quantity_available: 0,
      quantity_reserved: 0,
    },
    {
      id: "inv-2",
      variant_id: "var-2",
      sku: "EMB-3PC-IVR-L",
      product_name: "Ethnic Embroidered 3-Piece Suit",
      variant_label: "L / Ivory",
      quantity_available: 5,
      quantity_reserved: 0,
    },
  ],
  top_selling_products: [
    {
      product_id: "prod-1",
      product_name: "Maxi Ethnic Dress",
      units_sold: 1,
      revenue: "2499.00",
    },
    {
      product_id: "prod-2",
      product_name: "Bandhani Print Dupatta",
      units_sold: 1,
      revenue: "799.00",
    },
  ],
};

const mockEmptyOverview: adminApi.AdminDashboardOverview = {
  period: "30d",
  date_range: {
    start: "2026-09-15T00:00:00Z",
    end: "2026-10-15T00:00:00Z",
  },
  metrics: {
    total_orders: {
      value: 0,
      previous_value: null,
      change_percentage: null,
    },
    gross_revenue: {
      value: "0.00",
      currency: "INR",
      previous_value: null,
      change_percentage: null,
    },
    average_order_value: {
      value: "0.00",
      currency: "INR",
      previous_value: null,
      change_percentage: null,
    },
    low_stock_variants: {
      count: 0,
      threshold: 5,
      definition: "Count of product variants with quantity_available <= 5.",
    },
  },
  sales_overview: [],
  recent_orders: [],
  low_stock_alerts: [],
  top_selling_products: [],
};

describe("Admin Dashboard Overview Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders populated dashboard with real metric numbers, INR formatting and alert items", async () => {
    vi.mocked(adminApi.getAdminDashboardOverview).mockResolvedValue(mockPopulatedOverview);

    render(<AdminOverviewPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText("Atelier Operations Overview")).toBeInTheDocument();
      // Check KPI values
      expect(screen.getAllByText(/3,298/)[0]).toBeInTheDocument(); // Gross revenue
      expect(screen.getByText("Total Orders")).toBeInTheDocument();
      expect(screen.getByText(/1,649/)).toBeInTheDocument(); // Average order value
      expect(screen.getByText("Low-Stock Variants")).toBeInTheDocument();
    });

    // Check recent orders
    expect(screen.getByText("CBC-2026-000002")).toBeInTheDocument();
    expect(screen.getByText("CBC-2026-000001")).toBeInTheDocument();
    expect(screen.getAllByText("mandaliasumit@gmail.com")).toHaveLength(2);

    // Check low stock alerts
    expect(screen.getByText("Sunflower Block Print Kurti")).toBeInTheDocument();
    expect(screen.getByText("SBP-KRT-GRN-M")).toBeInTheDocument();
    expect(screen.getByText("0 Left")).toBeInTheDocument();
    expect(screen.getByText("5 Left")).toBeInTheDocument();

    // Check top selling curations
    expect(screen.getByText("Maxi Ethnic Dress")).toBeInTheDocument();
    expect(screen.getByText("Bandhani Print Dupatta")).toBeInTheDocument();
  });

  it("renders graceful empty states when store has no orders or inventory alerts", async () => {
    vi.mocked(adminApi.getAdminDashboardOverview).mockResolvedValue(mockEmptyOverview);

    render(<AdminOverviewPage />);

    await waitFor(() => {
      expect(screen.getByText("No orders placed yet")).toBeInTheDocument();
      expect(screen.getByText("Inventory is healthy")).toBeInTheDocument();
      expect(screen.getByText("No revenue recorded in this period")).toBeInTheDocument();
      expect(screen.getByText("No paid order items yet")).toBeInTheDocument();
    });
  });

  it("handles API error state with error notification and working retry button", async () => {
    vi.mocked(adminApi.getAdminDashboardOverview).mockRejectedValueOnce(
      new Error("Network connection lost")
    );

    render(<AdminOverviewPage />);

    await waitFor(() => {
      expect(screen.getByText("Unable to load dashboard data")).toBeInTheDocument();
      expect(screen.getByText("Network connection lost")).toBeInTheDocument();
    });

    // Now mock success on retry
    vi.mocked(adminApi.getAdminDashboardOverview).mockResolvedValue(mockPopulatedOverview);

    const retryButton = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getAllByText(/3,298/)[0]).toBeInTheDocument();
    });
  });

  it("switches period when clicking period filter buttons", async () => {
    vi.mocked(adminApi.getAdminDashboardOverview).mockResolvedValue(mockPopulatedOverview);

    render(<AdminOverviewPage />);

    await waitFor(() => {
      expect(adminApi.getAdminDashboardOverview).toHaveBeenCalledWith({ period: "30d" });
    });

    const button7d = screen.getByRole("button", { name: "7D" });
    fireEvent.click(button7d);

    await waitFor(() => {
      expect(adminApi.getAdminDashboardOverview).toHaveBeenCalledWith({ period: "7d" });
    });

    const buttonAll = screen.getByRole("button", { name: "All Time" });
    fireEvent.click(buttonAll);

    await waitFor(() => {
      expect(adminApi.getAdminDashboardOverview).toHaveBeenCalledWith({ period: "all" });
    });
  });
});
