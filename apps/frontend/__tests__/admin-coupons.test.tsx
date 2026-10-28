import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminCouponsClient from "@/components/admin/coupons/AdminCouponsClient";
import AdminCouponFormModal from "@/components/admin/coupons/AdminCouponFormModal";
import AdminCouponToggleModal from "@/components/admin/coupons/AdminCouponToggleModal";
import AdminCouponDetailDrawer from "@/components/admin/coupons/AdminCouponDetailDrawer";
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
    getAdminCoupons: vi.fn(),
    getAdminCouponDetail: vi.fn(),
    getAdminCouponRedemptions: vi.fn().mockResolvedValue({ count: 0, next: null, previous: null, results: [] }),
    createAdminCoupon: vi.fn(),
    updateAdminCoupon: vi.fn(),
    activateAdminCoupon: vi.fn(),
    deactivateAdminCoupon: vi.fn(),
  };
});

// Mock catalog APIs
vi.mock("@/lib/api/catalog", () => ({
  getProducts: vi.fn().mockResolvedValue({
    count: 2,
    results: [
      { id: "prod-1", name: "Anarkali Kurti", slug: "anarkali-kurti" },
      { id: "prod-2", name: "Floral Summer Dress", slug: "floral-summer-dress" },
    ],
  }),
  getCategories: vi.fn().mockResolvedValue({
    count: 2,
    results: [
      { id: "cat-1", name: "Kurtis", slug: "kurtis", is_active: true },
      { id: "cat-2", name: "Western Wear", slug: "western-wear", is_active: true },
    ],
  }),
  getCollections: vi.fn().mockResolvedValue({
    count: 2,
    results: [
      { id: "col-1", name: "Festive 2026", slug: "festive-2026", is_active: true },
      { id: "col-2", name: "Summer Glow", slug: "summer-glow", is_active: true },
    ],
  }),
}));

const mockCoupons: adminApi.AdminCoupon[] = [
  {
    id: "coup-1111-2222-3333",
    code: "FESTIVE25",
    name: "Festive Season 25% Off",
    description: "25% off festive ensembles",
    discount_type: "PERCENTAGE",
    discount_value: "25.00",
    currency: "INR",
    targeting_mode: "ALL_PRODUCTS",
    target_summary: "All Products",
    min_order_subtotal: "2000.00",
    max_discount_amount: "1500.00",
    start_date: "2026-10-20T00:00:00Z",
    end_date: "2026-11-15T23:59:59Z",
    is_active: true,
    lifecycle_status: "CURRENTLY_VALID",
    usage_limit: 500,
    per_customer_limit: 1,
    is_first_order_only: false,
    usage_count: null,
    created_at: "2026-10-20T10:00:00Z",
    updated_at: "2026-10-20T10:00:00Z",
    created_by_email: "admin@closetbychilli.com",
    updated_by_email: "admin@closetbychilli.com",
  },
  {
    id: "coup-4444-5555-6666",
    code: "FLAT500",
    name: "Flat ₹500 Off",
    description: "Flat ₹500 off luxury pret",
    discount_type: "FIXED_AMOUNT",
    discount_value: "500.00",
    currency: "INR",
    targeting_mode: "ALL_PRODUCTS",
    target_summary: "All Products",
    min_order_subtotal: "2500.00",
    max_discount_amount: null,
    start_date: "2026-10-22T00:00:00Z",
    end_date: null,
    is_active: true,
    lifecycle_status: "CURRENTLY_VALID",
    usage_limit: null,
    per_customer_limit: null,
    is_first_order_only: true,
    usage_count: null,
    created_at: "2026-10-22T10:00:00Z",
    updated_at: "2026-10-22T10:00:00Z",
    created_by_email: "admin@closetbychilli.com",
    updated_by_email: null,
  },
];

const mockCouponsResponse = {
  count: 2,
  next: null,
  previous: null,
  results: mockCoupons,
};

