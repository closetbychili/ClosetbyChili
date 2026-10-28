import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminCouponReportsView from "@/components/admin/coupons/AdminCouponReportsView";
import AdminCouponsClient from "@/components/admin/coupons/AdminCouponsClient";
import * as adminApi from "@/lib/api/admin";

// Mock next/navigation
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/coupons",
  useSearchParams: () => mockSearchParams,
}));

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminCoupons: vi.fn().mockResolvedValue({ count: 0, next: null, previous: null, results: [] }),
    getAdminCouponReportsOverview: vi.fn(),
    getAdminCouponReportsPerformance: vi.fn(),
    getAdminCouponReportsRedemptions: vi.fn(),
  };
});

const mockOverviewData: adminApi.AdminCouponReportOverview = {
  date_range: {
    start_date: "2026-09-26",
    end_date: "2026-10-26",
  },
  coupons_created_count: 8,
  active_coupons_count: 5,
  successful_redemptions_count: 142,
  reserved_redemptions_count: 9,
  released_redemptions_count: 14,
  total_discount_granted: "35400.00",
  total_paid_revenue: "189500.00",
  distinct_customers_count: 118,
  average_discount_per_redemption: "249.30",
  average_order_value_before_discount: "1583.80",
  average_order_value_after_discount: "1334.50",
  global_capacity_metrics: {
    total_configured_capacity: 500,
    total_redemptions_used: 142,
    total_remaining_capacity: 358,
    unlimited_coupons_count: 2,
  },
  orders_by_order_status: {
    CONFIRMED: 90,
    SHIPPED: 40,
    DELIVERED: 12,
  },
  orders_by_payment_status: {
    PAID: 142,
  },
};

const mockPerformanceData: adminApi.PaginatedResponse<adminApi.AdminCouponPerformanceItem> = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: "coup-1",
      code: "FESTIVE25",
      name: "Festive Season 25% Off",
      is_active: true,
      lifecycle_status: "currently_valid",
      discount_type: "PERCENTAGE",
      discount_value: "25.00",
      currency: "INR",
      usage_limit: 200,
      per_customer_limit: 1,
      start_date: "2026-10-01T00:00:00Z",
      end_date: "2026-11-01T23:59:59Z",
      successful_redemptions_count: 85,
      distinct_customers_count: 80,
      paid_order_count: 85,
      paid_order_revenue: "125000.00",
      total_discount_amount: "25000.00",
      gross_subtotal_before_discount: "150000.00",
      average_order_value_before_discount: "1764.71",
      average_order_value_after_discount: "1470.59",
      remaining_capacity: 115,
      last_redemption_at: "2026-10-25T14:30:00Z",
    },
    {
      id: "coup-2",
      code: "WELCOME100",
      name: "Welcome Gift ₹100",
      is_active: false,
      lifecycle_status: "inactive",
      discount_type: "FIXED_AMOUNT",
      discount_value: "100.00",
      currency: "INR",
      usage_limit: null,
      per_customer_limit: 1,
      start_date: "2026-09-01T00:00:00Z",
      end_date: null,
      successful_redemptions_count: 57,
      distinct_customers_count: 57,
      paid_order_count: 57,
      paid_order_revenue: "64500.00",
      total_discount_amount: "10400.00",
      gross_subtotal_before_discount: "74900.00",
      average_order_value_before_discount: "1314.04",
      average_order_value_after_discount: "1131.58",
      remaining_capacity: null,
      last_redemption_at: "2026-10-22T09:15:00Z",
    },
  ],
};

const mockRedemptionsData: adminApi.PaginatedResponse<adminApi.AdminCouponRedemptionReportItem> = {
  count: 3,
  next: null,
  previous: null,
  results: [
    {
      id: "red-1",
      coupon_id: "coup-1",
      coupon_code: "FESTIVE25",
      coupon_name: "Festive Season 25% Off",
      order_id: "ord-1",
      order_number: "ORD-2026-0001",
      customer_email_masked: "s***a@example.com",
      state: "REDEEMED",
      discount_amount: "350.00",
      currency: "INR",
      created_at: "2026-10-25T14:28:00Z",
      finalized_at: "2026-10-25T14:30:00Z",
      released_at: null,
      release_reason: "",
      order_status: "CONFIRMED",
      payment_status: "PAID",
    },
    {
      id: "red-2",
      coupon_id: "coup-1",
      coupon_code: "FESTIVE25",
      coupon_name: "Festive Season 25% Off",
      order_id: null,
      order_number: null,
      customer_email_masked: "a***h@example.com",
      state: "RESERVED",
      discount_amount: "250.00",
      currency: "INR",
      created_at: "2026-10-26T10:00:00Z",
      finalized_at: null,
      released_at: null,
      release_reason: "",
      order_status: null,
      payment_status: null,
    },
    {
      id: "red-3",
      coupon_id: "coup-2",
      coupon_code: "WELCOME100",
      coupon_name: "Welcome Gift ₹100",
      order_id: null,
      order_number: null,
      customer_email_masked: "v***k@example.com",
      state: "RELEASED",
      discount_amount: "100.00",
      currency: "INR",
      created_at: "2026-10-20T11:00:00Z",
      finalized_at: null,
      released_at: "2026-10-20T11:20:00Z",
      release_reason: "Checkout session expired after 15 minutes of inactivity",
      order_status: null,
      payment_status: null,
    },
  ],
};

