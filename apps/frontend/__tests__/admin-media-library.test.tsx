import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import MediaLibraryView from "@/components/admin/media/MediaLibraryView";
import * as adminApi from "@/lib/api/admin";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/admin/media",
  useSearchParams: () => mockSearchParams,
}));

const mockMediaList: adminApi.AdminMediaListResponse = {
  count: 3,
  total_pages: 1,
  current_page: 1,
  page_size: 24,
  results: [
    {
      id: "media-1",
      image_url: "https://res.cloudinary.com/test/image/upload/v1/closet-by-chilli/products/emerald_front.webp",
      public_id: "closet-by-chilli/products/emerald_front",
      original_filename: "emerald_front.webp",
      alt_text: "Emerald front elevation",
      width: 1200,
      height: 1600,
      format: "webp",
      bytes: 150000,
      created_at: "2026-10-18T10:00:00Z",
      products: [
        {
          id: "prod-1",
          name: "Emerald Velvet Anarkali",
          slug: "emerald-velvet-anarkali",
          is_primary: true,
        },
      ],
      categories: [],
      usage_type: "product",
      is_used: true,
    },
    {
      id: "media-2",
      image_url: "https://res.cloudinary.com/test/image/upload/v1/closet-by-chilli/categories/anarkalis_banner.webp",
      public_id: "closet-by-chilli/categories/anarkalis_banner",
      original_filename: "anarkalis_banner.webp",
      alt_text: "Anarkalis collection banner",
      width: 1920,
      height: 1080,
      format: "webp",
      bytes: 320000,
      created_at: "2026-10-18T10:05:00Z",
      products: [],
      categories: [
        {
          id: "cat-1",
          name: "Anarkalis",
          slug: "anarkalis",
        },
      ],
      usage_type: "category",
      is_used: true,
    },
    {
      id: "media-3",
      image_url: "https://res.cloudinary.com/test/image/upload/v1/closet-by-chilli/media/lookbook_raw.webp",
      public_id: "closet-by-chilli/media/lookbook_raw",
      original_filename: "lookbook_raw.webp",
      alt_text: "Raw lookbook campaign shot",
      width: 2400,
      height: 3600,
      format: "webp",
      bytes: 650000,
      created_at: "2026-10-18T10:10:00Z",
      products: [],
      categories: [],
      usage_type: "unassigned",
      is_used: false,
    },
  ],
};

