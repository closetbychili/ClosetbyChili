import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminInventoryDetailClient from "@/components/admin/inventory/AdminInventoryDetailClient";
import * as adminApi from "@/lib/api/admin";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/inventory/var-123",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminInventoryDetail: vi.fn(),
    getAdminInventoryMovements: vi.fn(),
    adjustInventoryStock: vi.fn(),
  };
});

const mockDetail: adminApi.AdminInventoryDetail = {
  id: "inv-item-1",
  variant_id: "var-123",
  product_id: "prod-456",
  product_name: "Zari Silk Kurta",
  product_slug: "zari-silk-kurta",
  product_status: "active",
  product_is_active: true,
  category_name: "Kurtas",
  category_id: "cat-1",
  thumbnail_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  sku: "ZSK-RED-M",
  size: "M",
  color: "Crimson",
  variant_title: "M / Crimson",
  retail_price: "4999.00",
  sale_price: null,
  is_active: true,
  quantity_on_hand: 25,
  quantity_reserved: 5,
  quantity_available: 20,
  stock_status: "in_stock",
  stock_status_label: "In Stock",
  low_stock_threshold: 5,
  is_low_stock: false,
  is_out_of_stock: false,
  is_alert_acknowledged: false,
  alert_acknowledged_at: null,
  images: [
    {
      id: "img-1",
      image_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      is_primary: true,
      ordering: 0,
    },
  ],
  recent_movements: [],
  last_movement_at: "2026-10-24T10:00:00Z",
  last_movement: null,
  created_at: "2026-10-24T09:00:00Z",
  updated_at: "2026-10-24T10:00:00Z",
};

const mockMovementsResponse = {
  count: 3,
  next: null,
  previous: null,
  results: [
    {
      id: "mov-1",
      movement_type: "manual_adjustment",
      movement_type_display: "Manual Adjustment",
      is_manual: true,
      quantity_change: 10,
      reason_code: "received_stock",
      reason_display: "Received Stock",
      note: "Batch #100 Supplier",
      resulting_quantity: 25,
      actor_email: "admin@closetbychilli.com",
      reference: "Batch #100",
      created_at: "2026-10-24T10:00:00Z",
    },
    {
      id: "mov-2",
      movement_type: "manual_adjustment",
      movement_type_display: "Manual Adjustment",
      is_manual: true,
      quantity_change: -2,
      reason_code: "damaged_goods",
      reason_display: "Damaged Goods",
      note: "Shelf accident",
      resulting_quantity: 15,
      actor_email: "admin@closetbychilli.com",
      reference: "Inspection",
      created_at: "2026-10-24T09:30:00Z",
    },
    {
      id: "mov-3",
      movement_type: "order_reserved",
      movement_type_display: "Order Reserved",
      is_manual: false,
      quantity_change: -1,
      reason_code: "",
      reason_display: "",
      note: "",
      resulting_quantity: 17,
      actor_email: "",
      reference: "Order #9921",
      created_at: "2026-10-24T09:00:00Z",
    },
  ],
};

