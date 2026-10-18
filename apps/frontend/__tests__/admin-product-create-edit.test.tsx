import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminCreateProductClient from "@/components/admin/products/AdminCreateProductClient";
import AdminEditProductClient from "@/components/admin/products/AdminEditProductClient";
import * as adminApi from "@/lib/api/admin";
import * as catalogApi from "@/lib/api/catalog";
import { ApiClientError } from "@/lib/api/client";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/products/new",
  useSearchParams: () => mockSearchParams,
}));

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    createAdminProduct: vi.fn(),
    getAdminProduct: vi.fn(),
    updateAdminProduct: vi.fn(),
    uploadAdminMedia: vi.fn(),
    createProductImage: vi.fn(),
    updateProductImage: vi.fn(),
    deleteProductImage: vi.fn(),
    reorderProductImages: vi.fn(),
    createProductVariant: vi.fn(),
    updateProductVariant: vi.fn(),
    deleteProductVariant: vi.fn(),
    adjustVariantStock: vi.fn(),
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
} as unknown as any;

const mockCollections = {
  count: 2,
  next: null,
  previous: null,
  results: [
    { id: "col-1", name: "Festive Drop", slug: "festive-drop" },
    { id: "col-2", name: "Summer Breeze", slug: "summer-breeze" },
  ],
} as unknown as any;

const mockExistingProduct: adminApi.AdminProductDetail = {
  id: "prod-uuid-1",
  name: "Crimson Anarkali Suit",
  slug: "crimson-anarkali-suit",
  description: "Handcrafted crimson suit made with premium silk.",
  status: "draft",
  is_active: true,
  category: { id: "cat-1", name: "Kurtis", slug: "kurtis" },
  category_id: "cat-1",
  collections: [{ id: "col-1", name: "Festive Drop", slug: "festive-drop" }],
  collection_ids: ["col-1"],
  images: [
    {
      id: "img-1",
      product: "prod-uuid-1",
      image_url: "/media/crimson-1.jpg",
      alt_text: "Front View",
      ordering: 0,
      is_primary: true,
    },
    {
      id: "img-2",
      product: "prod-uuid-1",
      image_url: "/media/crimson-2.jpg",
      alt_text: "Back View",
      ordering: 1,
      is_primary: false,
    },
  ],
  variants: [
    {
      id: "var-1",
      product: "prod-uuid-1",
      sku: "CRIMSON-M",
      size: "M",
      color: "Crimson",
      retail_price: "2499.00",
      sale_price: "1999.00",
      is_active: true,
      inventory: {
        quantity_available: 8,
        quantity_reserved: 1,
        stock_status: "in_stock",
        threshold: 5,
      },
    },
  ],
  readiness: {
    is_ready_for_publish: true,
    has_title: true,
    has_category: true,
    has_active_variants: true,
    has_prices: true,
    has_images: true,
    issues: [],
  },
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-15T12:00:00Z",
};