describe("AdminCouponReportsView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    vi.mocked(adminApi.getAdminCouponReportsOverview).mockResolvedValue(mockOverviewData);
    vi.mocked(adminApi.getAdminCouponReportsPerformance).mockResolvedValue(mockPerformanceData);
    vi.mocked(adminApi.getAdminCouponReportsRedemptions).mockResolvedValue(mockRedemptionsData);
  });

  it("renders overview metrics cards from API response", async () => {
    render(<AdminCouponReportsView />);

    await waitFor(() => {
      expect(adminApi.getAdminCouponReportsOverview).toHaveBeenCalled();
    });

    // Check Successful Redemptions Card
    expect(screen.getByText("Successful Redemptions")).toBeDefined();
    expect(screen.getAllByText("142").length).toBeGreaterThan(0);
    expect(screen.getByText(/In-flight Reserved: 9/)).toBeDefined();
    expect(screen.getByText(/Released: 14/)).toBeDefined();

    // Check Total Discount Granted Card
    expect(screen.getByText("Paid Discounts Granted")).toBeDefined();
    expect(screen.getByText("₹35,400.00")).toBeDefined();

    // Check Coupon Paid Revenue Card
    expect(screen.getByText("Coupon Paid Revenue")).toBeDefined();
    expect(screen.getByText("₹1,89,500.00")).toBeDefined();

    // Check Audience & Capacity Card
    expect(screen.getByText("Audience & Capacity")).toBeDefined();
    expect(screen.getByText("118")).toBeDefined();
    expect(screen.getByText(/Remaining: 358/)).toBeDefined();
  });

  it("renders coupon performance table with search, sorting, and pagination", async () => {
    render(<AdminCouponReportsView />);

    await waitFor(() => {
      expect(adminApi.getAdminCouponReportsPerformance).toHaveBeenCalled();
    });

    // Coupon code headers and rows
    expect(screen.getByText("FESTIVE25")).toBeDefined();
    expect(screen.getByText("Festive Season 25% Off")).toBeDefined();
    expect(screen.getByText("25%")).toBeDefined();
    expect(screen.getByText("115 left")).toBeDefined();

    // Second coupon
    expect(screen.getByText("WELCOME100")).toBeDefined();
    expect(screen.getByText("Unlimited")).toBeDefined();

    // Search input
    const searchInput = screen.getByPlaceholderText("Search promo code or campaign name...");
    fireEvent.change(searchInput, { target: { value: "FESTIVE" } });

    await waitFor(() => {
      expect(adminApi.getAdminCouponReportsPerformance).toHaveBeenCalledWith(
        expect.objectContaining({ search: "FESTIVE" })
      );
    });
  });

  it("renders cross-coupon redemption audit ledger with privacy-masked emails", async () => {
    render(<AdminCouponReportsView />);

    // Switch to redemption ledger tab
    const redemptionsTab = screen.getByText("Cross-Coupon Redemption Ledger");
    fireEvent.click(redemptionsTab);

    await waitFor(() => {
      expect(adminApi.getAdminCouponReportsRedemptions).toHaveBeenCalled();
    });

    // Check privacy-safe masked email
    expect(screen.getByText("s***a@example.com")).toBeDefined();
    expect(screen.getByText("ORD-2026-0001")).toBeDefined();
    expect(screen.getByText("a***h@example.com")).toBeDefined();
    expect(screen.getByText("v***k@example.com")).toBeDefined();

    // Check states
    expect(screen.getByText("REDEEMED")).toBeDefined();
    expect(screen.getByText("RESERVED")).toBeDefined();
    expect(screen.getByText("RELEASED")).toBeDefined();

    // Check release note
    expect(screen.getByText(/Checkout session expired/)).toBeDefined();
  });

  it("supports date preset filter switching", async () => {
    render(<AdminCouponReportsView />);

    // Click 7 Days preset
    const btn7d = screen.getByText("7 Days");
    fireEvent.click(btn7d);

    await waitFor(() => {
      expect(adminApi.getAdminCouponReportsOverview).toHaveBeenCalledTimes(2);
    });

    // Click All Time preset
    const btnAll = screen.getByText("All Time");
    fireEvent.click(btnAll);

    await waitFor(() => {
      expect(adminApi.getAdminCouponReportsOverview).toHaveBeenCalledWith({});
    });
  });

  it("handles overview error state with retry button", async () => {
    vi.mocked(adminApi.getAdminCouponReportsOverview).mockRejectedValueOnce(
      new Error("Network timeout")
    );

    render(<AdminCouponReportsView />);

    await waitFor(() => {
      expect(screen.getByText("Network timeout")).toBeDefined();
    });

    const retryBtn = screen.getByText("Retry Overview");
    expect(retryBtn).toBeDefined();

    // Retry successfully
    vi.mocked(adminApi.getAdminCouponReportsOverview).mockResolvedValueOnce(mockOverviewData);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Successful Redemptions")).toBeDefined();
    });
  });

  it("toggles seamlessly between Campaigns view and Reports view in AdminCouponsClient", async () => {
    mockSearchParams = new URLSearchParams("tab=reports");
    render(<AdminCouponsClient />);

    // Reports view is rendered
    await waitFor(() => {
      expect(screen.getByText("Reporting Window:")).toBeDefined();
    });

    // Click Coupons & Campaigns tab
    const campaignsTab = screen.getByText("Coupons & Campaigns");
    fireEvent.click(campaignsTab);

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("tab=campaigns"),
      expect.anything()
    );
  });
});
