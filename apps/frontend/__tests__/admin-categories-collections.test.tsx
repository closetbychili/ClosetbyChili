import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminCategoriesClient from "@/components/admin/categories/AdminCategoriesClient";
import AdminCollectionsClient from "@/components/admin/collections/AdminCollectionsClient";
import ProductForm from "@/components/admin/products/ProductForm";
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
  usePathname: () => "/admin/categories",
  useSearchParams: () => mockSearchParams,
}));

// Mock admin API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminCategories: vi.fn(),
    getAdminCategory: vi.fn(),
    createAdminCategory: vi.fn(),
    updateAdminCategory: vi.fn(),
    deleteAdminCategory: vi.fn(),
    getAdminCollections: vi.fn(),
    getAdminCollection: vi.fn(),
    createAdminCollection: vi.fn(),
    updateAdminCollection: vi.fn(),
    deleteAdminCollection: vi.fn(),
    getAdminCollectionProducts: vi.fn(),
    assignProductToCollection: vi.fn(),
    removeProductFromCollection: vi.fn(),
    getAdminProducts: vi.fn(),
  };
});

const mockCategoriesData: adminApi.AdminCategory[] = [
  {
    id: "cat-1",
    name: "Ethnic Wear",
    slug: "ethnic-wear",
    description: "Traditional wear silhouettes",
    parent: null,
    parent_slug: null,
    parent_name: null,
    children: [{ id: "cat-2", name: "Kurtis", slug: "kurtis" }],
    is_active: true,
    product_count: 0,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "cat-2",
    name: "Kurtis",
    slug: "kurtis",
    description: "Casual and festive kurtis",
    parent: "cat-1",
    parent_slug: "ethnic-wear",
    parent_name: "Ethnic Wear",
    children: [],
    is_active: true,
    product_count: 5,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "cat-3",
    name: "Winter Capes",
    slug: "winter-capes",
    description: "Seasonal outer layers",
    parent: null,
    parent_slug: null,
    parent_name: null,
    children: [],
    is_active: false,
    product_count: 0,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  },
];

const mockCollectionsData: adminApi.AdminCollection[] = [
  {
    id: "col-1",
    name: "Festive Couture 2026",
    slug: "festive-couture-2026",
    description: "Celebratory silk silhouettes",
    is_active: true,
    product_count: 4,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "col-2",
    name: "Summer Linen Drop",
    slug: "summer-linen-drop",
    description: "Breathable airy cuts",
    is_active: false,
    product_count: 0,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  },
];

const mockCollectionProductsData: adminApi.AdminCollectionProduct[] = [
  {
    id: "cp-1",
    product_id: "prod-1",
    name: "Crimson Velvet Kurti",
    slug: "crimson-velvet-kurti",
    status: "active",
    sku: "CRIM-VEL-S",
    primary_image: null,
    is_product_active: true,
    ordering: 0,
    is_active: true,
    created_at: "2026-08-01T00:00:00Z",
  },
];

