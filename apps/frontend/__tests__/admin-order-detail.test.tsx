import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminOrderDetailClient from "@/components/admin/orders/AdminOrderDetailClient";
import * as adminApi from "@/lib/api/admin";

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminOrderDetail: vi.fn(),
  };
});

const mockOrderDetailResponse: adminApi.AdminOrderDetail = {
  id: "ord-2026-aaaa-bbbb",
  order_number: "CBC-2026-000201",
  idempotency_key: "idemp_checkout_201",
  status: "CONFIRMED",
  status_display: "Confirmed",
  payment_status: "PAID",
  payment_status_display: "Paid",
  currency: "INR",
  subtotal: "50000.00",
  discount: "2000.00",
  shipping_amount: "500.00",
  tax_amount: "2400.00",
  total: "50900.00",
  item_count: 1,
  total_units: 2,
  customer: {
    id: "cust-uuid-201",
    email: "ananya@example.com",
    display_name: "Ananya Sen",
    phone: "9876543210",
  },
  shipping_address: {
    full_name: "Ananya Sen",
    phone: "9876543210",
    address_line1: "Flat 4B, Heritage Towers",
    city: "Kolkata",
    state: "West Bengal",
    postal_code: "700029",
    country: "India",
  },
  billing_address: {
    full_name: "Ananya Sen",
    phone: "9876543210",
    address_line1: "Flat 4B, Heritage Towers",
    city: "Kolkata",
    state: "West Bengal",
    postal_code: "700029",
    country: "India",
  },
  items: [
    {
      id: "item-uuid-201",
      product_id: "prod-uuid-1",
      variant_id: "var-uuid-1",
      product_name: "Banarasi Silk Saree",
      variant_name: "Free / Crimson",
      sku: "BAN-SLK-001",
      unit_price: "25000.00",
      quantity: 2,
      line_total: "50000.00",
      image_url: "https://res.cloudinary.com/chilli/image/upload/banarasi_primary.jpg",
    },
  ],
  payments: [
    {
      provider: "Razorpay",
      status: "PAID",
      status_display: "Paid",
      amount: "50900.00",
      currency: "INR",
      razorpay_order_id: "order_rzp_201",
      razorpay_payment_id: "pay_rzp_201",
      created_at: "2026-10-24T10:00:00Z",
      updated_at: "2026-10-24T10:05:00Z",
    },
  ],
  payment: {
    provider: "Razorpay",
    status: "PAID",
    status_display: "Paid",
    amount: "50900.00",
    currency: "INR",
    razorpay_order_id: "order_rzp_201",
    razorpay_payment_id: "pay_rzp_201",
    created_at: "2026-10-24T10:00:00Z",
    updated_at: "2026-10-24T10:05:00Z",
  },
  inventory: {
    reservations: [
      {
        id: "res-uuid-201",
        inventory_item_id: "inv-uuid-1",
        quantity: 2,
        status: "finalized",
        status_display: "Finalized",
        sku: "BAN-SLK-001",
        product_name: "Banarasi Silk Saree",
        variant_label: "Free / Crimson",
        expires_at: "2026-10-24T10:30:00Z",
        created_at: "2026-10-24T10:00:00Z",
        updated_at: "2026-10-24T10:05:00Z",
      },
    ],
    movements: [
      {
        id: "mov-uuid-201",
        inventory_item_id: "inv-uuid-1",
        movement_type: "order_fulfilled",
        movement_type_display: "Order Fulfilled",
        quantity_change: -2,
        resulting_quantity: 10,
        reference: "Order CBC-2026-000201",
        reason_code: "order_fulfilled",
        note: "Stock deducted upon payment confirmation",
        actor_email: "admin@closetbychilli.com",
        sku: "BAN-SLK-001",
        product_name: "Banarasi Silk Saree",
        created_at: "2026-10-24T10:05:00Z",
      },
    ],
  },
  audit_logs: [],
  created_at: "2026-10-24T10:00:00Z",
  updated_at: "2026-10-24T10:05:00Z",
};

