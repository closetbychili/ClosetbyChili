import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminPaymentsClient from "@/components/admin/payments/AdminPaymentsClient";
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
  usePathname: () => "/admin/payments",
  useSearchParams: () => mockSearchParams,
}));

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminPayments: vi.fn(),
    getAdminPaymentDetail: vi.fn(),
    reconcileAdminPayment: vi.fn(),
  };
});

const mockPaymentsResponse: {
  count: number;
  next: string | null;
  previous: string | null;
  results: adminApi.AdminPaymentRecord[];
} = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: "ord-test-1111",
      order_id: "ord-test-1111",
      order_number: "CBC-2026-000101",
      customer: {
        id: "cust-1",
        email: "patron@example.com",
        display_name: "Patron Sen",
      },
      provider: "Razorpay",
      razorpay_order_id: "order_rzp_mock_1",
      razorpay_payment_id: "pay_rzp_mock_1",
      amount: "35000.00",
      currency: "INR",
      payment_status: "PAID",
      payment_status_display: "Paid",
      order_status: "CONFIRMED",
      order_status_display: "Confirmed",
      discrepancy_status: "MATCHED",
      created_at: "2026-10-24T10:00:00Z",
      updated_at: "2026-10-24T10:05:00Z",
    },
    {
      id: "ord-test-2222",
      order_id: "ord-test-2222",
      order_number: "CBC-2026-000102",
      customer: {
        id: "cust-2",
        email: "priya@example.com",
        display_name: "Priya Sharma",
      },
      provider: "Razorpay",
      razorpay_order_id: "order_rzp_mock_2",
      razorpay_payment_id: null,
      amount: "42000.00",
      currency: "INR",
      payment_status: "PENDING",
      payment_status_display: "Pending",
      order_status: "PENDING",
      order_status_display: "Pending",
      discrepancy_status: "NEEDS_REVIEW",
      created_at: "2026-10-24T11:00:00Z",
      updated_at: "2026-10-24T11:00:00Z",
    },
  ],
};

const mockPaymentDetail: adminApi.AdminPaymentDetail = {
  id: "ord-test-2222",
  order_id: "ord-test-2222",
  order_number: "CBC-2026-000102",
  customer: {
    id: "cust-2",
    email: "priya@example.com",
    display_name: "Priya Sharma",
  },
  provider: "Razorpay",
  razorpay_order_id: "order_rzp_mock_2",
  razorpay_payment_id: null,
  amount: "42000.00",
  currency: "INR",
  subtotal: "42000.00",
  discount: "0.00",
  shipping_amount: "0.00",
  tax_amount: "0.00",
  payment_status: "PENDING",
  payment_status_display: "Pending",
  order_status: "PENDING",
  order_status_display: "Pending",
  discrepancy_status: "NEEDS_REVIEW",
  discrepancy_details: [
    "Payment pending: Razorpay order ID exists but no captured payment ID is recorded.",
  ],
  is_reconciled: false,
  reconciled_at: null,
  audit_logs: [],
  created_at: "2026-10-24T11:00:00Z",
  updated_at: "2026-10-24T11:00:00Z",
};

describe("AdminPaymentsClient — Payment Operations & Reconciliation (Sprint A4.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders payment list table with search, badges, and records", async () => {
    vi.mocked(adminApi.getAdminPayments).mockResolvedValue(mockPaymentsResponse);

    render(<AdminPaymentsClient />);

    expect(screen.getByText(/Loading payment records/i)).toBeDefined();

    expect(await screen.findByText("CBC-2026-000101")).toBeDefined();
    expect(screen.getByText("CBC-2026-000102")).toBeDefined();
    expect(screen.getByText("Patron Sen")).toBeDefined();
    expect(screen.getByText("Priya Sharma")).toBeDefined();
    expect(screen.getAllByText("Matched").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Needs Review").length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty state when no payments are found", async () => {
    vi.mocked(adminApi.getAdminPayments).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<AdminPaymentsClient />);

    expect(await screen.findByText(/No payment records found/i)).toBeDefined();
  });

  it("renders error state with retry button", async () => {
    vi.mocked(adminApi.getAdminPayments).mockRejectedValueOnce(
      new Error("Database connection timed out.")
    );

    render(<AdminPaymentsClient />);

    expect(await screen.findByText(/Database connection timed out/i)).toBeDefined();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeDefined();

    vi.mocked(adminApi.getAdminPayments).mockResolvedValue(mockPaymentsResponse);
    fireEvent.click(retryBtn);

    expect(await screen.findByText("CBC-2026-000101")).toBeDefined();
  });

  it("opens payment inspection detail modal when clicking Inspect", async () => {
    vi.mocked(adminApi.getAdminPayments).mockResolvedValue(mockPaymentsResponse);
    vi.mocked(adminApi.getAdminPaymentDetail).mockResolvedValue(mockPaymentDetail);

    render(<AdminPaymentsClient />);

    expect(await screen.findByText("CBC-2026-000102")).toBeDefined();

    const inspectButtons = screen.getAllByRole("button", { name: /inspect/i });
    fireEvent.click(inspectButtons[1]);

    expect(await screen.findByText("Payment Operation Detail")).toBeDefined();
    expect(
      screen.getByText(/Razorpay order ID exists but no captured payment ID/i)
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /reconcile with gateway/i })).toBeDefined();
  });

  it("opens reconciliation confirmation modal and performs safe server reconciliation", async () => {
    vi.mocked(adminApi.getAdminPayments).mockResolvedValue(mockPaymentsResponse);
    vi.mocked(adminApi.getAdminPaymentDetail).mockResolvedValue(mockPaymentDetail);
    vi.mocked(adminApi.reconcileAdminPayment).mockResolvedValue({
      detail: "Payment verified and order confirmed successfully.",
      outcome: "RECONCILED",
      payment_status: "PAID",
      order_status: "CONFIRMED",
      order_number: "CBC-2026-000102",
      provider: "Razorpay",
      reconciled_payment_id: "pay_live_captured_777",
      reconciled_at: "2026-10-24T12:00:00Z",
    });

    render(<AdminPaymentsClient />);

    expect(await screen.findByText("CBC-2026-000102")).toBeDefined();
    const inspectButtons = screen.getAllByRole("button", { name: /inspect/i });
    fireEvent.click(inspectButtons[1]);

    const reconcileBtn = await screen.findByRole("button", {
      name: /reconcile with gateway/i,
    });
    fireEvent.click(reconcileBtn);

    expect(screen.getByText("Confirm Gateway Reconciliation")).toBeDefined();
    expect(
      screen.getByText(/This operation directly queries the/i)
    ).toBeDefined();

    const confirmBtn = screen.getByRole("button", {
      name: /confirm & reconcile/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminApi.reconcileAdminPayment).toHaveBeenCalledWith("ord-test-2222");
    });
  });

  it("never presents a manual 'Mark as Paid' or 'Mark as Refunded' button", async () => {
    vi.mocked(adminApi.getAdminPayments).mockResolvedValue(mockPaymentsResponse);
    vi.mocked(adminApi.getAdminPaymentDetail).mockResolvedValue(mockPaymentDetail);

    render(<AdminPaymentsClient />);

    await screen.findByText("CBC-2026-000101");

    expect(screen.queryByRole("button", { name: /mark as paid/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /mark as refunded/i })).toBeNull();
    expect(screen.queryByText(/mark as paid/i)).toBeNull();
    expect(screen.queryByText(/mark as refunded/i)).toBeNull();
  });
});
