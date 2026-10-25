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
    transitionAdminOrderStatus: vi.fn(),
    cancelAdminOrder: vi.fn(),
  };
});

const baseOrder: adminApi.AdminOrderDetail = {
  id: "ord-test-123",
  order_number: "CBC-2026-000555",
  idempotency_key: "idemp_555",
  status: "CONFIRMED",
  status_display: "Confirmed",
  payment_status: "PAID",
  payment_status_display: "Paid",
  currency: "INR",
  subtotal: "45000.00",
  discount: "0.00",
  shipping_amount: "0.00",
  tax_amount: "0.00",
  total: "45000.00",
  item_count: 1,
  total_units: 1,
  customer: {
    id: "cust-1",
    email: "patron@example.com",
    display_name: "Patron Sen",
    phone: "9876543210",
  },
  shipping_address: {
    full_name: "Patron Sen",
    city: "Jaipur",
  },
  billing_address: {
    full_name: "Patron Sen",
    city: "Jaipur",
  },
  items: [
    {
      id: "item-1",
      product_id: "prod-1",
      variant_id: "var-1",
      product_name: "Crimson Bridal Lehenga",
      variant_name: "M / Crimson",
      sku: "CRIM-LEH-01",
      unit_price: "45000.00",
      quantity: 1,
      line_total: "45000.00",
      image_url: null,
    },
  ],
  payments: [],
  payment: null,
  inventory: {
    reservations: [],
    movements: [],
  },
  audit_logs: [],
  created_at: "2026-10-24T10:00:00Z",
  updated_at: "2026-10-24T10:00:00Z",
};