describe("Admin Category Management Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    vi.mocked(adminApi.getAdminCategories).mockResolvedValue({
      count: 3,
      next: null,
      previous: null,
      results: mockCategoriesData,
    });
  });

  it("renders categories listing with names, parents, product counts, and status badges", async () => {
    render(<AdminCategoriesClient />);

    expect(screen.getByRole("heading", { name: "Categories", level: 1 })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Kurtis")).toBeDefined();
      expect(screen.getAllByText("Ethnic Wear").length).toBeGreaterThan(1);
      expect(screen.getByText("Winter Capes")).toBeDefined();
    });

    // Parent category check
    expect(screen.getAllByText("Primary Root").length).toBe(2);
    expect(screen.getAllByText("Ethnic Wear").length).toBeGreaterThan(1); // One as main row, one as parent badge

    // Product counts check
    expect(screen.getByText("5 products")).toBeDefined();
    expect(screen.getAllByText("0 products").length).toBe(2);

    // Status badges
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
  });

  it("allows searching and filtering categories", async () => {
    render(<AdminCategoriesClient />);

    await waitFor(() => {
      expect(screen.getByText("Kurtis")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText("Search by category name or slug...");
    fireEvent.change(searchInput, { target: { value: "kurti" } });

    expect(mockReplace).toHaveBeenCalledWith("/admin/categories?search=kurti", { scroll: false });
  });

  it("opens create modal, auto-suggests slug from name, and submits successfully", async () => {
    vi.mocked(adminApi.createAdminCategory).mockResolvedValue({
      id: "cat-4",
      name: "Sharara Sets",
      slug: "sharara-sets",
      description: "Festive flairs",
      parent: null,
      parent_slug: null,
      parent_name: null,
      children: [],
      is_active: true,
      product_count: 0,
      created_at: "2026-08-02T00:00:00Z",
      updated_at: "2026-08-02T00:00:00Z",
    });

    render(<AdminCategoriesClient />);

    await waitFor(() => {
      expect(screen.getByText("Kurtis")).toBeDefined();
    });

    // Click "+ New Category"
    const newBtn = screen.getByRole("button", { name: /new category/i });
    fireEvent.click(newBtn);

    expect(screen.getByText("Create New Category")).toBeDefined();

    // Type name
    const nameInput = screen.getByPlaceholderText("e.g. Kurtas & Tunics");
    fireEvent.change(nameInput, { target: { value: "Sharara Sets" } });

    // Verify auto-slug generated
    const slugInput = screen.getByPlaceholderText("kurtas-tunics") as HTMLInputElement;
    expect(slugInput.value).toBe("sharara-sets");

    // Submit
    const submitBtn = screen.getByRole("button", { name: /create category/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.createAdminCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Sharara Sets",
          slug: "sharara-sets",
        })
      );
    });
  });

  it("opens edit modal with populated category and saves updates", async () => {
    vi.mocked(adminApi.updateAdminCategory).mockResolvedValue({
      ...mockCategoriesData[1],
      name: "Kurtis & Tunics",
    });

    render(<AdminCategoriesClient />);

    await waitFor(() => {
      expect(screen.getByText("Kurtis")).toBeDefined();
    });

    const editBtn = document.getElementById("edit-category-kurtis")!;
    fireEvent.click(editBtn);

    expect(screen.getByText(/Edit Category:/)).toBeDefined();

    const nameInput = screen.getByDisplayValue("Kurtis");
    fireEvent.change(nameInput, { target: { value: "Kurtis & Tunics" } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(adminApi.updateAdminCategory).toHaveBeenCalledWith(
        "cat-2",
        expect.objectContaining({
          name: "Kurtis & Tunics",
        })
      );
    });
  });

  it("handles blocked deletion when category has assigned products and offers deactivation", async () => {
    vi.mocked(adminApi.updateAdminCategory).mockResolvedValue({
      ...mockCategoriesData[1],
      is_active: false,
    });

    render(<AdminCategoriesClient />);

    await waitFor(() => {
      expect(screen.getByText("Kurtis")).toBeDefined();
    });

    // Click delete on Kurtis (which has 5 products)
    const deleteBtn = document.getElementById("delete-category-kurtis")!;
    fireEvent.click(deleteBtn);

    // Modal shows blocked warning
    await waitFor(() => {
      expect(screen.getByText(/Deletion Blocked: Assigned to 5 product\(s\)/)).toBeDefined();
      expect(screen.getByRole("button", { name: "Deactivate Instead" })).toBeDefined();
    });

    // Click Deactivate Instead
    const deactivateBtn = screen.getByRole("button", { name: "Deactivate Instead" });
    fireEvent.click(deactivateBtn);

    await waitFor(() => {
      expect(adminApi.updateAdminCategory).toHaveBeenCalledWith("cat-2", { is_active: false });
    });
  });

  it("allows safe deletion of an unreferenced category without products", async () => {
    vi.mocked(adminApi.deleteAdminCategory).mockResolvedValue(undefined);

    render(<AdminCategoriesClient />);

    await waitFor(() => {
      expect(screen.getByText("Winter Capes")).toBeDefined();
    });

    // Delete Winter Capes (has 0 products)
    const deleteBtn = document.getElementById("delete-category-winter-capes")!;
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/Delete Category: Winter Capes/)).toBeDefined();
      expect(screen.getByRole("button", { name: "Confirm Delete" })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));

    await waitFor(() => {
      expect(adminApi.deleteAdminCategory).toHaveBeenCalledWith("cat-3");
    });
  });
});