describe("AdminOrderDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(mockOrderDetailResponse);
  });

  it("renders order header, order number, and status badges", async () => {
    render(<AdminOrderDetailClient orderId="ord-2026-aaaa-bbbb" />);

    expect(await screen.findByRole("heading", { name: "CBC-2026-000201" })).toBeDefined();
    expect(screen.getAllByText("Confirmed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Paid").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/idemp_checkout_201/)).toBeDefined();

    // Back link
    const backLinks = screen.getAllByRole("link", { name: /back to orders/i });
    expect(backLinks.length).toBeGreaterThanOrEqual(1);
    expect(backLinks[0].getAttribute("href")).toBe("/admin/orders");
  });

  it("renders financial breakdown with formatted amounts", async () => {
    render(<AdminOrderDetailClient orderId="ord-2026-aaaa-bbbb" />);

    await waitFor(() => {
      expect(adminApi.getAdminOrderDetail).toHaveBeenCalledWith("ord-2026-aaaa-bbbb");
    });

    expect(screen.getByText("Subtotal")).toBeDefined();
    expect(screen.getByText("Discount")).toBeDefined();
    expect(screen.getByText("Shipping")).toBeDefined();
    expect(screen.getByText("Tax / GST")).toBeDefined();
  });

  it("renders customer card and sanitized details", async () => {
    render(<AdminOrderDetailClient orderId="ord-2026-aaaa-bbbb" />);

    await waitFor(() => {
      expect(adminApi.getAdminOrderDetail).toHaveBeenCalled();
    });

    expect(screen.getAllByText("Ananya Sen").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("ananya@example.com")).toBeDefined();
    expect(screen.getAllByText("9876543210").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("cust-uuid-201")).toBeDefined();
  });

  it("renders shipping and billing address snapshots", async () => {
    render(<AdminOrderDetailClient orderId="ord-2026-aaaa-bbbb" />);

    await waitFor(() => {
      expect(adminApi.getAdminOrderDetail).toHaveBeenCalled();
    });

    expect(screen.getAllByText(/Flat 4B, Heritage Towers/).length).toBe(2);
    expect(screen.getAllByText(/Kolkata, West Bengal, 700029/).length).toBe(2);
  });

  it("renders line items with product name, SKU, prices, and image", async () => {
    render(<AdminOrderDetailClient orderId="ord-2026-aaaa-bbbb" />);

    await waitFor(() => {
      expect(adminApi.getAdminOrderDetail).toHaveBeenCalled();
    });

    expect(screen.getAllByText("Banarasi Silk Saree").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("BAN-SLK-001").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Free / Crimson").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("View Catalog Product")).toBeDefined();
  });

  it("renders payment records and gateway identifiers", async () => {
    render(<AdminOrderDetailClient orderId="ord-2026-aaaa-bbbb" />);

    await waitFor(() => {
      expect(adminApi.getAdminOrderDetail).toHaveBeenCalled();
    });

    expect(screen.getByText("Razorpay")).toBeDefined();
    expect(screen.getByText("order_rzp_201")).toBeDefined();
    expect(screen.getByText("pay_rzp_201")).toBeDefined();
  });

  it("renders inventory lifecycle reservations and movements", async () => {
    render(<AdminOrderDetailClient orderId="ord-2026-aaaa-bbbb" />);

    await waitFor(() => {
      expect(adminApi.getAdminOrderDetail).toHaveBeenCalled();
    });

    expect(screen.getByText("Finalized")).toBeDefined();
    expect(screen.getByText("Order Fulfilled")).toBeDefined();
    expect(screen.getByText("-2")).toBeDefined();
    expect(screen.getByText(/admin@closetbychilli.com/)).toBeDefined();
  });

  it("renders 404 state when order does not exist", async () => {
    vi.mocked(adminApi.getAdminOrderDetail).mockRejectedValueOnce(
      Object.assign(new Error("Order not found."), { status: 404 })
    );

    render(<AdminOrderDetailClient orderId="missing-uuid" />);

    expect(await screen.findByText("Order Not Found")).toBeDefined();
    const backBtn = screen.getByRole("link", { name: /back to orders list/i });
    expect(backBtn.getAttribute("href")).toBe("/admin/orders");
  });

  it("renders error state and retries on action click", async () => {
    vi.mocked(adminApi.getAdminOrderDetail).mockRejectedValueOnce(
      new Error("Gateway timeout")
    );

    render(<AdminOrderDetailClient orderId="ord-2026-aaaa-bbbb" />);

    expect(await screen.findByText("Failed to Load Order Detail")).toBeDefined();
    expect(screen.getByText("Gateway timeout")).toBeDefined();

    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValueOnce(mockOrderDetailResponse);

    const retryBtn = screen.getByRole("button", { name: /retry loading/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(adminApi.getAdminOrderDetail).toHaveBeenCalledTimes(2);
    });
  });

  it("handles order with empty payment and inventory collections", async () => {
    const bareOrder: adminApi.AdminOrderDetail = {
      ...mockOrderDetailResponse,
      shipping_address: {},
      billing_address: {},
      payments: [],
      payment: null,
      inventory: {
        reservations: [],
        movements: [],
      },
    };
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValueOnce(bareOrder);

    render(<AdminOrderDetailClient orderId="bare-order" />);

    await waitFor(() => {
      expect(adminApi.getAdminOrderDetail).toHaveBeenCalledWith("bare-order");
    });

    expect(
      screen.getByText("No payment gateway transactions recorded for this order.")
    ).toBeDefined();
    expect(
      screen.getByText("No stock reservations recorded for this order.")
    ).toBeDefined();
    expect(
      screen.getByText("No inventory movements recorded for this order.")
    ).toBeDefined();
  });
});
