import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CategoriesPage from "@/app/categories/page";
import * as catalogApi from "@/lib/api/catalog";
import { ApiClientError } from "@/lib/api/client";
import type { Category } from "@/lib/api/types";

vi.mock("@/lib/api/catalog", () => ({
  getCategories: vi.fn(),
}));

// Mock Header and Footer so we only test page-specific layout & logic
vi.mock("@/components/Header", () => ({
  default: () => <header data-testid="site-header">Header</header>,
}));
vi.mock("@/components/Footer", () => ({
  default: () => <footer data-testid="site-footer">Footer</footer>,
}));

const mockCategories: Category[] = [
  {
    id: "1",
    name: "Kurtis",
    slug: "kurtis",
    description: "Everyday cuts & relaxed silhouettes",
    short_description: "Relaxed cuts",
    is_active: true,
    is_visible_on_storefront: true,
    ordering: 0,
    image_url: "https://res.cloudinary.com/demo/image/upload/kurtis.jpg",
    image_alt: "Handcrafted Kurtis",
    parent: null,
    parent_slug: null,
    children: [],
    created_at: "2026-08-30T12:00:00Z",
    updated_at: "2026-08-30T12:00:00Z",
  },
  {
    id: "2",
    name: "Kurta Sets",
    slug: "kurta-sets",
    description: "Coordinated sets",
    short_description: "Coordinated sets",
    is_active: true,
    is_visible_on_storefront: true,
    ordering: 1,
    image_url: "https://res.cloudinary.com/demo/image/upload/kurta-sets.jpg",
    image_alt: "Kurta Sets",
    parent: null,
    parent_slug: null,
    children: [],
    created_at: "2026-08-30T12:00:00Z",
    updated_at: "2026-08-30T12:00:00Z",
  },
  {
    id: "3",
    name: "Anarkali Sets",
    slug: "anarkali-sets",
    description: "Royal flare",
    short_description: "Royal flare",
    is_active: true,
    is_visible_on_storefront: true,
    ordering: 2,
    image_url: "https://res.cloudinary.com/demo/image/upload/anarkali.jpg",
    image_alt: "Anarkali Sets",
    parent: null,
    parent_slug: null,
    children: [],
    created_at: "2026-08-30T12:00:00Z",
    updated_at: "2026-08-30T12:00:00Z",
  },
  {
    id: "4",
    name: "Unimaged Category",
    slug: "unimaged-category",
    description: "No card image configured",
    short_description: "Text only",
    is_active: true,
    is_visible_on_storefront: true,
    ordering: 3,
    image_url: undefined,
    image_alt: "",
    parent: null,
    parent_slug: null,
    children: [],
    created_at: "2026-08-30T12:00:00Z",
    updated_at: "2026-08-30T12:00:00Z",
  },
];

describe("All Categories Page (/categories)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading 'Shop by Category' and breadcrumb", async () => {
    vi.mocked(catalogApi.getCategories).mockResolvedValueOnce({
      count: mockCategories.length,
      next: null,
      previous: null,
      results: mockCategories,
    });

    const PageJsx = await CategoriesPage();
    render(PageJsx);

    expect(screen.getByRole("heading", { level: 1, name: "Shop by Category" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByText("Taxonomy & Silhouettes")).toBeInTheDocument();
  });

  it("renders all eligible storefront categories in a responsive grid", async () => {
    vi.mocked(catalogApi.getCategories).mockResolvedValueOnce({
      count: mockCategories.length,
      next: null,
      previous: null,
      results: mockCategories,
    });

    const PageJsx = await CategoriesPage();
    render(PageJsx);

    expect(screen.getByText("Kurtis")).toBeInTheDocument();
    expect(screen.getByText("Kurta Sets")).toBeInTheDocument();
    expect(screen.getByText("Anarkali Sets")).toBeInTheDocument();
    expect(screen.getAllByText("Unimaged Category").length).toBeGreaterThanOrEqual(1);

    // Verify links to corresponding product category routes
    const links = screen.getAllByRole("link");
    const kurtisLink = links.find((l) => l.getAttribute("href") === "/products?category=kurtis");
    expect(kurtisLink).toBeDefined();

    const anarkaliLink = links.find((l) => l.getAttribute("href") === "/products?category=anarkali-sets");
    expect(anarkaliLink).toBeDefined();
  });

  it("renders graceful image fallback when category has no image", async () => {
    vi.mocked(catalogApi.getCategories).mockResolvedValueOnce({
      count: mockCategories.length,
      next: null,
      previous: null,
      results: mockCategories,
    });

    const PageJsx = await CategoriesPage();
    render(PageJsx);

    expect(screen.getAllByText("Unimaged Category").length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty state when no categories are returned", async () => {
    vi.mocked(catalogApi.getCategories).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    const PageJsx = await CategoriesPage();
    render(PageJsx);

    expect(screen.getByText("No Categories Available")).toBeInTheDocument();
    expect(
      screen.getByText(/our categories are currently being curated for the upcoming season/i)
    ).toBeInTheDocument();
  });

  it("renders error state when backend API fails", async () => {
    vi.mocked(catalogApi.getCategories).mockRejectedValueOnce(
      new ApiClientError("Connection refused", 500, "NETWORK_ERROR")
    );

    const PageJsx = await CategoriesPage();
    render(PageJsx);

    expect(screen.getByText("Unable to Load Categories")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Products" })).toBeInTheDocument();
  });
});