describe("Admin Central Media Library (/admin/media)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    vi.spyOn(adminApi, "fetchAdminMedia").mockResolvedValue(mockMediaList);
    vi.spyOn(adminApi, "updateAdminMediaAltText").mockImplementation(async (id, altText) => {
      const found = mockMediaList.results.find((m) => m.id === id);
      return {
        ...(found || mockMediaList.results[0]),
        alt_text: altText,
      };
    });
    vi.spyOn(adminApi, "deleteAdminMedia").mockResolvedValue(undefined);
  });

  it("renders page header, search bar, filter tabs, and media cards", async () => {
    render(<MediaLibraryView />);

    await waitFor(() => {
      expect(screen.getByText("Media Library")).toBeInTheDocument();
      expect(screen.getByText("emerald_front.webp")).toBeInTheDocument();
      expect(screen.getByText("anarkalis_banner.webp")).toBeInTheDocument();
      expect(screen.getByText("lookbook_raw.webp")).toBeInTheDocument();
    });

    // Check usage badges
    expect(screen.getByText(/Product \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Category \(1\)/)).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("switches usage filters and updates URL parameters", async () => {
    render(<MediaLibraryView />);

    await waitFor(() => {
      expect(screen.getByText("emerald_front.webp")).toBeInTheDocument();
    });

    // Click 'Products' filter
    const productFilterBtn = screen.getByRole("button", { name: "Products" });
    fireEvent.click(productFilterBtn);
    expect(mockPush).toHaveBeenCalledWith("/admin/media?usage_type=product");

    // Click 'Unassigned' filter
    const unassignedFilterBtn = screen.getByRole("button", { name: /Unassigned/ });
    fireEvent.click(unassignedFilterBtn);
    expect(mockPush).toHaveBeenCalledWith("/admin/media?usage_type=unassigned");
  });

  it("submits search query and updates URL", async () => {
    render(<MediaLibraryView />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by alt text/)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by alt text/);
    fireEvent.change(searchInput, { target: { value: "emerald" } });
    fireEvent.submit(searchInput.closest("form")!);

    expect(mockPush).toHaveBeenCalledWith("/admin/media?search=emerald");
  });

  it("opens detail panel on card click and displays usage relationships", async () => {
    render(<MediaLibraryView />);

    await waitFor(() => {
      expect(screen.getByText("emerald_front.webp")).toBeInTheDocument();
    });

    // Click emerald card
    const card = screen.getByLabelText("Inspect emerald_front.webp");
    fireEvent.click(card);

    // Detail panel opens
    await waitFor(() => {
      expect(screen.getByText("Media Asset Details")).toBeInTheDocument();
      expect(screen.getByText("Emerald Velvet Anarkali")).toBeInTheDocument();
      expect(screen.getByText("Primary")).toBeInTheDocument();
    });

    // Since in use, should show protected notice
    expect(screen.getByText("Protected from Deletion")).toBeInTheDocument();
    expect(screen.queryByText("Delete Unused Asset")).not.toBeInTheDocument();
  });

  it("allows editing and saving alt text in detail panel", async () => {
    render(<MediaLibraryView />);

    await waitFor(() => {
      expect(screen.getByText("emerald_front.webp")).toBeInTheDocument();
    });

    // Click emerald card
    fireEvent.click(screen.getByLabelText("Inspect emerald_front.webp"));

    await waitFor(() => {
      expect(screen.getByLabelText(/Alternative Text/)).toBeInTheDocument();
    });

    const altInput = screen.getByLabelText(/Alternative Text/);
    fireEvent.change(altInput, { target: { value: "Custom Handcrafted Emerald Kurti" } });

    const saveBtn = screen.getByRole("button", { name: "Save" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(adminApi.updateAdminMediaAltText).toHaveBeenCalledWith(
        "media-1",
        "Custom Handcrafted Emerald Kurti"
      );
      expect(screen.getByText("Saved!")).toBeInTheDocument();
    });
  });

  it("copies image URL to clipboard with feedback", async () => {
    render(<MediaLibraryView />);

    await waitFor(() => {
      expect(screen.getByText("emerald_front.webp")).toBeInTheDocument();
    });

    // Click card to open detail panel
    fireEvent.click(screen.getByLabelText("Inspect emerald_front.webp"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Copy URL/ })).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole("button", { name: /Copy URL/ });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://res.cloudinary.com/test/image/upload/v1/closet-by-chilli/products/emerald_front.webp"
    );

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("allows safe deletion of unassigned asset with confirmation", async () => {
    render(<MediaLibraryView />);

    await waitFor(() => {
      expect(screen.getByText("lookbook_raw.webp")).toBeInTheDocument();
    });

    // Click unassigned card
    fireEvent.click(screen.getByLabelText("Inspect lookbook_raw.webp"));

    await waitFor(() => {
      expect(screen.getByText("Delete Unused Asset")).toBeInTheDocument();
    });

    // Click Delete Unused Asset -> opens confirmation
    fireEvent.click(screen.getByText("Delete Unused Asset"));
    expect(screen.getByText("Confirm Permanent Deletion")).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole("button", { name: "Yes, Delete Asset" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminApi.deleteAdminMedia).toHaveBeenCalledWith("media-3");
    });
  });

  it("opens upload modal and handles upload queue", async () => {
    vi.spyOn(adminApi, "uploadAdminMedia").mockResolvedValue({
      image_url: "https://res.cloudinary.com/test/image/upload/v1/new_item.webp",
      original_name: "new_item.webp",
    });

    render(<MediaLibraryView />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Upload Images/ })).toBeInTheDocument();
    });

    // Open upload modal
    fireEvent.click(screen.getByRole("button", { name: /Upload Images/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Upload Media Assets")).toBeInTheDocument();
  });
});