describe("Admin Collection Management Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    vi.mocked(adminApi.getAdminCollections).mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: mockCollectionsData,
    });
    vi.mocked(adminApi.getAdminCollectionProducts).mockResolvedValue(mockCollectionProductsData);
    vi.mocked(adminApi.getAdminProducts).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: "prod-2",
          name: "Emerald Anarkali",
          slug: "emerald-anarkali",
          description: "",
          status: "active",
          is_active: true,
          category: null,
          collections: [],
          primary_image: null,
          sku: "EMR-ANR-M",
          skus: ["EMR-ANR-M"],
          min_price: "4999.00",
          max_price: "4999.00",
          variant_count: 1,
          stock_summary: { total_available: 5, total_reserved: 0, status: "in_stock" },
          created_at: "2026-08-01T00:00:00Z",
          updated_at: "2026-08-01T00:00:00Z",
        },
      ],
    });
  });

  it("renders collection list with names, slugs, descriptions, and product counts", async () => {
    render(<AdminCollectionsClient />);

    await waitFor(() => {
      expect(screen.getByText("Festive Couture 2026")).toBeDefined();
      expect(screen.getByText("Summer Linen Drop")).toBeDefined();
    });

    expect(screen.getByText("4 products")).toBeDefined();
    expect(screen.getByText("0 products")).toBeDefined();
  });

  it("creates a new collection with auto-slug", async () => {
    vi.mocked(adminApi.createAdminCollection).mockResolvedValue({
      id: "col-3",
      name: "Diwali Glamour",
      slug: "diwali-glamour",
      description: "Festive drop",
      is_active: true,
      product_count: 0,
      created_at: "2026-08-02T00:00:00Z",
      updated_at: "2026-08-02T00:00:00Z",
    });

    render(<AdminCollectionsClient />);

    await waitFor(() => {
      expect(screen.getByText("Festive Couture 2026")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /new collection/i }));

    const nameInput = screen.getByPlaceholderText("e.g. Festive Couture 2026");
    fireEvent.change(nameInput, { target: { value: "Diwali Glamour" } });

    fireEvent.click(screen.getByRole("button", { name: /create collection/i }));

    await waitFor(() => {
      expect(adminApi.createAdminCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Diwali Glamour",
          slug: "diwali-glamour",
        })
      );
    });
  });

  it("opens manage products modal, assigns product, and removes product", async () => {
    vi.mocked(adminApi.assignProductToCollection).mockResolvedValue({
      id: "cp-2",
      product_id: "prod-2",
      name: "Emerald Anarkali",
      slug: "emerald-anarkali",
      status: "active",
      sku: "EMR-ANR-M",
      primary_image: null,
      is_product_active: true,
      ordering: 1,
      is_active: true,
      created_at: "2026-08-02T00:00:00Z",
    });
    vi.mocked(adminApi.removeProductFromCollection).mockResolvedValue(undefined);

    render(<AdminCollectionsClient />);

    await waitFor(() => {
      expect(screen.getByText("Festive Couture 2026")).toBeDefined();
    });

    // Click manage products
    const manageBtn = document.getElementById("manage-products-festive-couture-2026")!;
    fireEvent.click(manageBtn);

    await waitFor(() => {
      expect(screen.getByText(/Manage Products: Festive Couture 2026/)).toBeDefined();
      expect(screen.getByText("Crimson Velvet Kurti")).toBeDefined();
    });

    // Select prod-2 to assign
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "prod-2" } });

    const assignBtn = screen.getByRole("button", { name: /assign product/i });
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(adminApi.assignProductToCollection).toHaveBeenCalledWith("col-1", {
        product_id: "prod-2",
      });
    });

    // Remove crimson velvet kurti
    const removeBtn = document.getElementById("remove-product-btn-crimson-velvet-kurti")!;
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(adminApi.removeProductFromCollection).toHaveBeenCalledWith("col-1", "prod-1");
    });
  });

  it("blocks deletion when collection contains products and offers deactivation", async () => {
    render(<AdminCollectionsClient />);

    await waitFor(() => {
      expect(screen.getByText("Festive Couture 2026")).toBeDefined();
    });

    // Click delete on Festive Couture (contains 4 products)
    const deleteBtn = document.getElementById("delete-collection-festive-couture-2026")!;
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/Deletion Blocked: Contains 4 product\(s\)/)).toBeDefined();
      expect(screen.getByRole("button", { name: "Deactivate Instead" })).toBeDefined();
    });
  });
});

describe("ProductForm Taxonomy Integration", () => {
  it("renders category hierarchy and collection chips, and preserves selection", () => {
    const mockOnSubmit = vi.fn();

    render(
      <ProductForm
        initialData={{
          id: "prod-1",
          name: "Embroidered Kurta",
          slug: "embroidered-kurta",
          description: "Fine silk",
          status: "draft",
          is_active: true,
          category: { id: "cat-2", name: "Kurtis", slug: "kurtis" },
          category_id: "cat-2",
          collections: [{ id: "col-1", name: "Festive Couture 2026", slug: "festive-couture-2026" }],
          collection_ids: ["col-1"],
          created_at: "2026-08-01T00:00:00Z",
          updated_at: "2026-08-01T00:00:00Z",
        }}
        categories={[
          { id: "cat-1", name: "Ethnic Wear", slug: "ethnic-wear" },
          { id: "cat-2", name: "Kurtis", slug: "kurtis" },
        ]}
        collections={[
          { id: "col-1", name: "Festive Couture 2026", slug: "festive-couture-2026" },
          { id: "col-2", name: "Summer Linen Drop", slug: "summer-linen-drop" },
        ]}
        onSubmit={mockOnSubmit}
        isEdit={true}
      />
    );

    // Verify category select is populated with Kurtis selected
    const select = screen.getByLabelText(/category/i) as HTMLSelectElement;
    expect(select.value).toBe("cat-2");

    // Verify collection chip is selected
    const festiveChip = screen.getByRole("button", { name: /Festive Couture 2026/ });
    expect(festiveChip).toBeDefined();

    // Toggle summer linen drop
    const summerChip = screen.getByRole("button", { name: /Summer Linen Drop/ });
    fireEvent.click(summerChip);

    // Save changes
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        category_id: "cat-2",
        collection_ids: expect.arrayContaining(["col-1", "col-2"]),
      })
    );
  });
});
