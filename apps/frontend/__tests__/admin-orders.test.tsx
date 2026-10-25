import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminOrdersClient from "@/components/admin/orders/AdminOrdersClient";
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
  usePathname: () => "/admin/orders",
  useSearchParams: () => mockSearchParams,
}));

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminOrders: vi.fn(),
  };
});

const mockOrdersResponse = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: "ord-1111-aaaa",
      order_number: "CBC-2026-000101",
      status: "CONFIRMED",
      status_display: "Confirmed",
      payment_status: "PAID",
      payment_status_display: "Paid",
      currency: "INR",
      subtotal: "30000.00",
      total: "30000.00",
      item_count: 2,
      customer: {
        id: "cust-1",
        email: "priya@example.com",
        display_name: "Priya Sharma",
        phone: "9876543210",
      },
      created_at: "2026-10-24T10:00:00Z",
      updated_at: "2026-10-24T10:05:00Z",
    },
    {
      id: "ord-2222-bbbb",
      order_number: "CBC-2026-000102",
      status: "PENDING",
      status_display: "Pending",
      payment_status: "PENDING",
      payment_status_display: "Pending Payment",
      currency: "INR",
      subtotal: "15000.00",
      total: "15000.00",
      item_count: 1,
      customer: {
        id: "cust-2",
        email: "rohit@example.com",
        display_name: "Rohit Verma",
        phone: "9812345678",
      },
      created_at: "2026-10-24T11:00:00Z",
      updated_at: "2026-10-24T11:00:00Z",
    },
  ],
};

describe("AdminOrdersClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    vi.mocked(adminApi.getAdminOrders).mockResolvedValue(mockOrdersResponse);
  });

  it("renders page header and operational summary", async () => {
    render(<AdminOrdersClient />);

    expect(screen.getByRole("heading", { name: "Orders" })).toBeDefined();
    expect(
      screen.getByText(/Patron orders, payment verification states/i)
    ).toBeDefined();
  });

  it("fetches and displays order rows with real backend data", async () => {
    render(<AdminOrdersClient />);

    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenCalled();
    });

    // Check order numbers
    expect(await screen.findByText("CBC-2026-000101")).toBeDefined();
    expect(await screen.findByText("CBC-2026-000102")).toBeDefined();

    // Check customer names and emails
    expect(screen.getByText("Priya Sharma")).toBeDefined();
    expect(screen.getByText(/priya@example.com/)).toBeDefined();
    expect(screen.getByText("Rohit Verma")).toBeDefined();
    expect(screen.getByText(/rohit@example.com/)).toBeDefined();

    // Check statuses
    expect(screen.getAllByText("Confirmed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Paid").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pending Payment").length).toBeGreaterThanOrEqual(1);

    // Check item counts
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);

    // Check links to detail page
    const detailLinks = screen.getAllByRole("link", { name: /view/i });
    expect(detailLinks.length).toBe(2);
    expect(detailLinks[0].getAttribute("href")).toBe("/admin/orders/ord-1111-aaaa");
    expect(detailLinks[1].getAttribute("href")).toBe("/admin/orders/ord-2222-bbbb");
  });

  it("submits search and updates URL query parameters", async () => {
    render(<AdminOrdersClient />);

    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenCalled();
    });

    const searchInput = screen.getByPlaceholderText(
      /Search by order #, customer name, email/i
    );
    fireEvent.change(searchInput, { target: { value: "CBC-2026-000101" } });
    fireEvent.submit(searchInput.closest("form")!);

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("search=CBC-2026-000101"),
      expect.anything()
    );
  });

  it("changes order status filter and updates URL query parameters", async () => {
    render(<AdminOrdersClient />);

    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenCalled();
    });

    const statusSelect = screen.getByLabelText(/Status:/i);
    fireEvent.change(statusSelect, { target: { value: "CONFIRMED" } });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("status=CONFIRMED"),
      expect.anything()
    );
  });

  it("changes payment status filter and updates URL query parameters", async () => {
    render(<AdminOrdersClient />);

    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenCalled();
    });

    const paymentSelect = screen.getByLabelText(/Payment:/i);
    fireEvent.change(paymentSelect, { target: { value: "PAID" } });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("payment_status=PAID"),
      expect.anything()
    );
  });

  it("changes date range and updates URL query parameters", async () => {
    render(<AdminOrdersClient />);

    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenCalled();
    });

    const fromInput = screen.getByLabelText(/From:/i);
    fireEvent.change(fromInput, { target: { value: "2026-10-01" } });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("created_after=2026-10-01"),
      expect.anything()
    );
  });

  it("changes ordering sort selector and updates URL query parameters", async () => {
    render(<AdminOrdersClient />);

    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenCalled();
    });

    const sortSelect = screen.getByLabelText(/Sort:/i);
    fireEvent.change(sortSelect, { target: { value: "-total" } });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("ordering=-total"),
      expect.anything()
    );
  });

  it("renders empty state when no orders match", async () => {
    vi.mocked(adminApi.getAdminOrders).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<AdminOrdersClient />);

    expect(await screen.findByText("No Orders Found")).toBeDefined();
  });

  it("renders error state and retries on action click", async () => {
    vi.mocked(adminApi.getAdminOrders).mockRejectedValueOnce(
      new Error("Database connection error")
    );

    render(<AdminOrdersClient />);

    expect(await screen.findByText("Failed to Load Orders")).toBeDefined();
    expect(screen.getByText("Database connection error")).toBeDefined();

    // Now mock success for retry
    vi.mocked(adminApi.getAdminOrders).mockResolvedValueOnce(mockOrdersResponse);

    const retryBtn = screen.getByRole("button", { name: /retry loading/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenCalledTimes(2);
    });
  });

  it("handles pagination when multiple pages exist", async () => {
    vi.mocked(adminApi.getAdminOrders).mockResolvedValueOnce({
      count: 45,
      next: "/api/v1/admin/orders/?page=2",
      previous: null,
      results: mockOrdersResponse.results,
    });

    render(<AdminOrdersClient />);

    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenCalled();
    });

    // Check pagination bar
    expect(screen.getByText(/Showing/i)).toBeDefined();
    expect(screen.getByText("45")).toBeDefined();

    // Click next page
    const nextBtn = screen.getByRole("button", { name: /next page/i });
    fireEvent.click(nextBtn);

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("page=2"),
      expect.anything()
    );
  });
});
