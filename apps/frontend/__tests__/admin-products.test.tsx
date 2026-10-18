import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminProductsClient from "@/components/admin/products/AdminProductsClient";
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
  usePathname: () => "/admin/products",
  useSearchParams: () => mockSearchParams,
}));

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminProducts: vi.fn(),
  };
});

vi.mock("@/lib/api/catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof catalogApi>();
  return {
    ...actual,
    getCategories: vi.fn(),
    getCollections: vi.fn(),
  };
});

const mockCategories = {
  count: 2,
  next: null,
  previous: null,
  results: [
    { id: "cat-1", name: "Kurtis", slug: "kurtis" },
    { id: "cat-2", name: "Dresses", slug: "dresses" },
  ],
};

const mockCollections = {
  count: 1,
  next: null,
  previous: null,
  results: [
    { id: "col-1", name: "Festive Drop", slug: "festive-drop" },
  ],
};

const mockProductsResponse = {
  count: 25,
  next: "/api/v1/admin/products/?page=2",
  previous: null,
  results: [
    {
      id: "prod-uuid-1",
      name: "Crimson Anarkali Suit",
      slug: "crimson-anarkali-suit",
      description: "Handcrafted crimson suit.",
      status: "active" as const,
      is_active: true,
      category: { id: "cat-1", name: "Kurtis", slug: "kurtis" },
      collections: [{ id: "col-1", name: "Festive Drop", slug: "festive-drop" }],
      primary_image: {
        id: "img-1",
        image_url: "/assets/products/crimson-1.jpg",
        alt_text: "Crimson Anarkali front view",
        ordering: 0,
        is_primary: true,
      },
      sku: "CRIM-ANR-S-001",
      skus: ["CRIM-ANR-S-001", "CRIM-ANR-M-001"],
      min_price: "2499.00",
      max_price: "2699.00",
      variant_count: 2,
      stock_summary: {
        total_available: 20,
        total_reserved: 3,
        status: "in_stock" as const,
      },
      created_at: "2026-10-10T10:00:00Z",
      updated_at: "2026-10-16T12:00:00Z",
    },
    {
      id: "prod-uuid-2",
      name: "Emerald Velvet Gown",
      slug: "emerald-velvet-gown",
      description: "Luxe velvet evening gown.",
      status: "draft" as const,
      is_active: true,
      category: { id: "cat-2", name: "Dresses", slug: "dresses" },
      collections: [],
      primary_image: null,
      sku: "EMR-VEL-L-002",
      skus: ["EMR-VEL-L-002"],
      min_price: "4999.00",
      max_price: "4999.00",
      variant_count: 1,
      stock_summary: {
        total_available: 3,
        total_reserved: 0,
        status: "low_stock" as const,
      },
      created_at: "2026-10-12T10:00:00Z",
      updated_at: "2026-10-15T15:30:00Z",
    },
  ],
};