describe("Admin Coupon Management (Sprint A5.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    vi.mocked(adminApi.getAdminCoupons).mockResolvedValue(mockCouponsResponse);
  });

  it("renders coupon listing table, summary metrics, and headers", async () => {
    render(<AdminCouponsClient />);

    expect(screen.getByText(/Coupons & Promotions/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("FESTIVE25")).toBeInTheDocument();
      expect(screen.getByText("FLAT500")).toBeInTheDocument();
      expect(screen.getByText("Festive Season 25% Off")).toBeInTheDocument();
      expect(screen.getByText("Flat ₹500 Off")).toBeInTheDocument();
    });

    // Check discount representations
    expect(screen.getByText("25% OFF")).toBeInTheDocument();
    expect(screen.getByText("1st Order Only")).toBeInTheDocument();
  });

  it("updates URL parameters on search and filter selections", async () => {
    render(<AdminCouponsClient />);

    await waitFor(() => {
      expect(screen.getByText("FESTIVE25")).toBeInTheDocument();
    });

    // Search input
    const searchInput = screen.getByPlaceholderText(/Search by coupon code/i);
    fireEvent.change(searchInput, { target: { value: "FESTIVE" } });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("search=FESTIVE"),
      expect.anything()
    );

    // Lifecycle filter select
    const lifecycleSelect = screen.getByLabelText(/Filter by lifecycle status/i);
    fireEvent.change(lifecycleSelect, { target: { value: "currently_valid" } });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("lifecycle=currently_valid"),
      expect.anything()
    );

    // Discount type select
    const typeSelect = screen.getByLabelText(/Filter by discount type/i);
    fireEvent.change(typeSelect, { target: { value: "PERCENTAGE" } });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("discount_type=PERCENTAGE"),
      expect.anything()
    );
  });

  it("renders empty state when no coupons match filters", async () => {
    vi.mocked(adminApi.getAdminCoupons).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<AdminCouponsClient />);

    await waitFor(() => {
      expect(screen.getByText("No coupons found")).toBeInTheDocument();
    });
  });

  it("renders error state and provides retry action on API failure", async () => {
    vi.mocked(adminApi.getAdminCoupons).mockRejectedValueOnce(
      new Error("Network connection lost")
    );

    render(<AdminCouponsClient />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load coupons")).toBeInTheDocument();
      expect(screen.getByText("Network connection lost")).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /Try Again/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(adminApi.getAdminCoupons).toHaveBeenCalledTimes(2);
    });
  });

  it("validates form fields and handles server validation errors in form modal", async () => {
    const mockSubmit = vi.fn().mockRejectedValue({
      status: 400,
      message: "Validation failed",
      details: {
        code: ["A coupon with code 'DUPLICATE' already exists."],
      },
    });
    const mockClose = vi.fn();

    render(
      <AdminCouponFormModal
        isOpen={true}
        onClose={mockClose}
        onSubmit={mockSubmit}
      />
    );

    expect(screen.getByText("Create New Promotional Coupon")).toBeInTheDocument();

    const codeInput = screen.getByPlaceholderText("e.g. SUMMER25");
    const nameInput = screen.getByPlaceholderText("e.g. Summer Atelier Launch 2026");
    const discountInput = screen.getByPlaceholderText("e.g. 20.00");

    fireEvent.change(codeInput, { target: { value: "DUPLICATE" } });
    fireEvent.change(nameInput, { target: { value: "Duplicate Promo" } });
    fireEvent.change(discountInput, { target: { value: "15.00" } });

    const submitBtn = screen.getByRole("button", { name: /Create Coupon/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText("A coupon with code 'DUPLICATE' already exists.")
      ).toBeInTheDocument();
    });
  });

  it("protects against duplicate submission in form modal", async () => {
    let resolveSubmit: () => void = () => {};
    const mockSubmit = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );

    render(
      <AdminCouponFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
      />
    );

    const codeInput = screen.getByPlaceholderText("e.g. SUMMER25");
    const nameInput = screen.getByPlaceholderText("e.g. Summer Atelier Launch 2026");
    const discountInput = screen.getByPlaceholderText("e.g. 20.00");

    fireEvent.change(codeInput, { target: { value: "FASTCLICK" } });
    fireEvent.change(nameInput, { target: { value: "Fast Click Campaign" } });
    fireEvent.change(discountInput, { target: { value: "10.00" } });

    const submitBtn = screen.getByRole("button", { name: /Create Coupon/i });
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Saving...")).toBeInTheDocument();

    resolveSubmit();
  });

  it("handles activation and deactivation confirmation modal", async () => {
    const mockConfirm = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    // Test Deactivating an active coupon
    const { rerender } = render(
      <AdminCouponToggleModal
        isOpen={true}
        coupon={mockCoupons[0]} // active
        isLoading={false}
        onClose={mockClose}
        onConfirm={mockConfirm}
      />
    );

    expect(screen.getByText("Deactivate Coupon")).toBeInTheDocument();
    expect(
      screen.getByText(/Deactivating will immediately render this coupon invalid/i)
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /Confirm Deactivation/i });
    fireEvent.click(confirmBtn);
    expect(mockConfirm).toHaveBeenCalledTimes(1);

    // Test Activating an inactive coupon
    const inactiveCoupon: adminApi.AdminCoupon = {
      ...mockCoupons[0],
      is_active: false,
      lifecycle_status: "INACTIVE",
    };

    rerender(
      <AdminCouponToggleModal
        isOpen={true}
        coupon={inactiveCoupon}
        isLoading={false}
        onClose={mockClose}
        onConfirm={mockConfirm}
      />
    );

    expect(screen.getByText("Activate Coupon")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Confirm Activation/i })
    ).toBeInTheDocument();
  });

  it("loads and displays coupon detail and audit trail in drawer", async () => {
    const mockDetail: adminApi.AdminCouponDetail = {
      ...mockCoupons[0],
      applicable_products: [],
      applicable_categories: [],
      applicable_collections: [],
      audit_logs: [
        {
          id: "log-1",
          event_type: "CREATED",
          actor_email: "admin@closetbychilli.com",
          notes: "Coupon FESTIVE25 created.",
          metadata: {},
          created_at: "2026-10-20T10:00:00Z",
        },
      ],
    };

    vi.mocked(adminApi.getAdminCouponDetail).mockResolvedValue(mockDetail);

    render(
      <AdminCouponDetailDrawer
        isOpen={true}
        couponId="coup-1111-2222-3333"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onToggleStatus={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(adminApi.getAdminCouponDetail).toHaveBeenCalledWith("coup-1111-2222-3333");
      expect(screen.getByText("Coupon FESTIVE25 created.")).toBeInTheDocument();
      expect(screen.getAllByText("admin@closetbychilli.com").length).toBeGreaterThan(0);
    });
  });

  it("handles targeting mode selection and validation for specific targets", async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AdminCouponFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
      />
    );

    // Initial state: ALL_PRODUCTS storewide coupon banner visible
    expect(screen.getByText("Storewide Coupon")).toBeInTheDocument();

    // Select SPECIFIC_PRODUCTS mode
    const modeSelect = screen.getByLabelText(/Targeting Mode/i);
    fireEvent.change(modeSelect, { target: { value: "SPECIFIC_PRODUCTS" } });

    // Target Products section should now be visible with 0 selected
    expect(screen.getByText(/Target Products \(0 selected\)/i)).toBeInTheDocument();

    // Fill valid base fields
    fireEvent.change(screen.getByPlaceholderText("e.g. SUMMER25"), {
      target: { value: "PRODCOUPON" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Summer Atelier Launch 2026"), {
      target: { value: "Product Specific Promo" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 20.00"), {
      target: { value: "20.00" },
    });

    // Attempt submit with 0 targets
    fireEvent.click(screen.getByRole("button", { name: /Create Coupon/i }));

    // Client-side targeting error
    expect(
      screen.getByText("At least one product must be selected for Specific Products targeting.")
    ).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("allows searching, selecting, and removing product targets", async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AdminCouponFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={mockSubmit}
      />
    );

    // Select SPECIFIC_PRODUCTS mode
    const modeSelect = screen.getByLabelText(/Targeting Mode/i);
    fireEvent.change(modeSelect, { target: { value: "SPECIFIC_PRODUCTS" } });

    // Focus product search input to trigger options
    const searchInput = screen.getByPlaceholderText(/Search products by title or slug/i);
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "Anarkali" } });

    // Wait for product option from mocked catalog API
    await waitFor(() => {
      expect(screen.getByText("Anarkali Kurti")).toBeInTheDocument();
    });

    // Select the product
    fireEvent.click(screen.getByText("Anarkali Kurti"));

    // Verify product chip is displayed
    expect(screen.getByText(/Target Products \(1 selected\)/i)).toBeInTheDocument();
    const removeBtn = screen.getByLabelText("Remove Anarkali Kurti");
    expect(removeBtn).toBeInTheDocument();

    // Remove the product chip
    fireEvent.click(removeBtn);
    expect(screen.getByText(/Target Products \(0 selected\)/i)).toBeInTheDocument();
  });

  it("hydrates existing targets in edit mode", async () => {
    const targetedCoupon: adminApi.AdminCoupon = {
      ...mockCoupons[0],
      id: "coup-target-test",
      code: "TARGETED10",
      name: "Targeted Kurti Promo",
      targeting_mode: "SPECIFIC_PRODUCTS",
    };

    const targetedDetail: adminApi.AdminCouponDetail = {
      ...targetedCoupon,
      applicable_products: [
        {
          id: "prod-1",
          name: "Anarkali Kurti",
          slug: "anarkali-kurti",
          status: "active",
          is_active: true,
        },
      ],
      applicable_categories: [],
      applicable_collections: [],
      audit_logs: [],
    };

    vi.mocked(adminApi.getAdminCouponDetail).mockResolvedValue(targetedDetail);

    render(
      <AdminCouponFormModal
        isOpen={true}
        couponToEdit={targetedCoupon}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    // Should fetch coupon detail for target hydration
    await waitFor(() => {
      expect(adminApi.getAdminCouponDetail).toHaveBeenCalledWith("coup-target-test");
      expect(screen.getByText("Anarkali Kurti")).toBeInTheDocument();
      expect(screen.getByText(/Target Products \(1 selected\)/i)).toBeInTheDocument();
    });
  });

  it("displays targeting scope and chips in detail drawer", async () => {
    const mockDetail: adminApi.AdminCouponDetail = {
      ...mockCoupons[0],
      targeting_mode: "MIXED",
      applicable_products: [
        { id: "prod-1", name: "Anarkali Kurti", slug: "anarkali-kurti" },
      ],
      applicable_categories: [
        { id: "cat-1", name: "Kurtis", slug: "kurtis" },
      ],
      applicable_collections: [
        { id: "col-1", name: "Festive 2026", slug: "festive-2026" },
      ],
      audit_logs: [],
    };

    vi.mocked(adminApi.getAdminCouponDetail).mockResolvedValue(mockDetail);

    render(
      <AdminCouponDetailDrawer
        isOpen={true}
        couponId="coup-1111-2222-3333"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onToggleStatus={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Catalog Targeting & Scope")).toBeInTheDocument();
      expect(screen.getByText("MIXED")).toBeInTheDocument();
      expect(screen.getByText("Anarkali Kurti")).toBeInTheDocument();
      expect(screen.getByText("Kurtis")).toBeInTheDocument();
      expect(screen.getByText("Festive 2026")).toBeInTheDocument();
    });
  });

  it("displays accurate usage capacity metrics and redemption history in drawer", async () => {
    const mockDetail: adminApi.AdminCouponDetail = {
      ...mockCoupons[0],
      total_redemptions: 12,
      remaining_capacity: 488,
      active_reservations_count: 2,
      applicable_products: [],
      applicable_categories: [],
      applicable_collections: [],
      audit_logs: [],
    };

    const mockRedemptions: adminApi.AdminCouponRedemption[] = [
      {
        id: "red-1",
        coupon_id: "coup-1111-2222-3333",
        coupon_code: "FESTIVE25",
        coupon_name: "Festive Season 25% Off",
        customer_id: "cust-1",
        customer_email_masked: "c***1@example.com",
        customer_display: "First Customer",
        order_id: "ord-1",
        order_number: "ORD-998877",
        state: "REDEEMED",
        discount_amount: "450.00",
        currency: "INR",
        idempotency_key: "tok-1",
        reserved_at: "2026-10-25T10:00:00Z",
        expires_at: null,
        finalized_at: "2026-10-25T10:15:00Z",
        released_at: null,
        release_reason: "",
        created_at: "2026-10-25T10:00:00Z",
        updated_at: "2026-10-25T10:15:00Z",
      },
      {
        id: "red-2",
        coupon_id: "coup-1111-2222-3333",
        coupon_code: "FESTIVE25",
        coupon_name: "Festive Season 25% Off",
        customer_id: "cust-2",
        customer_email_masked: "c***2@example.com",
        customer_display: "Second Customer",
        order_id: null,
        order_number: null,
        state: "RESERVED",
        discount_amount: "0.00",
        currency: "INR",
        idempotency_key: "tok-2",
        reserved_at: "2026-10-26T12:00:00Z",
        expires_at: "2026-10-26T12:15:00Z",
        finalized_at: null,
        released_at: null,
        release_reason: "",
        created_at: "2026-10-26T12:00:00Z",
        updated_at: "2026-10-26T12:00:00Z",
      },
    ];

    vi.mocked(adminApi.getAdminCouponDetail).mockResolvedValue(mockDetail);
    vi.mocked(adminApi.getAdminCouponRedemptions).mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: mockRedemptions,
    });

    render(
      <AdminCouponDetailDrawer
        isOpen={true}
        couponId="coup-1111-2222-3333"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onToggleStatus={vi.fn()}
      />
    );

    await waitFor(() => {
      // Usage and Capacity metrics
      expect(screen.getByText("Usage & Capacity")).toBeInTheDocument();
      expect(screen.getByText("Finalized Redemptions")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
      expect(screen.getByText("Remaining Capacity")).toBeInTheDocument();
      expect(screen.getByText("488")).toBeInTheDocument();

      // Redemptions history
      expect(screen.getByText("Redemption History (2)")).toBeInTheDocument();
      expect(screen.getByText("ORD-998877")).toBeInTheDocument();
      expect(screen.getByText("c***1@example.com")).toBeInTheDocument();
      expect(screen.getByText("c***2@example.com")).toBeInTheDocument();
      expect(screen.getAllByText("Finalized").length).toBeGreaterThan(0);
      expect(screen.getByText("Reserved (In Checkout)")).toBeInTheDocument();
    });
  });

  it("handles empty redemption history and state filtering", async () => {
    const mockDetail: adminApi.AdminCouponDetail = {
      ...mockCoupons[0],
      total_redemptions: 0,
      remaining_capacity: 500,
      applicable_products: [],
      applicable_categories: [],
      applicable_collections: [],
      audit_logs: [],
    };

    vi.mocked(adminApi.getAdminCouponDetail).mockResolvedValue(mockDetail);
    vi.mocked(adminApi.getAdminCouponRedemptions).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(
      <AdminCouponDetailDrawer
        isOpen={true}
        couponId="coup-1111-2222-3333"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onToggleStatus={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Redemption History (0)")).toBeInTheDocument();
      expect(screen.getByText("No redemptions found under this filter.")).toBeInTheDocument();
    });

    // Click filter button for "Finalized"
    const finalizedFilterBtn = screen.getByRole("button", { name: "Finalized" });
    fireEvent.click(finalizedFilterBtn);

    await waitFor(() => {
      expect(adminApi.getAdminCouponRedemptions).toHaveBeenCalledWith("coup-1111-2222-3333", {
        state: "REDEEMED",
        page_size: 20,
      });
    });
  });
});

