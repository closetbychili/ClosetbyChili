import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProductReadinessCard from "@/components/admin/products/ProductReadinessCard";
import ProductForm from "@/components/admin/products/ProductForm";
import AdminProductsTable from "@/components/admin/products/AdminProductsTable";
import type { AdminProductDetail, AdminProductListItem, ProductReadiness } from "@/lib/api/admin";
import * as adminApi from "@/lib/api/admin";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/products",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock admin API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    validateAdminProduct: vi.fn(),
    publishAdminProduct: vi.fn(),
    archiveAdminProduct: vi.fn(),
    draftAdminProduct: vi.fn(),
  };
});

describe("Product Readiness & Validation (Sprint A2.6)", () => {
  const mockInvalidReadiness: ProductReadiness = {
    is_ready: false,
    can_publish: false,
    summary: {
      total_errors: 3,
      total_warnings: 1,
    },
    sections: {
      basic: {
        is_valid: false,
        errors: [
          {
            code: "MISSING_CATEGORY",
            section: "basic",
            field: "category",
            message: "Category taxonomy must be assigned before publication.",
          },
        ],
        warnings: [],
      },
      images: {
        is_valid: false,
        errors: [
          {
            code: "MISSING_PRIMARY_IMAGE",
            section: "images",
            field: "images",
            message: "Product must have a designated primary image.",
          },
        ],
        warnings: [
          {
            code: "MISSING_IMAGE_ALT_TEXT",
            section: "images",
            field: "alt_text",
            message: "Image is missing alt text.",
          },
        ],
      },
      variants: {
        is_valid: false,
        errors: [
          {
            code: "INVALID_RETAIL_PRICE",
            section: "variants",
            field: "retail_price",
            message: "Variant must have regular retail price > ₹0.",
          },
        ],
        warnings: [],
      },
      inventory: {
        is_valid: true,
        errors: [],
        warnings: [],
      },
    },
    errors: [
      {
        code: "MISSING_CATEGORY",
        section: "basic",
        field: "category",
        message: "Category taxonomy must be assigned before publication.",
      },
      {
        code: "MISSING_PRIMARY_IMAGE",
        section: "images",
        field: "images",
        message: "Product must have a designated primary image.",
      },
      {
        code: "INVALID_RETAIL_PRICE",
        section: "variants",
        field: "retail_price",
        message: "Variant must have regular retail price > ₹0.",
      },
    ],
    warnings: [
      {
        code: "MISSING_IMAGE_ALT_TEXT",
        section: "images",
        field: "alt_text",
        message: "Image is missing alt text.",
      },
    ],
  };

  const mockValidReadiness: ProductReadiness = {
    is_ready: true,
    can_publish: true,
    summary: {
      total_errors: 0,
      total_warnings: 0,
    },
    sections: {
      basic: { is_valid: true, errors: [], warnings: [] },
      images: { is_valid: true, errors: [], warnings: [] },
      variants: { is_valid: true, errors: [], warnings: [] },
      inventory: { is_valid: true, errors: [], warnings: [] },
    },
    errors: [],
    warnings: [],
  };

  describe("ProductReadinessCard Component", () => {
    it("renders grouped validation errors by section with error codes", () => {
      render(<ProductReadinessCard readiness={mockInvalidReadiness} status="draft" />);

      expect(screen.getByTestId("storefront-readiness-card")).toBeDefined();
      expect(screen.getByText("Storefront Publication Readiness")).toBeDefined();
      expect(screen.getByText("1 / 4 Sections Ready")).toBeDefined();

      // Check section headers
      expect(screen.getByTestId("readiness-section-basic")).toBeDefined();
      expect(screen.getByTestId("readiness-section-images")).toBeDefined();
      expect(screen.getByTestId("readiness-section-variants")).toBeDefined();
      expect(screen.getByTestId("readiness-section-inventory")).toBeDefined();

      // Check error codes & messages
      expect(screen.getByText("MISSING_CATEGORY")).toBeDefined();
      expect(screen.getByText("Category taxonomy must be assigned before publication.")).toBeDefined();
      expect(screen.getByText("MISSING_PRIMARY_IMAGE")).toBeDefined();
      expect(screen.getByText("INVALID_RETAIL_PRICE")).toBeDefined();
    });

    it("triggers onNavigateSection when clicking a validation error or section edit", () => {
      const onNavigate = vi.fn();
      render(
        <ProductReadinessCard
          readiness={mockInvalidReadiness}
          status="draft"
          onNavigateSection={onNavigate}
        />
      );

      // Click on specific error item
      const errorBtn = screen.getByText("Category taxonomy must be assigned before publication.");
      fireEvent.click(errorBtn);
      expect(onNavigate).toHaveBeenCalledWith("basic", "category");
    });

    it("triggers onValidateClick when Validate Product button is clicked", () => {
      const onValidate = vi.fn();
      render(
        <ProductReadinessCard
          readiness={mockInvalidReadiness}
          status="draft"
          onValidateClick={onValidate}
        />
      );

      const validateBtn = screen.getByTestId("validate-product-btn");
      fireEvent.click(validateBtn);
      expect(onValidate).toHaveBeenCalledTimes(1);
    });

    it("displays success state and CTA when product meets all publication requirements", () => {
      const onPublish = vi.fn();
      render(
        <ProductReadinessCard
          readiness={mockValidReadiness}
          status="draft"
          onPublishClick={onPublish}
        />
      );

      expect(screen.getByText("Ready to Publish")).toBeDefined();
      expect(screen.getByText("All validation criteria satisfied. Ready to activate on the live storefront.")).toBeDefined();

      const publishBtn = screen.getByText("Publish Now");
      fireEvent.click(publishBtn);
      expect(onPublish).toHaveBeenCalledTimes(1);
    });
  });

  describe("ProductForm Component Integration", () => {
    const mockProduct: AdminProductDetail = {
      id: "prod-1234",
      name: "Handwoven Silk Kurti",
      slug: "handwoven-silk-kurti",
      description: "Fine silk garment",
      status: "draft",
      is_active: true,
      category: { id: "cat-1", name: "Kurtis", slug: "kurtis" },
      category_id: "cat-1",
      collections: [],
      collection_ids: [],
      images: [
        {
          id: "img-1",
          product: "prod-1234",
          image_url: "https://example.com/img1.jpg",
          alt_text: "Silk Kurti Front",
          ordering: 0,
          is_primary: true,
        },
      ],
      variants: [
        {
          id: "var-1",
          product: "prod-1234",
          sku: "SLK-KRT-M",
          size: "M",
          color: "Gold",
          retail_price: "2499.00",
          sale_price: null,
          is_active: true,
          inventory: {
            quantity_available: 10,
            quantity_reserved: 0,
            stock_status: "in_stock",
            threshold: 5,
          },
        },
      ],
      readiness: mockInvalidReadiness,
      created_at: "2026-10-18T10:00:00Z",
      updated_at: "2026-10-18T10:00:00Z",
    };

    it("triggers validateAdminProduct when clicking Validate button in form header", async () => {
      vi.mocked(adminApi.validateAdminProduct).mockResolvedValueOnce(mockValidReadiness);

      render(
        <ProductForm
          initialData={mockProduct}
          categories={[{ id: "cat-1", name: "Kurtis", slug: "kurtis" }]}
          collections={[]}
          onSubmit={vi.fn()}
          isEdit={true}
        />
      );

      const validateBtn = screen.getByTestId("form-validate-product-btn");
      fireEvent.click(validateBtn);

      await waitFor(() => {
        expect(adminApi.validateAdminProduct).toHaveBeenCalledWith("prod-1234");
      });
    });

    it("shows Restore to Draft button for archived products", async () => {
      const archivedProduct: AdminProductDetail = {
        ...mockProduct,
        status: "archived",
      };
      vi.mocked(adminApi.draftAdminProduct).mockResolvedValueOnce({
        message: "Product restored to draft",
        product: { ...archivedProduct, status: "draft" },
      });

      render(
        <ProductForm
          initialData={archivedProduct}
          categories={[]}
          collections={[]}
          onSubmit={vi.fn()}
          isEdit={true}
        />
      );

      const restoreBtn = screen.getByTestId("form-restore-draft-btn");
      expect(restoreBtn).toBeDefined();

      fireEvent.click(restoreBtn);
      await waitFor(() => {
        expect(adminApi.draftAdminProduct).toHaveBeenCalledWith("prod-1234");
      });
    });
  });

  describe("AdminProductsTable Component Quick Actions", () => {
    const mockListProducts: AdminProductListItem[] = [
      {
        id: "prod-draft-ready",
        name: "Ready Draft Anarkali",
        slug: "ready-draft-anarkali",
        description: "",
        status: "draft",
        is_active: true,
        category: { id: "cat-1", name: "Anarkalis", slug: "anarkalis" },
        collections: [],
        primary_image: null,
        sku: "RDY-ANR-01",
        skus: ["RDY-ANR-01"],
        min_price: "4999.00",
        max_price: "4999.00",
        variant_count: 1,
        stock_summary: {
          total_available: 5,
          total_reserved: 0,
          status: "in_stock",
        },
        readiness: {
          is_ready: true,
          can_publish: true,
          total_errors: 0,
          total_warnings: 0,
        },
        created_at: "2026-10-18T10:00:00Z",
        updated_at: "2026-10-18T10:00:00Z",
      },
      {
        id: "prod-active",
        name: "Active Velvet Saree",
        slug: "active-velvet-saree",
        description: "",
        status: "active",
        is_active: true,
        category: { id: "cat-1", name: "Sarees", slug: "sarees" },
        collections: [],
        primary_image: null,
        sku: "ACT-SAR-01",
        skus: ["ACT-SAR-01"],
        min_price: "7999.00",
        max_price: "7999.00",
        variant_count: 1,
        stock_summary: {
          total_available: 10,
          total_reserved: 0,
          status: "in_stock",
        },
        created_at: "2026-10-18T10:00:00Z",
        updated_at: "2026-10-18T10:00:00Z",
      },
      {
        id: "prod-archived",
        name: "Archived Vintage Dupatta",
        slug: "archived-vintage-dupatta",
        description: "",
        status: "archived",
        is_active: false,
        category: null,
        collections: [],
        primary_image: null,
        sku: "ARC-DUP-01",
        skus: ["ARC-DUP-01"],
        min_price: "1999.00",
        max_price: "1999.00",
        variant_count: 1,
        stock_summary: {
          total_available: 0,
          total_reserved: 0,
          status: "out_of_stock",
        },
        created_at: "2026-10-18T10:00:00Z",
        updated_at: "2026-10-18T10:00:00Z",
      },
    ];

    it("displays readiness badges for draft products", () => {
      render(
        <AdminProductsTable
          products={mockListProducts}
          loading={false}
          error={null}
          onRetry={vi.fn()}
          isFiltered={false}
          onResetFilters={vi.fn()}
        />
      );

      expect(screen.getByTestId("badge-ready-to-publish")).toBeDefined();
    });

    it("opens confirmation modal and executes publish action", async () => {
      const onRefresh = vi.fn();
      vi.mocked(adminApi.publishAdminProduct).mockResolvedValueOnce({
        message: "Published",
        product: {} as any,
        validation: mockValidReadiness,
      });

      render(
        <AdminProductsTable
          products={mockListProducts}
          loading={false}
          error={null}
          onRetry={vi.fn()}
          onRefresh={onRefresh}
          isFiltered={false}
          onResetFilters={vi.fn()}
        />
      );

      // Find quick publish button on ready draft product
      const publishBtns = screen.getAllByTestId("quick-publish-btn");
      fireEvent.click(publishBtns[0]);

      // Verify modal is open
      expect(screen.getByTestId("lifecycle-confirm-modal")).toBeDefined();
      expect(screen.getByText("Publish Product")).toBeDefined();

      // Confirm publish
      const confirmBtn = screen.getByTestId("modal-confirm-btn");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(adminApi.publishAdminProduct).toHaveBeenCalledWith("prod-draft-ready");
        expect(onRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it("opens confirmation modal and executes archive action", async () => {
      const onRefresh = vi.fn();
      vi.mocked(adminApi.archiveAdminProduct).mockResolvedValueOnce({
        message: "Archived",
        product: {} as any,
      });

      render(
        <AdminProductsTable
          products={mockListProducts}
          loading={false}
          error={null}
          onRetry={vi.fn()}
          onRefresh={onRefresh}
          isFiltered={false}
          onResetFilters={vi.fn()}
        />
      );

      // Find archive button on active product
      const archiveBtns = screen.getAllByTestId("quick-archive-btn");
      fireEvent.click(archiveBtns[0]);

      expect(screen.getByTestId("lifecycle-confirm-modal")).toBeDefined();
      expect(screen.getByText("Archive Product")).toBeDefined();

      const confirmBtn = screen.getByTestId("modal-confirm-btn");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(adminApi.archiveAdminProduct).toHaveBeenCalledWith("prod-active");
        expect(onRefresh).toHaveBeenCalledTimes(1);
      });
    });
  });
});
