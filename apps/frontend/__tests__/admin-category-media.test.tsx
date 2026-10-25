import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminCategoriesClient from "@/components/admin/categories/AdminCategoriesClient";
import * as adminApi from "@/lib/api/admin";
import type { AdminCategory } from "@/lib/api/admin";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/categories",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminCategories: vi.fn(),
    createAdminCategory: vi.fn(),
    updateAdminCategory: vi.fn(),
    deleteAdminCategory: vi.fn(),
    uploadAdminCategoryImage: vi.fn(),
    deleteAdminCategoryImage: vi.fn(),
  };
});

const mockCategory: AdminCategory = {
  id: "cat-uuid-1",
  name: "Kurtis",
  slug: "kurtis",
  description: "Traditional kurtis",
  short_description: "Relaxed everyday cuts",
  parent: null,
  parent_name: null,
  parent_slug: null,
  children: [],
  product_count: 5,
  ordering: 2,
  is_active: true,
  is_visible_on_storefront: true,
  image_url: "https://res.cloudinary.com/demo/image/upload/kurtis.jpg",
  image_public_id: "closet_by_chilli/categories/kurtis",
  image_alt: "Kurtis Collection",
  created_at: "2026-08-30T12:00:00Z",
  updated_at: "2026-08-30T12:00:00Z",
};

describe("Admin Category Media & Storefront Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getAdminCategories).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [mockCategory],
    });
    // Mock URL.createObjectURL for jsdom
    global.URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock-preview");
  });

  it("renders category table with storefront discovery badge and display order", async () => {
    render(<AdminCategoriesClient />);

    await waitFor(() => {
      expect(screen.getByText("Kurtis")).toBeInTheDocument();
    });

    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("Visible")).toBeInTheDocument();
  });

  it("opens edit modal with existing image, alt text, and storefront configuration", async () => {
    render(<AdminCategoriesClient />);

    await waitFor(() => {
      expect(screen.getByText("Kurtis")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /edit category kurtis/i });
    fireEvent.click(editBtn);

      expect(screen.getByRole("heading", { name: /edit category/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Relaxed everyday cuts")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Kurtis Collection")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();

    const imgs = screen.getAllByAltText("Kurtis Collection");
    expect(imgs.length).toBeGreaterThanOrEqual(1);
  });

  it("allows selecting a new image file and shows instant preview", async () => {
    render(<AdminCategoriesClient />);

    await waitFor(() => {
      expect(screen.getByText("Kurtis")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /edit category kurtis/i });
    fireEvent.click(editBtn);

    await waitFor(() => {
        expect(screen.getByRole("heading", { name: /edit category/i })).toBeInTheDocument();
    });

    const fileInput = document.getElementById("category-card-image-input") as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    const mockFile = new File(["dummy content"], "new-kurtis.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile);
      expect(screen.getByText("New")).toBeInTheDocument();
    });
  });

  it("calls deleteAdminCategoryImage when removing an existing image with confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(adminApi.deleteAdminCategoryImage).mockResolvedValue({
      id: "cat-uuid-1",
      name: "Kurtis",
      slug: "kurtis",
      description: "Traditional kurtis",
      short_description: "Relaxed everyday cuts",
      is_active: true,
      is_visible_on_storefront: true,
      ordering: 2,
      image_url: undefined,
      image_public_id: undefined,
      image_alt: "",
      parent: null,
      parent_name: null,
      parent_slug: null,
      children: [],
      product_count: 5,
      created_at: "2026-08-30T12:00:00Z",
      updated_at: "2026-08-30T12:00:00Z",
    });

    render(<AdminCategoriesClient />);

    await waitFor(() => {
      expect(screen.getByText("Kurtis")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /edit category kurtis/i });
    fireEvent.click(editBtn);

    const removeBtn = screen.getByRole("button", { name: "Remove" });
    fireEvent.click(removeBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(adminApi.deleteAdminCategoryImage).toHaveBeenCalledWith("cat-uuid-1");
    });
  });

  it("submits category updates with image upload and displays feedback", async () => {
    vi.mocked(adminApi.updateAdminCategory).mockResolvedValue(mockCategory);
    vi.mocked(adminApi.uploadAdminCategoryImage).mockResolvedValue({
      ...mockCategory,
      image_url: "https://res.cloudinary.com/demo/image/upload/new-kurtis.png",
    });

    render(<AdminCategoriesClient />);

    await waitFor(() => {
      expect(screen.getByText("Kurtis")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /edit category kurtis/i });
    fireEvent.click(editBtn);

    await waitFor(() => {
        expect(screen.getByRole("heading", { name: /edit category/i })).toBeInTheDocument();
    });

    // Change subtitle
    const subtitleInput = screen.getByDisplayValue("Relaxed everyday cuts");
    fireEvent.change(subtitleInput, { target: { value: "Updated subtitle" } });

    // Select file
    const fileInput = document.getElementById("category-card-image-input") as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    const mockFile = new File(["dummy content"], "kurtis-v2.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Save
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(adminApi.updateAdminCategory).toHaveBeenCalledWith(
        "cat-uuid-1",
        expect.objectContaining({
          short_description: "Updated subtitle",
          is_visible_on_storefront: true,
          ordering: 2,
        })
      );
      expect(adminApi.uploadAdminCategoryImage).toHaveBeenCalledWith(
        "cat-uuid-1",
        mockFile,
        expect.any(String)
      );
    });
  });
});