describe("AdminOrderDetailClient Operations & Transitions (Sprint A4.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays 'Confirm Order' button when order is PENDING and PAID", async () => {
    const pendingPaidOrder: adminApi.AdminOrderDetail = {
      ...baseOrder,
      status: "PENDING",
      status_display: "Pending",
      payment_status: "PAID",
      payment_status_display: "Paid",
    };
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(pendingPaidOrder);

    render(<AdminOrderDetailClient orderId={pendingPaidOrder.id} />);

    expect(await screen.findByRole("button", { name: /confirm order/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /cancel order/i })).toBeNull();
  });

  it("displays 'Cancel Order' button and payment pending warning when order is PENDING and UNPAID", async () => {
    const pendingUnpaidOrder: adminApi.AdminOrderDetail = {
      ...baseOrder,
      status: "PENDING",
      status_display: "Pending",
      payment_status: "PENDING",
      payment_status_display: "Pending",
    };
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(pendingUnpaidOrder);

    render(<AdminOrderDetailClient orderId={pendingUnpaidOrder.id} />);

    expect(await screen.findByRole("button", { name: /cancel order/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /confirm order/i })).toBeNull();
    expect(screen.getByText(/confirmation requires paid status/i)).toBeDefined();
  });

  it("displays 'Mark as Processing' button when order is CONFIRMED", async () => {
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(baseOrder);

    render(<AdminOrderDetailClient orderId={baseOrder.id} />);

    expect(await screen.findByRole("button", { name: /mark as processing/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /mark as shipped/i })).toBeNull();
  });

  it("displays 'Mark as Shipped' button when order is PROCESSING", async () => {
    const processingOrder: adminApi.AdminOrderDetail = {
      ...baseOrder,
      status: "PROCESSING",
      status_display: "Processing",
    };
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(processingOrder);

    render(<AdminOrderDetailClient orderId={processingOrder.id} />);

    expect(await screen.findByRole("button", { name: /mark as shipped/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /mark as delivered/i })).toBeNull();
  });

  it("displays 'Mark as Delivered' button when order is SHIPPED", async () => {
    const shippedOrder: adminApi.AdminOrderDetail = {
      ...baseOrder,
      status: "SHIPPED",
      status_display: "Shipped",
    };
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(shippedOrder);

    render(<AdminOrderDetailClient orderId={shippedOrder.id} />);

    expect(await screen.findByRole("button", { name: /mark as delivered/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /mark as processing/i })).toBeNull();
  });

  it("displays terminal state badge and no action buttons when order is DELIVERED or CANCELLED", async () => {
    const deliveredOrder: adminApi.AdminOrderDetail = {
      ...baseOrder,
      status: "DELIVERED",
      status_display: "Delivered",
    };
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(deliveredOrder);

    render(<AdminOrderDetailClient orderId={deliveredOrder.id} />);

    expect(await screen.findByText(/terminal state — no transitions permitted/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /mark as/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /cancel order/i })).toBeNull();
  });

  it("opens confirmation modal, collects optional note, and submits transition successfully", async () => {
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(baseOrder);

    const updatedOrder: adminApi.AdminOrderDetail = {
      ...baseOrder,
      status: "PROCESSING",
      status_display: "Processing",
      audit_logs: [
        {
          id: "log-1",
          from_status: "CONFIRMED",
          to_status: "PROCESSING",
          operation_type: "status_transition",
          operation_type_display: "Status Transition",
          actor_email: "admin@closetbychilli.com",
          note: "Sent to atelier",
          created_at: "2026-10-24T11:00:00Z",
        },
      ],
    };
    vi.mocked(adminApi.transitionAdminOrderStatus).mockResolvedValue(updatedOrder);

    render(<AdminOrderDetailClient orderId={baseOrder.id} />);

    const actionBtn = await screen.findByRole("button", { name: /mark as processing/i });
    fireEvent.click(actionBtn);

    // Modal is opened
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("heading", { name: /confirm mark as processing/i })).toBeDefined();

    // Type optional note
    const noteInput = screen.getByLabelText(/operational note/i);
    fireEvent.change(noteInput, { target: { value: "Sent to atelier" } });

    // Submit transition
    const confirmBtn = screen.getByRole("button", { name: /confirm transition/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminApi.transitionAdminOrderStatus).toHaveBeenCalledWith("ord-test-123", {
        target_status: "PROCESSING",
        note: "Sent to atelier",
      });
    });

    // Check success banner and audit log in UI
    expect(await screen.findByText(/order status successfully updated to processing/i)).toBeDefined();
    expect(screen.getByText("Sent to atelier")).toBeDefined();
    expect(screen.getByText("admin@closetbychilli.com")).toBeDefined();
  });

  it("handles cancellation modal with warning and submits cancellation successfully", async () => {
    const pendingUnpaidOrder: adminApi.AdminOrderDetail = {
      ...baseOrder,
      status: "PENDING",
      status_display: "Pending",
      payment_status: "PENDING",
      payment_status_display: "Pending",
    };
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(pendingUnpaidOrder);

    const cancelledOrder: adminApi.AdminOrderDetail = {
      ...pendingUnpaidOrder,
      status: "CANCELLED",
      status_display: "Cancelled",
      payment_status: "FAILED",
      payment_status_display: "Failed",
      audit_logs: [
        {
          id: "log-cancel-1",
          from_status: "PENDING",
          to_status: "CANCELLED",
          operation_type: "cancellation",
          operation_type_display: "Cancellation",
          actor_email: "admin@closetbychilli.com",
          note: "Customer cancelled",
          created_at: "2026-10-24T11:30:00Z",
        },
      ],
    };
    vi.mocked(adminApi.cancelAdminOrder).mockResolvedValue(cancelledOrder);

    render(<AdminOrderDetailClient orderId={pendingUnpaidOrder.id} />);

    const cancelBtn = await screen.findByRole("button", { name: /cancel order/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("heading", { name: /confirm order cancellation/i })).toBeDefined();
    expect(screen.getByText(/release all active inventory reservations/i)).toBeDefined();

    const noteInput = screen.getByLabelText(/operational note/i);
    fireEvent.change(noteInput, { target: { value: "Customer cancelled" } });

    const confirmCancelBtn = screen.getByRole("button", { name: /confirm cancellation/i });
    fireEvent.click(confirmCancelBtn);

    await waitFor(() => {
      expect(adminApi.cancelAdminOrder).toHaveBeenCalledWith("ord-test-123", {
        reason: "Customer cancelled",
        note: "Customer cancelled",
      });
    });

    expect(await screen.findByText(/order status successfully updated to cancelled/i)).toBeDefined();
  });

  it("displays backend error message in modal when operation is rejected", async () => {
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(baseOrder);
    vi.mocked(adminApi.transitionAdminOrderStatus).mockRejectedValue(
      new Error("Invalid status transition from 'CONFIRMED' to 'PROCESSING'.")
    );

    render(<AdminOrderDetailClient orderId={baseOrder.id} />);

    const actionBtn = await screen.findByRole("button", { name: /mark as processing/i });
    fireEvent.click(actionBtn);

    const confirmBtn = screen.getByRole("button", { name: /confirm transition/i });
    fireEvent.click(confirmBtn);

    expect(
      await screen.findByText("Invalid status transition from 'CONFIRMED' to 'PROCESSING'.")
    ).toBeDefined();

    // Modal stays open so user can inspect error or cancel
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("renders audit history table with all log details", async () => {
    const orderWithAudit: adminApi.AdminOrderDetail = {
      ...baseOrder,
      audit_logs: [
        {
          id: "log-1",
          from_status: "PENDING",
          to_status: "CONFIRMED",
          operation_type: "status_transition",
          operation_type_display: "Status Transition",
          actor_email: "staff@closetbychilli.com",
          note: "Payment verified by bank transfer",
          created_at: "2026-10-24T09:00:00Z",
        },
      ],
    };
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(orderWithAudit);

    render(<AdminOrderDetailClient orderId={orderWithAudit.id} />);

    expect(
      await screen.findByRole("heading", {
        name: /privileged operation history & audit trail/i,
      })
    ).toBeDefined();
    expect(screen.getByText("staff@closetbychilli.com")).toBeDefined();
    expect(screen.getByText("Payment verified by bank transfer")).toBeDefined();
    expect(screen.getByText("PENDING")).toBeDefined();
  });
});
