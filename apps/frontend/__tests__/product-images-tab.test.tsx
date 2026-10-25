import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ProductImagesTab from "@/components/admin/products/ProductImagesTab";
import ProductCard from "@/components/ProductCard";
import * as adminApi from "@/lib/api/admin";
import type { AdminProductImage } from "@/lib/api/admin";
import { mapProductToUi } from "@/lib/adapters/catalog-adapter";
import type { ProductListItem } from "@/lib/api/types";

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    uploadAdminProductImageFile: vi.fn(),
    uploadAdminMedia: vi.fn(),
    createProductImage: vi.fn(),
    updateProductImage: vi.fn(),
    deleteProductImage: vi.fn(),
    reorderProductImages: vi.fn(),
  };
});

describe("ProductImagesTab — Cloudinary Product Media Integration (Sprint A2.4)", () => {
  const mockProductId = "prod-uuid-123";

  const initialImages: AdminProductImage[] = [
    {
      id: "img-1",
      product: mockProductId,
      image_url: "https://res.cloudinary.com/demo/image/upload/v1/closet-by-chilli/products/front.jpg",
      public_id: "closet-by-chilli/products/front",
      alt_text: "Front view kurti",
      ordering: 0,
      is_primary: true,
      width: 1200,
      height: 1600,
      format: "jpg",
    },
    {
      id: "img-2",
      product: mockProductId,
      image_url: "https://res.cloudinary.com/demo/image/upload/v1/closet-by-chilli/products/back.jpg",
      public_id: "closet-by-chilli/products/back",
      alt_text: "Back view details",
      ordering: 1,
      is_primary: false,
      width: 1200,
      height: 1600,
      format: "jpg",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders persisted gallery images when reopening or refreshing product", () => {
    const handleImagesChange = vi.fn();
    render(
      <ProductImagesTab
        productId={mockProductId}
        images={initialImages}
        onImagesChange={handleImagesChange}
      />
    );

    expect(screen.getByText("Product Gallery")).toBeInTheDocument();
    expect(screen.getByTestId("gallery-image-img-1")).toBeInTheDocument();
    expect(screen.getByTestId("gallery-image-img-2")).toBeInTheDocument();
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Front view kurti")).toBeInTheDocument();
    expect(screen.getByText("Back view details")).toBeInTheDocument();
  });

  it("handles multi-image selection and successful upload", async () => {
    const handleImagesChange = vi.fn();

    const newImageRecord: AdminProductImage = {
      id: "img-3",
      product: mockProductId,
      image_url: "https://res.cloudinary.com/demo/image/upload/v1/closet-by-chilli/products/side.jpg",
      public_id: "closet-by-chilli/products/side",
      alt_text: "side look",
      ordering: 2,
      is_primary: false,
    };

    vi.mocked(adminApi.uploadAdminProductImageFile).mockResolvedValue(newImageRecord);

    render(
      <ProductImagesTab
        productId={mockProductId}
        images={initialImages}
        onImagesChange={handleImagesChange}
      />
    );

    const input = document.getElementById("product-gallery-file-input") as HTMLInputElement;
    const file1 = new File(["dummy1"], "side-look.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file1] } });

    await waitFor(() => {
      expect(adminApi.uploadAdminProductImageFile).toHaveBeenCalledWith(
        mockProductId,
        file1,
        expect.objectContaining({
          alt_text: "side look",
          is_primary: false,
          ordering: 2,
        })
      );
      expect(handleImagesChange).toHaveBeenCalledWith([...initialImages, newImageRecord]);
    });
  });

  it("handles upload failure and allows retrying failed upload without duplicating", async () => {
    const handleImagesChange = vi.fn();

    vi.mocked(adminApi.uploadAdminProductImageFile).mockRejectedValueOnce(
      new Error("Cloudinary network timeout")
    );

    render(
      <ProductImagesTab
        productId={mockProductId}
        images={initialImages}
        onImagesChange={handleImagesChange}
      />
    );

    const input = document.getElementById("product-gallery-file-input") as HTMLInputElement;
    const file = new File(["dummy"], "failed-upload.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file] } });

    // Shows upload failure with error message and retry button
    await waitFor(() => {
      expect(screen.getByText("Cloudinary network timeout")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    });

    // Mock success on retry
    const successImg: AdminProductImage = {
      id: "img-retry-success",
      product: mockProductId,
      image_url: "https://res.cloudinary.com/demo/image/upload/v1/closet-by-chilli/products/retry.jpg",
      alt_text: "failed upload",
      ordering: 2,
      is_primary: false,
    };
    vi.mocked(adminApi.uploadAdminProductImageFile).mockResolvedValueOnce(successImg);

    // Click retry
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => {
      expect(handleImagesChange).toHaveBeenCalledWith([...initialImages, successImg]);
    });
  });

  it("allows setting a different image as primary", async () => {
    const handleImagesChange = vi.fn();
    vi.mocked(adminApi.updateProductImage).mockResolvedValue({
      ...initialImages[1],
      is_primary: true,
    });

    render(
      <ProductImagesTab
        productId={mockProductId}
        images={initialImages}
        onImagesChange={handleImagesChange}
      />
    );

    const makePrimaryBtn = screen.getByTitle("Make Primary Image");
    fireEvent.click(makePrimaryBtn);

    await waitFor(() => {
      expect(adminApi.updateProductImage).toHaveBeenCalledWith(mockProductId, "img-2", {
        is_primary: true,
      });
      expect(handleImagesChange).toHaveBeenCalledWith([
        { ...initialImages[0], is_primary: false },
        { ...initialImages[1], is_primary: true },
      ]);
    });
  });

  it("reorders images up and down", async () => {
    const handleImagesChange = vi.fn();
    const reorderedList = [initialImages[1], initialImages[0]];
    vi.mocked(adminApi.reorderProductImages).mockResolvedValue(reorderedList);

    render(
      <ProductImagesTab
        productId={mockProductId}
        images={initialImages}
        onImagesChange={handleImagesChange}
      />
    );

    const moveDownBtns = screen.getAllByTitle("Move later");
    fireEvent.click(moveDownBtns[0]);

    await waitFor(() => {
      expect(adminApi.reorderProductImages).toHaveBeenCalledWith(mockProductId, [
        { id: "img-2", ordering: 0 },
        { id: "img-1", ordering: 1 },
      ]);
      expect(handleImagesChange).toHaveBeenCalledWith(reorderedList);
    });
  });

  it("updates alt text inline", async () => {
    const handleImagesChange = vi.fn();
    vi.mocked(adminApi.updateProductImage).mockResolvedValue({
      ...initialImages[0],
      alt_text: "Updated Luxury Embroidery Front",
    });

    render(
      <ProductImagesTab
        productId={mockProductId}
        images={initialImages}
        onImagesChange={handleImagesChange}
      />
    );

    const editAltBtns = screen.getAllByTitle("Edit alt text");
    fireEvent.click(editAltBtns[0]);

    const input = screen.getByPlaceholderText("Image description (Alt)");
    fireEvent.change(input, { target: { value: "Updated Luxury Embroidery Front" } });

    const saveBtn = screen.getByTitle("Save alt text");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(adminApi.updateProductImage).toHaveBeenCalledWith(mockProductId, "img-1", {
        alt_text: "Updated Luxury Embroidery Front",
      });
      expect(handleImagesChange).toHaveBeenCalled();
    });
  });

  it("confirms and deletes an image from the gallery", async () => {
    const handleImagesChange = vi.fn();
    vi.mocked(adminApi.deleteProductImage).mockResolvedValue({
      success: true,
      message: "Image deleted",
    });

    render(
      <ProductImagesTab
        productId={mockProductId}
        images={initialImages}
        onImagesChange={handleImagesChange}
      />
    );

    const deleteBtns = screen.getAllByTitle("Delete Image");
    // Click delete on the first (primary) image
    fireEvent.click(deleteBtns[0]);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText("Remove Gallery Image?")).toBeInTheDocument();
    });

    const confirmBtn = screen.getByTestId("confirm-delete-image-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminApi.deleteProductImage).toHaveBeenCalledWith(mockProductId, "img-1");
      // Img-2 should be promoted to primary
      expect(handleImagesChange).toHaveBeenCalledWith([
        { ...initialImages[1], is_primary: true },
      ]);
    });
  });
});

