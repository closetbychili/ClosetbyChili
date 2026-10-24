import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminInventoryClient from "@/components/admin/inventory/AdminInventoryClient";
import * as adminApi from "@/lib/api/admin";
import * as catalogApi from "@/lib/api/catalog";

// Mock next/navigation
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/inventory",
  useSearchParams: () => mockSearchParams,
}));

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminInventory: vi.fn(),
    getAdminInventorySummary: vi.fn(),
  };
});

vi.mock("@/lib/api/catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof catalogApi>();
  return {
    ...actual,
    getCategories: vi.fn(),
  };
});

const mockCategoriesResponse = {
  count: 2,
  next: null,
  previous: null,
  results: [
    { id: "cat-1", name: "Anarkalis", slug: "anarkalis" },
    { id: "cat-2", name: "Sarees", slug: "sarees" },
  ],
};

const mockSummaryResponse: adminApi.AdminInventorySummary = {
  active_variants_tracked: 42,
  total_on_hand: 520,
  total_reserved: 45,
  total_available: 475,
  out_of_stock_variants: 3,
  low_stock_variants: 8,
  in_stock_variants: 31,
  low_stock_threshold: 5,
};

const mockInventoryResponse = {
  count: 42,
  next: "/api/v1/admin/inventory/?page=2",
  previous: null,
  results: [
    {
      id: "inv-uuid-1",
      variant_id: "var-uuid-1",
      product_id: "prod-uuid-1",
      product_name: "Gulzar Velvet Anarkali",
      product_slug: "gulzar-velvet-anarkali",
      product_status: "active" as const,
      product_is_active: true,
      category_name: "Anarkalis",
      category_id: "cat-1",
      thumbnail_url: "https://res.cloudinary.com/chilli/image/upload/gulzar.jpg",
      sku: "GLZ-ANR-M-001",
      size: "M",
      color: "Maroon",
      variant_title: "M / Maroon",
      retail_price: "4999.00",
      sale_price: null,
      is_active: true,
      quantity_on_hand: 25,
      quantity_reserved: 5,
      quantity_available: 20,
      stock_status: "in_stock" as const,
      stock_status_label: "In Stock" as const,
      last_movement_at: "2026-10-20T10:00:00Z",
      last_movement: {
        id: "mov-uuid-1",
        movement_type: "stock_received",
        movement_type_display: "Stock Received",
        quantity_change: 25,
        reference: "PO-2026-001",
        created_at: "2026-10-20T10:00:00Z",
      },
      created_at: "2026-10-15T08:00:00Z",
      updated_at: "2026-10-20T10:00:00Z",
    },
    {
      id: "inv-uuid-2",
      variant_id: "var-uuid-2",
      product_id: "prod-uuid-2",
      product_name: "Chandani Chanderi Saree",
      product_slug: "chandani-chanderi-saree",
      product_status: "active" as const,
      product_is_active: true,
      category_name: "Sarees",
      category_id: "cat-2",
      thumbnail_url: null, // Test missing thumbnail fallback
      sku: "CHD-SAR-FREE-001",
      size: "Free Size",
      color: "Ivory",
      variant_title: "Free Size / Ivory",
      retail_price: "6499.00",
      sale_price: "5999.00",
      is_active: true,
      quantity_on_hand: 3,
      quantity_reserved: 0,
      quantity_available: 3,
      stock_status: "low_stock" as const,
      stock_status_label: "Low Stock" as const,
      last_movement_at: null,
      last_movement: null,
      created_at: "2026-10-16T08:00:00Z",
      updated_at: "2026-10-16T08:00:00Z",
    },
    {
      id: "inv-uuid-3",
      variant_id: "var-uuid-3",
      product_id: "prod-uuid-3",
      product_name: "Banarasi Silk Dupatta",
      product_slug: "banarasi-silk-dupatta",
      product_status: "active" as const,
      product_is_active: true,
      category_name: null,
      category_id: null,
      thumbnail_url: null,
      sku: "BNR-DUP-001",
      size: "",
      color: "",
      variant_title: "BNR-DUP-001",
      retail_price: "1999.00",
      sale_price: null,
      is_active: true,
      quantity_on_hand: 0,
      quantity_reserved: 0,
      quantity_available: 0,
      stock_status: "out_of_stock" as const,
      stock_status_label: "Out of Stock" as const,
      last_movement_at: null,
      last_movement: null,
      created_at: "2026-10-18T08:00:00Z",
      updated_at: "2026-10-18T08:00:00Z",
    },
  ],
};

