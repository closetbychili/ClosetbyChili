import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import AdminShipmentsClient from "@/components/admin/shipments/AdminShipmentsClient";
import AdminShipmentDetailDrawer from "@/components/admin/shipments/AdminShipmentDetailDrawer";
import AdminOrderDetailClient from "@/components/admin/orders/AdminOrderDetailClient";
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
  usePathname: () => "/admin/shipments",
  useSearchParams: () => mockSearchParams,
}));

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminShipments: vi.fn(),
    getAdminShipmentDetail: vi.fn(),
    createAdminOrderShipment: vi.fn(),
    updateAdminShipmentTracking: vi.fn(),
    dispatchAdminShipment: vi.fn(),
    transitionAdminShipmentStatus: vi.fn(),
    getAdminOrderDetail: vi.fn(),
  };
});

const mockShipmentsResponse: {
  count: number;
  next: string | null;
  previous: string | null;
  results: adminApi.AdminShipmentListItem[];
} = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: "shp-1111-aaaa-bbbb",
      order_id: "ord-1111-aaaa",
      order_number: "CBC-2026-000101",
      order_status: "CONFIRMED",
      order_status_display: "Confirmed",
      order_payment_status: "PAID",
      order_payment_status_display: "Paid",
      status: "READY_TO_SHIP",
      status_display: "Ready to Ship",
      carrier: "Blue Dart",
      tracking_number: "BD123456789IN",
      tracking_url: "https://track.bluedart.com/track?ref=BD123456789IN",
      internal_note: "",
      dispatched_at: null,
      dispatched_by_email: "",
      delivered_at: null,
      delivered_by_email: "",
      customer_email: "priya@example.com",
      customer_name: "Priya Sharma",
      item_count: 2,
      created_at: "2026-10-25T10:00:00Z",
      updated_at: "2026-10-25T10:00:00Z",
    },
    {
      id: "shp-2222-cccc-dddd",
      order_id: "ord-2222-bbbb",
      order_number: "CBC-2026-000102",
      order_status: "DELIVERED",
      order_status_display: "Delivered",
      order_payment_status: "PAID",
      order_payment_status_display: "Paid",
      status: "DELIVERED",
      status_display: "Delivered",
      carrier: "Delhivery",
      tracking_number: "DEL987654321",
      tracking_url: "https://www.delhivery.com/track/package/DEL987654321",
      internal_note: "",
      dispatched_at: "2026-10-24T12:00:00Z",
      dispatched_by_email: "superadmin@closetbychilli.com",
      delivered_at: "2026-10-25T08:00:00Z",
      delivered_by_email: "superadmin@closetbychilli.com",
      customer_email: "rohit@example.com",
      customer_name: "Rohit Verma",
      item_count: 1,
      created_at: "2026-10-24T11:00:00Z",
      updated_at: "2026-10-25T08:00:00Z",
    },
  ],
};