describe("AdminInventoryDetailClient & Stock Adjustment Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getAdminInventoryDetail).mockResolvedValue(mockDetail);
    vi.mocked(adminApi.getAdminInventoryMovements).mockResolvedValue(mockMovementsResponse);
  });

  it("renders variant details and authoritative stock summary cards", async () => {
    render(<AdminInventoryDetailClient variantId="var-123" />);

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Zari Silk Kurta" })).toBeInTheDocument();
    });

    expect(screen.getByText("SKU: ZSK-RED-M")).toBeInTheDocument();
    expect(screen.getByText("Kurtas")).toBeInTheDocument();

    // Metric cards
    expect(screen.getByText("Total On-Hand")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument(); // On hand
    expect(screen.getByText("5")).toBeInTheDocument(); // Reserved
    expect(screen.getByText("20")).toBeInTheDocument(); // Available
  });

  it("renders movement history table with signed deltas and audit badges", async () => {
    render(<AdminInventoryDetailClient variantId="var-123" />);

    await waitFor(() => {
      expect(screen.getByText("Inventory Movement Audit History")).toBeInTheDocument();
    });

    // Movements listed
    expect(screen.getByText("+10")).toBeInTheDocument();
    expect(screen.getByText("-2")).toBeInTheDocument();
    expect(screen.getByText("Batch #100 Supplier")).toBeInTheDocument();
    expect(screen.getByText("Shelf accident")).toBeInTheDocument();
    expect(screen.getAllByText("admin@closetbychilli.com").length).toBeGreaterThan(0);
    expect(screen.getByText("System (Automated)")).toBeInTheDocument();
  });

  it("opens Adjust Stock modal, previews resulting quantity, confirms, and submits", async () => {
    vi.mocked(adminApi.adjustInventoryStock).mockResolvedValue({
      variant_id: "var-123",
      sku: "ZSK-RED-M",
      quantity_on_hand: 30,
      quantity_reserved: 5,
      quantity_available: 25,
      stock_status: "in_stock",
      stock_status_label: "In Stock",
      low_stock_threshold: 5,
      change_delta: 5,
      resulting_quantity: 30,
      movement_id: "new-mov-123",
      idempotent_replay: false,
      message: "Stock adjusted successfully.",
    });

    render(<AdminInventoryDetailClient variantId="var-123" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Adjust Stock/i })).toBeInTheDocument();
    });

    // Click Adjust Stock CTA
    fireEvent.click(screen.getByRole("button", { name: /Adjust Stock/i }));

    // Modal dialog is open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity to Add/i)).toBeInTheDocument();

    // Enter quantity 5
    const qtyInput = screen.getByLabelText(/Quantity to Add/i);
    fireEvent.change(qtyInput, { target: { value: "5" } });

    // Live preview shows projected 30 units (25 on-hand + 5)
    expect(screen.getByText("30 units")).toBeInTheDocument();

    // Click Review & Confirm
    fireEvent.click(screen.getByRole("button", { name: /Review & Confirm/i }));

    // Confirmation step visible
    expect(screen.getByText(/Confirm Stock Adjustment/i)).toBeInTheDocument();
    expect(screen.getByText(/You are about to/i)).toBeInTheDocument();

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Adjust Stock/i }));

    await waitFor(() => {
      expect(adminApi.adjustInventoryStock).toHaveBeenCalledWith(
        "var-123",
        expect.objectContaining({
          adjustment_type: "increase",
          quantity: 5,
          reason_code: "received_stock",
        })
      );
    });
  });

  it("prevents stock reduction that exceeds available stock (protecting reservations)", async () => {
    render(<AdminInventoryDetailClient variantId="var-123" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Adjust Stock/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Adjust Stock/i }));

    // Switch to Decrease Stock
    fireEvent.click(screen.getByRole("button", { name: /Decrease Stock/i }));

    // Attempt to decrease by 22 (only 20 available, 5 reserved)
    const qtyInput = screen.getByLabelText(/Quantity to Deduct/i);
    fireEvent.change(qtyInput, { target: { value: "22" } });

    // Conflict warning should appear
    expect(
      screen.getByText(/Cannot reduce stock: 5 unit\(s\) are actively reserved/i)
    ).toBeInTheDocument();

    // Review & Confirm button must be disabled
    const reviewBtn = screen.getByRole("button", { name: /Review & Confirm/i });
    expect(reviewBtn).toBeDisabled();
  });

  it("handles backend validation error and displays error message", async () => {
    vi.mocked(adminApi.adjustInventoryStock).mockRejectedValue({
      error: {
        code: "VALIDATION_ERROR",
        message: "Cannot decrease stock below zero.",
        details: { quantity: ["Cannot decrease stock by 30 units. Total on-hand is 25."] },
      },
    });

    render(<AdminInventoryDetailClient variantId="var-123" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Adjust Stock/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Adjust Stock/i }));

    const qtyInput = screen.getByLabelText(/Quantity to Add/i);
    fireEvent.change(qtyInput, { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: /Review & Confirm/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Adjust Stock/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Cannot decrease stock by 30 units/i)
      ).toBeInTheDocument();
    });
  });
});