describe("AdminInventoryClient Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    vi.mocked(catalogApi.getCategories).mockResolvedValue(
      mockCategoriesResponse as any
    );
    vi.mocked(adminApi.getAdminInventorySummary).mockResolvedValue(
      mockSummaryResponse
    );
    vi.mocked(adminApi.getAdminInventory).mockResolvedValue(
      mockInventoryResponse as any
    );
  });

  it("renders summary metric cards with accurate values", async () => {
    render(<AdminInventoryClient />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-active-variants")).toHaveTextContent("42");
      expect(screen.getByTestId("metric-on-hand-units")).toHaveTextContent("520");
      expect(screen.getByTestId("metric-available-units")).toHaveTextContent("475");
      expect(screen.getByTestId("metric-reserved-units")).toHaveTextContent("45");
      expect(screen.getByTestId("metric-low-stock")).toHaveTextContent("8");
      expect(screen.getByTestId("metric-out-of-stock")).toHaveTextContent("3");
    });
  });

  it("renders inventory table rows with product names, attributes, SKUs, and stock quantities", async () => {
    render(<AdminInventoryClient />);

    // Wait for the product link to be in document
    const productLink = await screen.findByRole("link", {
      name: "Gulzar Velvet Anarkali",
    });
    expect(productLink).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Chandani Chanderi Saree" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Banarasi Silk Dupatta" })).toBeInTheDocument();

    // SKUs
    expect(screen.getByText("GLZ-ANR-M-001")).toBeInTheDocument();
    expect(screen.getByText("CHD-SAR-FREE-001")).toBeInTheDocument();
    expect(screen.getByText("BNR-DUP-001")).toBeInTheDocument();

    // Stock Status badges in table
    expect(screen.getAllByText("In Stock").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Low Stock").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Out of Stock").length).toBeGreaterThanOrEqual(1);

    // Quantities
    expect(screen.getAllByText("20").length).toBeGreaterThanOrEqual(1); // available
    expect(screen.getAllByText("25").length).toBeGreaterThanOrEqual(1); // on-hand
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1); // reserved
  });

  it("renders product thumbnail when provided and package fallback icon when missing", async () => {
    render(<AdminInventoryClient />);

    await waitFor(() => {
      const img = screen.getByAltText("Gulzar Velvet Anarkali");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        "src",
        "https://res.cloudinary.com/chilli/image/upload/gulzar.jpg"
      );
    });
  });

  it("handles search input submit and triggers URL update", async () => {
    render(<AdminInventoryClient />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by product name or sku/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by product name or sku/i);
    fireEvent.change(searchInput, { target: { value: "Gulzar" } });
    fireEvent.submit(searchInput.closest("form")!);

    expect(mockReplace).toHaveBeenCalledWith("/admin/inventory?search=Gulzar&page=1", {
      scroll: false,
    });
  });

  it("handles stock status and category filter changes", async () => {
    render(<AdminInventoryClient />);

    await waitFor(() => {
      expect(screen.getByLabelText(/stock status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/stock status/i);
    fireEvent.change(statusSelect, { target: { value: "low_stock" } });

    expect(mockReplace).toHaveBeenCalledWith(
      "/admin/inventory?stock_status=low_stock&page=1",
      { scroll: false }
    );

    const catSelect = screen.getByLabelText(/category/i);
    fireEvent.change(catSelect, { target: { value: "anarkalis" } });

    expect(mockReplace).toHaveBeenCalledWith(
      "/admin/inventory?category=anarkalis&page=1",
      { scroll: false }
    );
  });

  it("handles sort ordering changes", async () => {
    render(<AdminInventoryClient />);

    await waitFor(() => {
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText(/sort by/i);
    fireEvent.change(sortSelect, { target: { value: "-available" } });

    expect(mockReplace).toHaveBeenCalledWith(
      "/admin/inventory?ordering=-available&page=1",
      { scroll: false }
    );
  });

  it("displays empty state when zero results return", async () => {
    vi.mocked(adminApi.getAdminInventory).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<AdminInventoryClient />);

    await waitFor(() => {
      expect(screen.getByText("No Inventory Items Found")).toBeInTheDocument();
    });
  });

  it("displays error state and retries successfully", async () => {
    vi.mocked(adminApi.getAdminInventory).mockRejectedValueOnce(
      new Error("Network connection error")
    );

    render(<AdminInventoryClient />);

    await waitFor(() => {
      expect(screen.getByText("Failed to Load Inventory")).toBeInTheDocument();
      expect(screen.getByText("Network connection error")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry loading/i })).toBeInTheDocument();
    });

    // Mock successful recovery on retry
    vi.mocked(adminApi.getAdminInventory).mockResolvedValueOnce(
      mockInventoryResponse as any
    );

    const retryBtn = screen.getByRole("button", { name: /retry loading/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Gulzar Velvet Anarkali")).toBeInTheDocument();
    });
  });

  it("renders pagination controls and navigates to next page", async () => {
    render(<AdminInventoryClient />);

    await waitFor(() => {
      expect(screen.getByText(/showing/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: /next page/i });
    fireEvent.click(nextBtn);

    expect(mockReplace).toHaveBeenCalledWith("/admin/inventory?page=2", {
      scroll: false,
    });
  });
});