const mockShipmentDetailResponse: adminApi.AdminShipmentDetail = {
  id: "shp-1111-aaaa-bbbb",
  status: "READY_TO_SHIP",
  status_display: "Ready to Ship",
  carrier: "Blue Dart",
  tracking_number: "BD123456789IN",
  tracking_url: "https://track.bluedart.com/track?ref=BD123456789IN",
  internal_note: "Handle with extra silk protection.",
  dispatched_at: null,
  dispatched_by_email: "",
  delivered_at: null,
  delivered_by_email: "",
  created_by_email: "superadmin@closetbychilli.com",
  created_at: "2026-10-25T10:00:00Z",
  updated_at: "2026-10-25T10:05:00Z",
  order: {
    id: "ord-1111-aaaa",
    order_number: "CBC-2026-000101",
    status: "PROCESSING",
    status_display: "Processing",
    payment_status: "PAID",
    payment_status_display: "Paid",
    currency: "INR",
    total: "30000.00",
    created_at: "2026-10-25T09:30:00Z",
    customer: {
      id: "cust-1",
      email: "priya@example.com",
      display_name: "Priya Sharma",
      phone: "9876543210",
    },
    shipping_address: {
      full_name: "Priya Sharma",
      phone: "9876543210",
      address_line1: "123 Marine Drive",
      city: "Mumbai",
      state: "Maharashtra",
      postal_code: "400020",
      country: "India",
    },
    items: [
      {
        id: "item-1",
        product_id: "prod-1",
        variant_id: "var-1",
        product_name: "Raw Silk Kurta",
        variant_name: "M / Ivory",
        sku: "RSK-IVO-M",
        quantity: 2,
        unit_price: "15000.00",
        line_total: "30000.00",
        image_url: null,
      },
    ],
  },
  audit_logs: [
    {
      id: "audit-1",
      from_status: "PENDING",
      to_status: "READY_TO_SHIP",
      event_type: "status_transition",
      event_type_display: "Status Transition",
      actor_email: "superadmin@closetbychilli.com",
      note: "Packed and labeled.",
      metadata: {},
      created_at: "2026-10-25T10:05:00Z",
    },
  ],
};

const mockOrderDetailResponse: adminApi.AdminOrderDetail = {
  id: "ord-1111-aaaa",
  order_number: "CBC-2026-000101",
  idempotency_key: "idemp_1111",
  status: "CONFIRMED",
  status_display: "Confirmed",
  payment_status: "PAID",
  payment_status_display: "Paid",
  currency: "INR",
  subtotal: "30000.00",
  discount: "0.00",
  shipping_amount: "0.00",
  tax_amount: "0.00",
  total: "30000.00",
  item_count: 1,
  total_units: 2,
  customer: {
    id: "cust-1",
    email: "priya@example.com",
    display_name: "Priya Sharma",
    phone: "9876543210",
  },
  shipping_address: {
    full_name: "Priya Sharma",
    phone: "9876543210",
    address_line1: "123 Marine Drive",
    city: "Mumbai",
    state: "Maharashtra",
    postal_code: "400020",
    country: "India",
  },
  billing_address: {
    full_name: "Priya Sharma",
    phone: "9876543210",
    address_line1: "123 Marine Drive",
    city: "Mumbai",
    state: "Maharashtra",
    postal_code: "400020",
    country: "India",
  },
  items: [
    {
      id: "item-1",
      product_id: "prod-1",
      variant_id: "var-1",
      product_name: "Raw Silk Kurta",
      variant_name: "M / Ivory",
      sku: "RSK-IVO-M",
      unit_price: "15000.00",
      quantity: 2,
      line_total: "30000.00",
      image_url: null,
    },
  ],
  payment: null,
  payments: [
    {
      provider: "Razorpay",
      status: "PAID",
      status_display: "Paid",
      amount: "30000.00",
      currency: "INR",
      razorpay_order_id: "order_rzp_1",
      razorpay_payment_id: "pay_rzp_1",
      created_at: "2026-10-25T09:35:00Z",
      updated_at: "2026-10-25T09:35:00Z",
    },
  ],
  shipments: [],
  audit_logs: [],
  inventory: {
    reservations: [],
    movements: [],
  },
  created_at: "2026-10-25T09:30:00Z",
  updated_at: "2026-10-25T09:35:00Z",
};

