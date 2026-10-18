import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ShopByCategory from "@/components/ShopByCategory";
import * as catalogApi from "@/lib/api/catalog";
import type { CategoryItem } from "@/lib/homepage-data";
import type { Category } from "@/lib/api/types";

vi.mock("@/lib/api/catalog", () => ({
  getCategories: vi.fn(),
}));

const mockSevenCategories: CategoryItem[] = [
  { id: "cat-1", name: "Kurtis", subtitle: "Relaxed everyday cuts", image: "https://res.cloudinary.com/demo/image/upload/kurtis.jpg", imageAlt: "Handcrafted Kurtis", href: "/products?category=kurtis" },
  { id: "cat-2", name: "Kurta Sets", subtitle: "Coordinated sets", image: "https://res.cloudinary.com/demo/image/upload/kurta-sets.jpg", imageAlt: "Kurta Sets", href: "/products?category=kurta-sets" },
  { id: "cat-3", name: "Anarkali Sets", subtitle: "Royal flare", image: "https://res.cloudinary.com/demo/image/upload/anarkali.jpg", imageAlt: "Anarkali Sets", href: "/products?category=anarkali-sets" },
  { id: "cat-4", name: "Dresses", subtitle: "Modern ethnic drape", image: "https://res.cloudinary.com/demo/image/upload/dresses.jpg", imageAlt: "Dresses", href: "/products?category=dresses" },
  { id: "cat-5", name: "Bottom Wear", subtitle: "Tailored palazzos", image: "https://res.cloudinary.com/demo/image/upload/bottoms.jpg", imageAlt: "Bottom Wear", href: "/products?category=bottom-wear" },
  { id: "cat-6", name: "Dupattas", subtitle: "Handloom silks & organza", image: "https://res.cloudinary.com/demo/image/upload/dupattas.jpg", imageAlt: "Dupattas", href: "/products?category=dupattas" },
  { id: "cat-7", name: "Co-ord Sets", subtitle: "Contemporary two-piece sets", image: undefined, imageAlt: "Co-ord Sets", href: "/products?category=co-ord-sets" },
];

describe("ShopByCategory Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all eligible categories without capping at five", () => {
    render(<ShopByCategory categories={mockSevenCategories} />);

    // Verify all 7 categories are rendered
    expect(screen.getByText("Kurtis")).toBeInTheDocument();
    expect(screen.getByText("Kurta Sets")).toBeInTheDocument();
    expect(screen.getByText("Anarkali Sets")).toBeInTheDocument();
    expect(screen.getByText("Dresses")).toBeInTheDocument();
    expect(screen.getByText("Bottom Wear")).toBeInTheDocument();
    expect(screen.getByText("Dupattas")).toBeInTheDocument();
    expect(screen.getAllByText("Co-ord Sets").length).toBeGreaterThanOrEqual(1);

    const categoryCards = screen.getAllByText("Explore Cuts");
    expect(categoryCards).toHaveLength(7);
  });

  it("has CTA 'Browse All Categories' navigating to /categories", () => {
    render(<ShopByCategory categories={mockSevenCategories} />);

    const ctaLink = screen.getByRole("link", { name: /browse all categories/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/categories");
  });

  it("links each card to its corresponding category slug route", () => {
    render(<ShopByCategory categories={mockSevenCategories} />);

    const kurtisCard = screen.getByRole("link", { name: /handcrafted kurtis/i });
    expect(kurtisCard).toHaveAttribute("href", "/products?category=kurtis");

    const dupattasCard = screen.getByRole("link", { name: /dupattas/i });
    expect(dupattasCard).toHaveAttribute("href", "/products?category=dupattas");
  });

  it("displays graceful fallback when a category has no image", () => {
    render(<ShopByCategory categories={mockSevenCategories} />);

    // Co-ord Sets has no image
    expect(screen.getAllByText("Co-ord Sets").length).toBeGreaterThanOrEqual(1);
    // Verify an image was not rendered for cat-7, but text was
    const images = screen.getAllByRole("img");
    // 6 out of 7 categories have images
    expect(images).toHaveLength(6);
  });

  it("renders previous and next carousel navigation buttons", () => {
    render(<ShopByCategory categories={mockSevenCategories} />);

    expect(screen.getByLabelText(/previous categories/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next categories/i)).toBeInTheDocument();
  });

  it("fetches categories dynamically if not provided as props", async () => {
    const apiCategories: Category[] = [
      {
        id: "api-1",
        name: "Festive Lehengas",
        slug: "festive-lehengas",
        description: "Bespoke bridal and festive wear",
        short_description: "Grand bridal flair",
        is_active: true,
        is_visible_on_storefront: true,
        ordering: 1,
        image_url: "https://res.cloudinary.com/demo/lehenga.jpg",
        image_alt: "Festive Lehenga",
        parent: null,
        parent_slug: null,
        children: [],
        created_at: "2026-08-30T12:00:00Z",
        updated_at: "2026-08-30T12:00:00Z",
      },
    ];

    vi.mocked(catalogApi.getCategories).mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: apiCategories,
    });

    render(<ShopByCategory />);

    await waitFor(() => {
      expect(screen.getByText("Festive Lehengas")).toBeInTheDocument();
    });
    expect(catalogApi.getCategories).toHaveBeenCalledWith(
      expect.objectContaining({ storefront: true })
    );
  });

  it("renders empty state gracefully when no categories are returned", async () => {
    vi.mocked(catalogApi.getCategories).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<ShopByCategory />);

    await waitFor(() => {
      expect(
        screen.getByText(/categories are currently being updated/i)
      ).toBeInTheDocument();
    });
  });
});
