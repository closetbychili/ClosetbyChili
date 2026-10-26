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
    getAdminCustomerNotes: vi.fn(),
    createAdminCustomerNote: vi.fn(),
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

const mockNotesList: {
  count: number;
  next: string | null;
  previous: string | null;
  results: adminApi.AdminCustomerNote[];
} = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: "note-1111-1111",
      customer_id: "11111111-1111-1111-1111-111111111111",
      author_id: "staff-001",
      author_name: "Atelier Staff Member",
      author_email: "staff@closetbychili.com",
      body: "Customer requested sleeve length alteration (+2 inches) on order CB-2026-1001.",
      created_at: "2026-10-21T10:00:00Z",
    },
    {
      id: "note-2222-2222",
      customer_id: "11111111-1111-1111-1111-111111111111",
      author_id: "admin-001",
      author_name: "Admin User",
      author_email: "admin@closetbychili.com",
      body: "Confirmed exchange delivery completed without issues.",
      created_at: "2026-10-22T14:30:00Z",
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
  total_orders: 5,
  paid_orders: 4,
  pending_orders: 1,
  cancelled_orders: 0,
  total_paid_spend: "12500.00",
  average_order_value: "3125.00",
  latest_order_date: "2026-10-20T18:00:00Z",
  currency: "INR",
  supabase_user_id: "sb-1111",
  addresses: [
    {
      id: "addr-1111",
      full_name: "Priya Sharma Home",
      phone: "+919876543210",
      address_line1: "Flat 402, Lotus Apartments",
      address_line2: "Park Street",
      landmark: "Near City Center",
      city: "Kolkata",
      state: "West Bengal",
      postal_code: "700016",
      country: "India",
      address_type: "HOME",
      is_default: true,
      created_at: "2026-01-16T12:00:00Z",
      updated_at: "2026-01-16T12:00:00Z",
    },
    {
      id: "addr-2222",
      full_name: "Priya Work",
      phone: "+919876543211",
      address_line1: "Tower B, Salt Lake",
      address_line2: "Sector V",
      landmark: "",
      city: "Kolkata",
      state: "West Bengal",
      postal_code: "700091",
      country: "India",
      address_type: "OFFICE",
      is_default: false,
      created_at: "2026-02-01T10:00:00Z",
      updated_at: "2026-02-01T10:00:00Z",
    },
  ],
  orders: {
    count: 3,
    page: 1,
    page_size: 2,
    total_pages: 2,
    has_next: true,
    has_previous: false,
    results: [
      {
        id: "ord-1111",
        order_number: "CBC-2026-000001",
        status: "CONFIRMED",
        status_display: "Confirmed",
        payment_status: "PAID",
        payment_status_display: "Paid",
        currency: "INR",
        subtotal: "5000.00",
        discount: "500.00",
        shipping_amount: "0.00",
        tax_amount: "0.00",
        total: "4500.00",
        coupon_code: "WELCOME10",
        item_count: 2,
        shipment: {
          id: "ship-1111",
          status: "SHIPPED",
          status_display: "Shipped",
          carrier: "BlueDart",
          tracking_number: "BD12345678",
          tracking_url: "https://bluedart.example.com/track/BD12345678",
          dispatched_at: "2026-10-21T10:00:00Z",
          delivered_at: null,
        },
        created_at: "2026-10-20T18:00:00Z",
        updated_at: "2026-10-21T10:00:00Z",
      },
      {
        id: "ord-2222",
        order_number: "CBC-2026-000002",
        status: "DELIVERED",
        status_display: "Delivered",
        payment_status: "PAID",
        payment_status_display: "Paid",
        currency: "INR",
        subtotal: "8000.00",
        discount: "0.00",
        shipping_amount: "0.00",
        tax_amount: "0.00",
        total: "8000.00",
        coupon_code: "",
        item_count: 3,
        shipment: null,
        created_at: "2026-09-10T14:00:00Z",
        updated_at: "2026-09-14T11:00:00Z",
      },
    ],
  },
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

    expect(screen.getByText("Active Accounts")).toBeDefined();
    expect(screen.getAllByText("₹12,500.00").length).toBeGreaterThan(0);
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
    vi.mocked(adminApi.getAdminCustomerNotes).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
  });

  it("renders customer identity details, financial summary, and AOV", async () => {
    vi.mocked(adminApi.getAdminCustomerDetail).mockResolvedValueOnce(mockCustomerDetail);

    render(<AdminCustomerDetailClient customerId="11111111-1111-1111-1111-111111111111" />);

    expect(screen.getByText("Loading customer profile details...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Priya Sharma" })).toBeDefined();
      expect(screen.getByText("Customer account registered with priya@example.com")).toBeDefined();
      expect(screen.getByText("+919876543210")).toBeDefined();
    });

    // Check financial metrics
    expect(screen.getByText("₹12,500.00")).toBeDefined();
    expect(screen.getByText("₹3,125.00")).toBeDefined(); // AOV
    expect(screen.getByText(/Paid purchases vs all orders/i)).toBeDefined();
    expect(screen.getByText(/\/ 5 total/i)).toBeDefined();
    expect(screen.getByText("CUSTOMER")).toBeDefined();
  });

  it("renders order history table, shipment tracking, and order detail link", async () => {
    vi.mocked(adminApi.getAdminCustomerDetail).mockResolvedValueOnce(mockCustomerDetail);

    render(<AdminCustomerDetailClient customerId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Priya Sharma" })).toBeDefined();
    });

    const ordersTab = screen.getByRole("button", { name: /order history/i });
    fireEvent.click(ordersTab);

    // Order numbers must be rendered as links
    await waitFor(() => {
      expect(screen.getByText("CBC-2026-000001")).toBeDefined();
      expect(screen.getByText("CBC-2026-000002")).toBeDefined();
    });

    // Shipment info
    expect(screen.getByText("BlueDart")).toBeDefined();
    expect(screen.getByText("BD12345678")).toBeDefined();
    expect(screen.getByText("No shipment yet")).toBeDefined();

    // Link to order inspect
    const links = screen.getAllByRole("link");
    const inspectLink = links.find((l) => l.getAttribute("href") === "/admin/orders/ord-1111");
    expect(inspectLink).toBeDefined();

    // Pagination controls present
    expect(screen.getByRole("button", { name: /next/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDefined();
  });

  it("renders saved addresses grid with default address badge", async () => {
    vi.mocked(adminApi.getAdminCustomerDetail).mockResolvedValueOnce(mockCustomerDetail);

    render(<AdminCustomerDetailClient customerId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Priya Sharma" })).toBeDefined();
    });

    const addressesTab = screen.getByRole("button", { name: /saved addresses/i });
    fireEvent.click(addressesTab);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma Home")).toBeDefined();
      expect(screen.getByText("Priya Work")).toBeDefined();
    });

    expect(screen.getByText("Default Address")).toBeDefined();
    expect(screen.getByText("Flat 402, Lotus Apartments")).toBeDefined();
    expect(screen.getByText(/Kolkata, West Bengal - 700016/i)).toBeDefined();
    expect(screen.getByText("HOME")).toBeDefined();
    expect(screen.getByText("OFFICE")).toBeDefined();
  });

  it("handles empty states for customer with zero orders and zero addresses", async () => {
    const emptyCustomerDetail: adminApi.AdminCustomerDetail = {
      ...mockCustomerDetail,
      total_orders: 0,
      total_order_count: 0,
      paid_orders: 0,
      successful_paid_order_count: 0,
      total_paid_spend: "0.00",
      average_order_value: "0.00",
      addresses: [],
      orders: {
        count: 0,
        page: 1,
        page_size: 10,
        total_pages: 1,
        has_next: false,
        has_previous: false,
        results: [],
      },
    };

    vi.mocked(adminApi.getAdminCustomerDetail).mockResolvedValueOnce(emptyCustomerDetail);

    render(<AdminCustomerDetailClient customerId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Priya Sharma" })).toBeDefined();
    });

    // Check zero state on Orders tab
    const ordersTab = screen.getByRole("button", { name: /order history/i });
    fireEvent.click(ordersTab);
    expect(screen.getByText("No purchase history found")).toBeDefined();

    // Check zero state on Addresses tab
    const addressesTab = screen.getByRole("button", { name: /saved addresses/i });
    fireEvent.click(addressesTab);
    expect(screen.getByText("No saved addresses")).toBeDefined();
  });

  it("handles 404 customer not found with error banner", async () => {
    const errorWithStatus = new Error("Not found");
    (errorWithStatus as unknown as { status: number }).status = 404;
    vi.mocked(adminApi.getAdminCustomerDetail).mockRejectedValueOnce(errorWithStatus);

    render(<AdminCustomerDetailClient customerId="non-existent-id" />);

    await waitFor(() => {
      expect(screen.getByText("Customer Not Found")).toBeDefined();
      expect(screen.getByText("Back to Customer Directory")).toBeDefined();
    });
  });

  it("renders internal notes tab with confidential warning banner, author, and timestamp", async () => {
    vi.mocked(adminApi.getAdminCustomerDetail).mockResolvedValueOnce(mockCustomerDetail);
    vi.mocked(adminApi.getAdminCustomerNotes).mockResolvedValue(mockNotesList);

    render(<AdminCustomerDetailClient customerId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Priya Sharma" })).toBeDefined();
    });

    const notesTab = screen.getByRole("button", { name: /internal notes/i });
    fireEvent.click(notesTab);

    await waitFor(() => {
      expect(screen.getByText(/Confidential Internal Atelier & Support Context/i)).toBeDefined();
      expect(screen.getByText("Atelier Staff Member")).toBeDefined();
      expect(
        screen.getByText("Customer requested sleeve length alteration (+2 inches) on order CB-2026-1001.")
      ).toBeDefined();
      expect(screen.getByText("Admin User")).toBeDefined();
      expect(
        screen.getByText("Confirmed exchange delivery completed without issues.")
      ).toBeDefined();
    });

    expect(screen.getAllByText("Internal Only").length).toBeGreaterThan(0);
    expect(screen.getByText("Interaction History Ledger")).toBeDefined();
  });

  it("allows staff to compose and submit an internal note, refreshing the ledger", async () => {
    vi.mocked(adminApi.getAdminCustomerDetail).mockResolvedValueOnce(mockCustomerDetail);
    vi.mocked(adminApi.getAdminCustomerNotes).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    const createdNote: adminApi.AdminCustomerNote = {
      id: "note-3333-3333",
      customer_id: "11111111-1111-1111-1111-111111111111",
      author_id: "staff-001",
      author_name: "Staff Member",
      author_email: "staff@closetbychili.com",
      body: "Spoke with client regarding bespoke bridal dupatta matching.",
      created_at: "2026-10-23T11:00:00Z",
    };
    vi.mocked(adminApi.createAdminCustomerNote).mockResolvedValueOnce(createdNote);

    render(<AdminCustomerDetailClient customerId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Priya Sharma" })).toBeDefined();
    });

    const notesTab = screen.getByRole("button", { name: /internal notes/i });
    fireEvent.click(notesTab);

    await waitFor(() => {
      expect(screen.getByText("No internal notes yet")).toBeDefined();
    });

    const textarea = screen.getByPlaceholderText(/Type internal customer note/i);
    const submitBtn = screen.getByRole("button", { name: /add note/i });

    expect(submitBtn).toHaveProperty("disabled", true);

    fireEvent.change(textarea, {
      target: { value: "Spoke with client regarding bespoke bridal dupatta matching." },
    });

    expect(submitBtn).toHaveProperty("disabled", false);

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.createAdminCustomerNote).toHaveBeenCalledWith(
        "11111111-1111-1111-1111-111111111111",
        "Spoke with client regarding bespoke bridal dupatta matching."
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("Spoke with client regarding bespoke bridal dupatta matching.")
      ).toBeDefined();
      expect(screen.getByText("Staff Member")).toBeDefined();
      expect(screen.getByText("Note recorded successfully")).toBeDefined();
    });
  });

  it("validates note input: prevents empty submission and handles over limit", async () => {
    vi.mocked(adminApi.getAdminCustomerDetail).mockResolvedValueOnce(mockCustomerDetail);
    vi.mocked(adminApi.getAdminCustomerNotes).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<AdminCustomerDetailClient customerId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Priya Sharma" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /internal notes/i }));

    const textarea = screen.getByPlaceholderText(/Type internal customer note/i);
    const submitBtn = screen.getByRole("button", { name: /add note/i });

    // Whitespace only
    fireEvent.change(textarea, { target: { value: "     " } });
    expect(submitBtn).toHaveProperty("disabled", true);

    // Over 3000 chars
    const overLimitText = "a".repeat(3001);
    fireEvent.change(textarea, { target: { value: overLimitText } });
    expect(submitBtn).toHaveProperty("disabled", true);
    expect(screen.getByText("3001 / 3000 characters")).toBeDefined();
  });

  it("handles empty notes state with helpful prompt", async () => {
    vi.mocked(adminApi.getAdminCustomerDetail).mockResolvedValueOnce(mockCustomerDetail);
    vi.mocked(adminApi.getAdminCustomerNotes).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<AdminCustomerDetailClient customerId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Priya Sharma" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /internal notes/i }));

    await waitFor(() => {
      expect(screen.getByText("No internal notes yet")).toBeDefined();
      expect(
        screen.getByText(/There are no internal support notes or interaction records/i)
      ).toBeDefined();
    });
  });

  it("handles API error when fetching notes and offers retry", async () => {
    vi.mocked(adminApi.getAdminCustomerDetail).mockResolvedValueOnce(mockCustomerDetail);
    vi.mocked(adminApi.getAdminCustomerNotes).mockRejectedValue(new Error("Database timeout"));

    render(<AdminCustomerDetailClient customerId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Priya Sharma" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /internal notes/i }));

    await waitFor(() => {
      expect(screen.getByText("Database timeout")).toBeDefined();
    });

    vi.mocked(adminApi.getAdminCustomerNotes).mockResolvedValue(mockNotesList);
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Atelier Staff Member")).toBeDefined();
    });
  });
});