describe("AdminProductsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    vi.mocked(catalogApi.getCategories).mockResolvedValue(mockCategories as any);
    vi.mocked(catalogApi.getCollections).mockResolvedValue(mockCollections as any);
    vi.mocked(adminApi.getAdminProducts).mockResolvedValue(mockProductsResponse);
  });

  it("renders product list with accurate names, prices, SKUs, inventory and statuses", async () => {
    render(<AdminProductsClient />);

    // Check loading indicator or wait for product rows
    await waitFor(() => {
      expect(screen.getAllByText("Crimson Anarkali Suit").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("Emerald Velvet Gown").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CRIM-ANR-S-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("EMR-VEL-L-002").length).toBeGreaterThan(0);

    // Verify stock summary numbers
    expect(screen.getAllByText(/20 in stock/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 left \(Low\)/i).length).toBeGreaterThan(0);

    // Verify publication status badges
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);

    // Verify price formatting (INR)
    expect(screen.getAllByText(/₹2,499\.00/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹4,999\.00/i).length).toBeGreaterThan(0);

    // Verify primary thumbnail
    const imgs = screen.getAllByAltText("Crimson Anarkali front view");
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs[0].getAttribute("src")).toBe("/assets/products/crimson-1.jpg");
  });

  it("renders working link to /admin/products/new and edit links to /admin/products/[id]/edit", async () => {
    render(<AdminProductsClient />);

    await waitFor(() => {
      expect(screen.getAllByText("Crimson Anarkali Suit").length).toBeGreaterThan(0);
    });

    // Check Add Product link
    const addProductLink = screen.getByRole("link", { name: /Add Product/i });
    expect(addProductLink.getAttribute("href")).toBe("/admin/products/new");

    // Check Edit link for first product
    const editLinks = screen.getAllByRole("link", { name: /Edit/i });
    const hasCorrectEditHref = editLinks.some(
      (link) => link.getAttribute("href") === "/admin/products/prod-uuid-1/edit"
    );
    expect(hasCorrectEditHref).toBe(true);
  });

  it("handles search input submission and updates query parameters", async () => {
    render(<AdminProductsClient />);

    await waitFor(() => {
      expect(screen.getAllByText("Crimson Anarkali Suit").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/Search silhouettes by name, SKU, slug.../i);
    fireEvent.change(searchInput, { target: { value: "Anarkali" } });
    fireEvent.submit(searchInput.closest("form")!);

    expect(mockReplace).toHaveBeenCalledWith("/admin/products?search=Anarkali&page=1", {
      scroll: false,
    });
  });

  it("updates query parameters when changing status, category, or collection filter", async () => {
    render(<AdminProductsClient />);

    await waitFor(() => {
      expect(screen.getAllByText("Crimson Anarkali Suit").length).toBeGreaterThan(0);
    });

    // Status filter
    const statusSelect = screen.getByLabelText(/Filter by Status/i);
    fireEvent.change(statusSelect, { target: { value: "draft" } });
    expect(mockReplace).toHaveBeenCalledWith("/admin/products?status=draft&page=1", {
      scroll: false,
    });

    // Category filter
    const categorySelect = screen.getByLabelText(/Filter by Category/i);
    fireEvent.change(categorySelect, { target: { value: "kurtis" } });
    expect(mockReplace).toHaveBeenCalledWith("/admin/products?category=kurtis&page=1", {
      scroll: false,
    });
  });

  it("renders pagination controls and updates page when clicking next", async () => {
    render(<AdminProductsClient />);

    await waitFor(() => {
      expect(
        screen.getByText((_, element) => element?.textContent === "Showing 1 to 20 of 25 silhouettes")
      ).toBeDefined();
    });

    const nextButton = screen.getByRole("button", { name: /Next Page/i });
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);
    expect(mockReplace).toHaveBeenCalledWith("/admin/products?page=2", { scroll: false });
  });

  it("renders empty atelier catalog state when total count is 0 without filters", async () => {
    vi.mocked(adminApi.getAdminProducts).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<AdminProductsClient />);

    await waitFor(() => {
      expect(screen.getByText(/Atelier catalog is empty/i)).toBeDefined();
    });

    expect(screen.getByRole("link", { name: /Add Your First Product/i })).toBeDefined();
  });

  it("renders no matching results state when filters are active and returns 0 products", async () => {
    mockSearchParams = new URLSearchParams("search=NonExistentQuery");

    vi.mocked(adminApi.getAdminProducts).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<AdminProductsClient />);

    await waitFor(() => {
      expect(screen.getByText(/No matching products found/i)).toBeDefined();
    });

    const resetButtons = screen.getAllByRole("button", { name: /Clear all filters/i });
    expect(resetButtons.length).toBeGreaterThan(0);

    fireEvent.click(resetButtons[0]);
    expect(mockReplace).toHaveBeenCalledWith("/admin/products", { scroll: false });
  });

  it("renders error state when API request fails and provides working retry button", async () => {
    vi.mocked(adminApi.getAdminProducts).mockRejectedValueOnce(
      new Error("Gateway connection timed out")
    );

    render(<AdminProductsClient />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load atelier catalog/i)).toBeDefined();
    });

    expect(screen.getByText(/Gateway connection timed out/i)).toBeDefined();

    // Click retry
    const retryButton = screen.getByRole("button", { name: /Retry loading/i });
    vi.mocked(adminApi.getAdminProducts).mockResolvedValueOnce(mockProductsResponse);

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getAllByText("Crimson Anarkali Suit").length).toBeGreaterThan(0);
    });
  });
});