describe("Storefront Product Media Rendering", () => {
  it("renders Cloudinary primary image on product card", () => {
    const mockProduct: ProductListItem = {
      id: "prod-1",
      name: "Chanderi Silk Kurti",
      slug: "chanderi-silk-kurti",
      description: "Fine silk with zardozi",
      status: "active",
      is_active: true,
      category: { id: "cat-1", name: "Kurtis", slug: "kurtis" },
      collections: [],
      min_price: "2499.00",
      variant_count: 3,
      primary_image: {
        id: "img-cloud-1",
        image_url: "https://res.cloudinary.com/demo/image/upload/v1/closet-by-chilli/products/kurti.webp",
        alt_text: "Chanderi Silk Kurti in Ruby Red",
        ordering: 0,
        is_primary: true,
      },
      created_at: "2026-10-18T00:00:00Z",
      updated_at: "2026-10-18T00:00:00Z",
    };

    const uiProduct = mapProductToUi(mockProduct);
    expect(uiProduct.image).toBe(
      "https://res.cloudinary.com/demo/image/upload/v1/closet-by-chilli/products/kurti.webp"
    );

    render(<ProductCard product={uiProduct} />);
    const img = screen.getByAltText("Chanderi Silk Kurti");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toContain("cloudinary.com");
  });

  it("gracefully displays editorial fallback when product has no image", () => {
    const mockProductNoImage: ProductListItem = {
      id: "prod-no-img",
      name: "Minimalist Linen Kurti",
      slug: "minimalist-linen-kurti-new",
      description: "Organic handspun linen",
      status: "active",
      is_active: true,
      category: { id: "cat-1", name: "Kurtis", slug: "kurtis" },
      collections: [],
      min_price: "1899.00",
      variant_count: 2,
      primary_image: null,
      created_at: "2026-10-18T00:00:00Z",
      updated_at: "2026-10-18T00:00:00Z",
    };

    const uiProduct = mapProductToUi(mockProductNoImage);
    expect(uiProduct.image).toBeUndefined();

    render(<ProductCard product={uiProduct} />);
    expect(screen.getByText("CBC")).toBeInTheDocument();
    expect(screen.getAllByText("Kurtis").length).toBeGreaterThan(0);
  });
});