describe("Admin Product Create Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    vi.mocked(catalogApi.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(catalogApi.getCollections).mockResolvedValue(mockCollections);
  });

  it("renders the create form and populates category/collection options", async () => {
    render(<AdminCreateProductClient />);

    expect(screen.getByText("Create Product")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Silhouette Overview")).toBeInTheDocument();
      expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/URL Slug Handle/i)).toBeInTheDocument();
      expect(screen.getByText("Kurtis")).toBeInTheDocument();
      expect(screen.getByText("Dresses")).toBeInTheDocument();
      expect(screen.getByText("Festive Drop")).toBeInTheDocument();
      expect(screen.getByText("Summer Breeze")).toBeInTheDocument();
    });
  });

  it("auto-generates slug from name unless manually edited", async () => {
    render(<AdminCreateProductClient />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Product Name/i);
    const slugInput = screen.getByLabelText(/URL Slug Handle/i) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Silk Floral Kurti" } });
    expect(slugInput.value).toBe("silk-floral-kurti");

    // Manually edit slug
    fireEvent.change(slugInput, { target: { value: "custom-slug-override" } });
    fireEvent.change(nameInput, { target: { value: "Silk Floral Kurti Updated" } });
    // Slug should retain custom override
    expect(slugInput.value).toBe("custom-slug-override");
  });

  it("creates a product and redirects on success", async () => {
    vi.mocked(adminApi.createAdminProduct).mockResolvedValue({
      ...mockExistingProduct,
      name: "Chanderi Cotton Kurti",
      slug: "chanderi-cotton-kurti",
      status: "draft",
    });

    render(<AdminCreateProductClient />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: "Chanderi Cotton Kurti" },
    });

    const submitBtn = screen.getByRole("button", { name: /Create Product/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.createAdminProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Chanderi Cotton Kurti",
          slug: "chanderi-cotton-kurti",
          status: "draft",
          is_active: true,
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/admin/products/prod-uuid-1/edit?created=true");
    });
  });

  it("displays field-level validation errors from the API", async () => {
    const errorWithDetails = new ApiClientError(
      "Validation failed",
      400,
      "VALIDATION_ERROR",
      {
        slug: ["Product with this slug already exists."],
      }
    );

    vi.mocked(adminApi.createAdminProduct).mockRejectedValue(errorWithDetails);

    render(<AdminCreateProductClient />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: "Duplicate Product" },
    });

    const submitBtn = screen.getByRole("button", { name: /Create Product/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Product with this slug already exists.")).toBeInTheDocument();
    });
  });

  it("prevents duplicate submissions while request is in flight", async () => {
    let resolvePromise: (val: adminApi.AdminProductDetail) => void;
    const pendingPromise = new Promise<adminApi.AdminProductDetail>((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(adminApi.createAdminProduct).mockReturnValue(pendingPromise);

    render(<AdminCreateProductClient />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: "In Flight Product" },
    });

    const submitBtn = screen.getByRole("button", { name: /Create Product/i });
    fireEvent.click(submitBtn);

    // Button should be disabled and show loading indicator
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/Creating silhouette\.\.\./i)).toBeInTheDocument();

    // Clicking again should not invoke createAdminProduct a second time
    fireEvent.click(submitBtn);
    expect(adminApi.createAdminProduct).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolvePromise!(mockExistingProduct);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });
});

