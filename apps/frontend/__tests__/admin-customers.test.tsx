import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminCustomersClient from "@/components/admin/customers/AdminCustomersClient";
import AdminCustomerDetailClient from "@/components/admin/customers/AdminCustomerDetailClient";
import * as adminApi from "@/lib/api/admin";

// Mock next/navigation
const mockReplace = vi.fn();
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/customers",
  useSearchParams: () => mockSearchParams,
}));

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminCustomers: vi.fn(),
    getAdminCustomerDetail: vi.fn(),
  };
});

const mockCustomersList: {
  count: number;
  next: string | null;
  previous: string | null;
  results: adminApi.AdminCustomer[];
} = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      email: "priya@example.com",
      display_name: "Priya Sharma",
      phone: "+919876543210",
      role: "CUSTOMER",
      is_active: true,
      created_at: "2026-01-15T10:00:00Z",
      updated_at: "2026-01-15T10:00:00Z",
      total_order_count: 5,
      successful_paid_order_count: 4,
      total_paid_spend: "12500.00",
      latest_order_date: "2026-10-20T18:00:00Z",
      currency: "INR",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      email: "rahul@example.com",
      display_name: "Rahul Verma",
      phone: "",
      role: "CUSTOMER",
      is_active: false,
      created_at: "2026-03-10T12:00:00Z",
      updated_at: "2026-03-10T12:00:00Z",
      total_order_count: 0,
      successful_paid_order_count: 0,
      total_paid_spend: "0.00",
      latest_order_date: null,
      currency: "INR",
    },
  ],
};

const mockCustomerDetail: adminApi.AdminCustomerDetail = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "priya@example.com",
  display_name: "Priya Sharma",
  phone: "+919876543210",
  role: "CUSTOMER",
  is_active: true,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  total_order_count: 5,
  successful_paid_order_count: 4,
  total_paid_spend: "12500.00",
  latest_order_date: "2026-10-20T18:00:00Z",
  currency: "INR",
  supabase_user_id: "sb-1111",
};

describe("AdminCustomersClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders customer directory table and displays metrics correctly", async () => {
    vi.mocked(adminApi.getAdminCustomers).mockResolvedValueOnce(mockCustomersList);

    render(<AdminCustomersClient />);

    expect(screen.getByText("Loading customer accounts directory...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeDefined();
      expect(screen.getByText("priya@example.com")).toBeDefined();
      expect(screen.getByText("Rahul Verma")).toBeDefined();
      expect(screen.getByText("rahul@example.com")).toBeDefined();
    });

    // Check KPIs
    expect(screen.getByText("Active Accounts")).toBeDefined();
    // Paid spend formatting check
    expect(screen.getAllByText("₹12,500.00").length).toBeGreaterThan(0);
    // Orders count check
    expect(screen.getByText("4 paid")).toBeDefined();
  });

  it("handles empty state when no customers match filters", async () => {
    vi.mocked(adminApi.getAdminCustomers).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<AdminCustomersClient />);

    await waitFor(() => {
      expect(screen.getByText("No patrons found")).toBeDefined();
    });
  });

  it("handles error state and allows retry", async () => {
    vi.mocked(adminApi.getAdminCustomers).mockRejectedValueOnce(new Error("Network failure"));

    render(<AdminCustomersClient />);

    await waitFor(() => {
      expect(screen.getByText("Network failure")).toBeDefined();
    });

    // Mock successful retry
    vi.mocked(adminApi.getAdminCustomers).mockResolvedValueOnce(mockCustomersList);

    const retryButton = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeDefined();
    });
  });

  it("updates search query and filters, and triggers URL synchronization", async () => {
    vi.mocked(adminApi.getAdminCustomers).mockResolvedValue(mockCustomersList);

    render(<AdminCustomersClient />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(searchInput, { target: { value: "priya" } });

    // Wait for debounced search effect
    await waitFor(
      () => {
        expect(mockReplace).toHaveBeenCalledWith("/admin/customers?search=priya&page=1", {
          scroll: false,
        });
      },
      { timeout: 800 }
    );
  });

  it("filters by has_orders toggle and updates query", async () => {
    vi.mocked(adminApi.getAdminCustomers).mockResolvedValue(mockCustomersList);

    render(<AdminCustomersClient />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeDefined();
    });

    const select = screen.getByDisplayValue("Orders: All");
    fireEvent.change(select, { target: { value: "true" } });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/admin/customers?has_orders=true&page=1", {
        scroll: false,
      });
    });
  });

  it("changes sort option and calls API with appropriate sort param", async () => {
    vi.mocked(adminApi.getAdminCustomers).mockResolvedValue(mockCustomersList);

    render(<AdminCustomersClient />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeDefined();
    });

    const sortSelect = screen.getByDisplayValue("Sort: Newest Joined");
    fireEvent.change(sortSelect, { target: { value: "paid_spend_desc" } });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/admin/customers?sort=paid_spend_desc&page=1", {
        scroll: false,
      });
    });
  });

  it("renders detail navigation links to /admin/customers/[id]", async () => {
    vi.mocked(adminApi.getAdminCustomers).mockResolvedValueOnce(mockCustomersList);

    render(<AdminCustomersClient />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeDefined();
    });

    const links = screen.getAllByRole("link");
    const detailLink = links.find((l) =>
      l.getAttribute("href")?.includes("/admin/customers/11111111-1111-1111-1111-111111111111")
    );
    expect(detailLink).toBeDefined();
  });
});

describe("AdminCustomerDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders customer identity details and activity metrics", async () => {
    vi.mocked(adminApi.getAdminCustomerDetail).mockResolvedValueOnce(mockCustomerDetail);

    render(<AdminCustomerDetailClient customerId="11111111-1111-1111-1111-111111111111" />);

    expect(screen.getByText("Loading customer profile details...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Priya Sharma" })).toBeDefined();
      expect(screen.getByText("Customer account registered with priya@example.com")).toBeDefined();
      expect(screen.getByText("+919876543210")).toBeDefined();
    });

    // Check lifetime metrics
    expect(screen.getByText("₹12,500.00")).toBeDefined();
    expect(screen.getByText(/Paid purchases vs all orders/i)).toBeDefined();
    expect(screen.getByText(/\/ 5 total/i)).toBeDefined();
    expect(screen.getByText("CUSTOMER")).toBeDefined();
  });

  it("handles 404 customer not found with honest error banner", async () => {
    const errorWithStatus = new Error("Not found");
    (errorWithStatus as unknown as { status: number }).status = 404;
    vi.mocked(adminApi.getAdminCustomerDetail).mockRejectedValueOnce(errorWithStatus);

    render(<AdminCustomerDetailClient customerId="non-existent-id" />);

    await waitFor(() => {
      expect(screen.getByText("Customer Not Found")).toBeDefined();
      expect(screen.getByText("Back to Customer Directory")).toBeDefined();
    });
  });

  it("displays honest placeholder for future sprints when clicking on orders tab", async () => {
    vi.mocked(adminApi.getAdminCustomerDetail).mockResolvedValueOnce(mockCustomerDetail);

    render(<AdminCustomerDetailClient customerId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Priya Sharma" })).toBeDefined();
    });

    const ordersTab = screen.getByRole("button", { name: /order history/i });
    fireEvent.click(ordersTab);

    expect(
      screen.getByText(/Granular order breakdown, item-level fulfillment tracking/i)
    ).toBeDefined();
  });
});