describe("Admin Shipments Frontend Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    vi.mocked(adminApi.getAdminShipments).mockResolvedValue(mockShipmentsResponse);
    vi.mocked(adminApi.getAdminShipmentDetail).mockResolvedValue(mockShipmentDetailResponse);
    vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue(mockOrderDetailResponse);
  });

  describe("AdminShipmentsClient", () => {
    it("renders page header and metric counters", async () => {
      render(<AdminShipmentsClient />);

      expect(screen.getByRole("heading", { name: /Shipment Management/i })).toBeDefined();
      expect(screen.getByText(/Total Registered/i)).toBeDefined();

      await waitFor(() => {
        expect(adminApi.getAdminShipments).toHaveBeenCalled();
      });

      // Verify row items rendered
      await waitFor(() => {
        expect(screen.getByText("CBC-2026-000101")).toBeDefined();
        expect(screen.getByText("CBC-2026-000102")).toBeDefined();
        expect(screen.getByText("BD123456789IN")).toBeDefined();
        expect(screen.getByText("DEL987654321")).toBeDefined();
      });
    });

    it("handles search and filter bar changes", async () => {
      render(<AdminShipmentsClient />);

      await waitFor(() => {
        expect(adminApi.getAdminShipments).toHaveBeenCalled();
      });

      const searchInput = screen.getByPlaceholderText(/Search by order #, tracking #/i);
      fireEvent.change(searchInput, { target: { value: "BD12345" } });
      fireEvent.submit(searchInput.closest("form")!);

      expect(mockReplace).toHaveBeenCalled();
    });

    it("renders empty state when no shipments match query", async () => {
      vi.mocked(adminApi.getAdminShipments).mockResolvedValue({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });

      render(<AdminShipmentsClient />);

      await waitFor(() => {
        expect(screen.getByText(/No shipments recorded yet/i)).toBeDefined();
      });
    });

    it("renders error state and provides retry action", async () => {
      vi.mocked(adminApi.getAdminShipments).mockRejectedValueOnce(
        new Error("Network connection failure")
      );

      render(<AdminShipmentsClient />);

      await waitFor(() => {
        expect(screen.getByText("Network connection failure")).toBeDefined();
      });

      const retryBtn = screen.getByRole("button", { name: /Retry/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(adminApi.getAdminShipments).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("AdminShipmentDetailDrawer", () => {
    it("renders drawer details with tracking, items, and audit timeline", async () => {
      const handleClose = vi.fn();
      const handleUpdated = vi.fn();

      render(
        <AdminShipmentDetailDrawer
          shipmentId="shp-1111-aaaa-bbbb"
          isOpen={true}
          onClose={handleClose}
          onShipmentUpdated={handleUpdated}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading shipment details/i)).toBeNull();
      });

      // Verify header and contents
      expect(screen.getByText("Shipment Inspection")).toBeDefined();
      expect(screen.getAllByText("CBC-2026-000101").length).toBeGreaterThan(0);
      expect(screen.getByText("Blue Dart")).toBeDefined();
      expect(screen.getByText("BD123456789IN")).toBeDefined();
      expect(screen.getByText("Priya Sharma")).toBeDefined();
      expect(screen.getByText("Raw Silk Kurta")).toBeDefined();
      expect(screen.getByText("Packed and labeled.")).toBeDefined();
    });

    it("opens edit tracking mode and updates tracking details", async () => {
      vi.mocked(adminApi.updateAdminShipmentTracking).mockResolvedValue({
        ...mockShipmentDetailResponse,
        tracking_number: "BD999999999IN",
      });

      const handleClose = vi.fn();
      const handleUpdated = vi.fn();

      render(
        <AdminShipmentDetailDrawer
          shipmentId="shp-1111-aaaa-bbbb"
          isOpen={true}
          onClose={handleClose}
          onShipmentUpdated={handleUpdated}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading shipment details/i)).toBeNull();
      });

      const editBtn = screen.getByRole("button", { name: /Edit Tracking/i });
      fireEvent.click(editBtn);

      const trackingInput = screen.getByDisplayValue("BD123456789IN");
      fireEvent.change(trackingInput, { target: { value: "BD999999999IN" } });

      const saveBtn = screen.getByRole("button", { name: /Save Tracking/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(adminApi.updateAdminShipmentTracking).toHaveBeenCalledWith(
          "shp-1111-aaaa-bbbb",
          expect.objectContaining({
            tracking_number: "BD999999999IN",
          })
        );
        expect(handleUpdated).toHaveBeenCalled();
      });
    });

    it("opens dispatch confirmation modal and executes dispatch", async () => {
      vi.mocked(adminApi.dispatchAdminShipment).mockResolvedValue({
        ...mockShipmentDetailResponse,
        status: "SHIPPED",
        status_display: "Shipped",
        dispatched_at: "2026-10-25T11:00:00Z",
      });

      const handleClose = vi.fn();
      const handleUpdated = vi.fn();

      render(
        <AdminShipmentDetailDrawer
          shipmentId="shp-1111-aaaa-bbbb"
          isOpen={true}
          onClose={handleClose}
          onShipmentUpdated={handleUpdated}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading shipment details/i)).toBeNull();
      });

      const dispatchBtn = screen.getByRole("button", { name: /Dispatch Shipment/i });
      fireEvent.click(dispatchBtn);

      // Verify modal dialog opened
      expect(screen.getByRole("heading", { name: /Confirm Parcel Dispatch/i })).toBeDefined();

      const confirmBtn = screen.getByRole("button", { name: /Dispatch Parcel/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(adminApi.dispatchAdminShipment).toHaveBeenCalledWith(
          "shp-1111-aaaa-bbbb",
          expect.anything()
        );
        expect(handleUpdated).toHaveBeenCalled();
      });
    });
  });

  describe("AdminOrderDetailClient Shipment Integration", () => {
    it("renders Shipments & Fulfillment card and allows creating shipment when eligible", async () => {
      render(<AdminOrderDetailClient orderId="ord-1111-aaaa" />);

      await waitFor(() => {
        expect(adminApi.getAdminOrderDetail).toHaveBeenCalledWith("ord-1111-aaaa");
      });

      // Verify Shipments section rendered
      expect(screen.getByText(/Shipments & Fulfillment/i)).toBeDefined();
      const createButtons = screen.getAllByRole("button", { name: /Create Shipment/i });
      expect(createButtons.length).toBeGreaterThan(0);

      // Open modal
      fireEvent.click(createButtons[0]);

      const modal = screen.getByRole("dialog");
      expect(within(modal).getByRole("heading", { name: /Create Order Shipment/i })).toBeDefined();

      // Submit modal
      vi.mocked(adminApi.createAdminOrderShipment).mockResolvedValue(mockShipmentDetailResponse);

      const trackingNumberInput = within(modal).getByPlaceholderText("e.g. BD982341209IN");
      fireEvent.change(trackingNumberInput, { target: { value: "BD55555555IN" } });

      const submitBtn = within(modal).getByRole("button", { name: /^Create Shipment$/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(adminApi.createAdminOrderShipment).toHaveBeenCalledWith(
          "ord-1111-aaaa",
          expect.objectContaining({
            carrier: "Blue Dart",
            tracking_number: "BD55555555IN",
            status: "READY_TO_SHIP",
          })
        );
      });
    });

    it("displays existing shipment row with carrier, tracking, and manage link", async () => {
      vi.mocked(adminApi.getAdminOrderDetail).mockResolvedValue({
        ...mockOrderDetailResponse,
        shipments: [
          {
            id: "shp-1111-aaaa-bbbb",
            status: "READY_TO_SHIP",
            status_display: "Ready to Ship",
            carrier: "Blue Dart",
            tracking_number: "BD123456789IN",
            tracking_url: "https://track.bluedart.com/track?ref=BD123456789IN",
            internal_note: "",
            dispatched_at: null,
            dispatched_by_email: "",
            delivered_at: null,
            delivered_by_email: "",
            created_at: "2026-10-25T10:00:00Z",
            updated_at: "2026-10-25T10:00:00Z",
          },
        ],
      });

      render(<AdminOrderDetailClient orderId="ord-1111-aaaa" />);

      await waitFor(() => {
        expect(adminApi.getAdminOrderDetail).toHaveBeenCalled();
      });

      expect(screen.getByText("Blue Dart")).toBeDefined();
      expect(screen.getByText("BD123456789IN")).toBeDefined();
      expect(screen.getByText("Manage")).toBeDefined();
    });
  });
});