describe("Admin Product Edit Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    vi.mocked(catalogApi.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(catalogApi.getCollections).mockResolvedValue(mockCollections);
    vi.mocked(adminApi.getAdminProduct).mockResolvedValue(mockExistingProduct);
  });

  it("loads existing product data into edit form", async () => {
    render(<AdminEditProductClient id="prod-uuid-1" />);

    // After loading completes
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Product Name/i) as HTMLInputElement;
      expect(nameInput.value).toBe("Crimson Anarkali Suit");

      const slugInput = screen.getByLabelText(/URL Slug Handle/i) as HTMLInputElement;
      expect(slugInput.value).toBe("crimson-anarkali-suit");

      const descInput = screen.getByLabelText(/Garment Description/i) as HTMLTextAreaElement;
      expect(descInput.value).toBe("Handcrafted crimson suit made with premium silk.");
    });
  });

  it("renders publication readiness card and tabs", async () => {
    render(<AdminEditProductClient id="prod-uuid-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("storefront-readiness-card")).toBeInTheDocument();
      expect(screen.getByText(/Storefront Publication Readiness/i)).toBeInTheDocument();
      expect(screen.getByText("Images & Gallery")).toBeInTheDocument();
      expect(screen.getByText("Options & Pricing")).toBeInTheDocument();
      expect(screen.getByText("Inventory & Stock")).toBeInTheDocument();
    });
  });

  it("navigates to Images & Gallery tab and displays existing images", async () => {
    render(<AdminEditProductClient id="prod-uuid-1" />);

    await waitFor(() => {
      expect(screen.getByText("Images & Gallery")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Images & Gallery"));

    await waitFor(() => {
      expect(screen.getByTestId("product-images-tab")).toBeInTheDocument();
      expect(screen.getByTestId("gallery-image-img-1")).toBeInTheDocument();
      expect(screen.getByTestId("gallery-image-img-2")).toBeInTheDocument();
      expect(screen.getByText("Primary")).toBeInTheDocument();
    });
  });

  it("navigates to Options & Pricing tab, showing INR prices and discounts", async () => {
    render(<AdminEditProductClient id="prod-uuid-1" />);

    await waitFor(() => {
      expect(screen.getByText("Options & Pricing")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Options & Pricing"));

    await waitFor(() => {
      expect(screen.getByTestId("product-variants-tab")).toBeInTheDocument();
      expect(screen.getAllByText("₹1,999.00").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("-20%")).toBeInTheDocument();
    });
  });

  it("allows adding a new variant with sale price validation", async () => {
    render(<AdminEditProductClient id="prod-uuid-1" />);

    await waitFor(() => {
      expect(screen.getByText("Options & Pricing")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Options & Pricing"));

    const addVariantBtn = await screen.findByRole("button", { name: /Add Variant/i });
    fireEvent.click(addVariantBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByLabelText(/SKU Identifier/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/SKU Identifier/i), {
      target: { value: "CRIMSON-L" },
    });
    fireEvent.change(screen.getByLabelText(/Regular Price/i), {
      target: { value: "2499.00" },
    });
    // Set invalid sale price (higher than regular)
    fireEvent.change(screen.getByLabelText(/Sale Price/i), {
      target: { value: "2999.00" },
    });

    const saveBtn = screen.getByRole("button", { name: "Create Variant" });
    fireEvent.click(saveBtn);

    // Should fail validation on client side
    await waitFor(() => {
      expect(
        screen.getByText("Sale price must be strictly lower than regular retail price.")
      ).toBeInTheDocument();
    });
  });

  it("navigates to Inventory & Stock tab and shows stock statuses", async () => {
    render(<AdminEditProductClient id="prod-uuid-1" />);

    await waitFor(() => {
      expect(screen.getByText("Inventory & Stock")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Inventory & Stock"));

    await waitFor(() => {
      expect(screen.getByTestId("product-inventory-tab")).toBeInTheDocument();
      expect(screen.getByText("8 units")).toBeInTheDocument();
      expect(screen.getByText("1 reserved")).toBeInTheDocument();
      expect(screen.getByText("In Stock")).toBeInTheDocument();
      expect(screen.getByText("Adjust Stock")).toBeInTheDocument();
    });
  });

  it("opens stock adjustment modal and warns when setting quantity to zero", async () => {
    render(<AdminEditProductClient id="prod-uuid-1" />);

    await waitFor(() => {
      expect(screen.getByText("Inventory & Stock")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Inventory & Stock"));

    const adjustBtn = await screen.findByRole("button", { name: /Adjust Stock/i });
    fireEvent.click(adjustBtn);

    // Modal appears
    await waitFor(() => {
      expect(screen.getByLabelText(/New Available Quantity/i)).toBeInTheDocument();
    });

    // Set quantity to 0
    fireEvent.change(screen.getByLabelText(/New Available Quantity/i), {
      target: { value: "0" },
    });

    const applyBtn = screen.getByRole("button", { name: "Apply Adjustment" });
    fireEvent.click(applyBtn);

    // Warning confirmation appears
    await waitFor(() => {
      expect(screen.getByText(/Variant Will Become Unavailable/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirm Sold Out" })).toBeInTheDocument();
    });
  });

  it("updates product successfully and shows success banner", async () => {
    const updatedProduct = {
      ...mockExistingProduct,
      name: "Crimson Anarkali Suit - Festive Edition",
      status: "active" as const,
    };
    vi.mocked(adminApi.updateAdminProduct).mockResolvedValue(updatedProduct);

    render(<AdminEditProductClient id="prod-uuid-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: "Crimson Anarkali Suit - Festive Edition" },
    });

    const submitBtn = screen.getByRole("button", { name: /Save Product Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.updateAdminProduct).toHaveBeenCalledWith(
        "prod-uuid-1",
        expect.objectContaining({
          name: "Crimson Anarkali Suit - Festive Edition",
        })
      );
      expect(
        screen.getByText('Changes to "Crimson Anarkali Suit - Festive Edition" saved successfully as ACTIVE.')
      ).toBeInTheDocument();
    });
  });

  it("displays 404 Not Found state when product does not exist", async () => {
    vi.mocked(adminApi.getAdminProduct).mockRejectedValue(
      new ApiClientError("Product not found", 404)
    );

    render(<AdminEditProductClient id="non-existent-id" />);

    await waitFor(() => {
      expect(screen.getByText(/Product Silhouette Not Found/i)).toBeInTheDocument();
      expect(screen.getByText("Return to Products Catalog")).toBeInTheDocument();
    });
  });
});
