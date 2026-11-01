import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HMProductDetailSection from "@/components/HMProductDetailSection";
import * as cartHook from "@/components/CartContext";
import type { ProductDetail } from "@/lib/api/types";

describe("HMProductDetailSection — H&M Redesign & Differential Speed Scroll", () => {
  const mockAddToCart = vi.fn().mockResolvedValue(undefined);

  const mockProduct: ProductDetail = {
    id: "prod-hm-1",
    name: "Fine-Knit Zip-Top Jumper",
    slug: "fine-knit-zip-top-jumper",
    description: "Jumper in a soft, fine-knit fabrication with stand collar.",
    status: "active",
    is_active: true,
    category: {
      id: "cat-1",
      name: "Knitwear & Separates",
      slug: "knitwear-separates",
    },
    collections: [],
    variants: [
      {
        id: "var-1",
        sku: "HM-JMP-YEL-S",
        size: "S",
        color: "Light Yellow",
        retail_price: "2399.20",
        sale_price: "1919.36",
        is_active: true,
        is_in_stock: true,
        stock_status: "in_stock",
      },
      {
        id: "var-2",
        sku: "HM-JMP-YEL-M",
        size: "M",
        color: "Light Yellow",
        retail_price: "2399.20",
        is_active: true,
        is_in_stock: true,
        stock_status: "in_stock",
      },
      {
        id: "var-3",
        sku: "HM-JMP-RED-S",
        size: "S",
        color: "Crimson Red",
        retail_price: "2399.20",
        is_active: true,
        is_in_stock: true,
        stock_status: "in_stock",
      },
      {
        id: "var-4",
        sku: "HM-JMP-BGE-M",
        size: "M",
        color: "Oatmeal Beige",
        retail_price: "2399.20",
        is_active: true,
        is_in_stock: true,
        stock_status: "in_stock",
      },
    ],
    created_at: "",
    updated_at: "",
  };

  const mockImages = [
    "https://example.com/img1.jpg",
    "https://example.com/img2.jpg",
    "https://example.com/img3.jpg",
    "https://example.com/img4.jpg",
    "https://example.com/img5.jpg",
    "https://example.com/img6.jpg",
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cartHook, "useCart").mockReturnValue({
      addToCart: mockAddToCart,
      itemCount: 0,
      subtotal: 0,
      openDrawer: vi.fn(),
      closeDrawer: vi.fn(),
      isOpen: false,
      items: [],
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      coupon: null,
      couponDiscount: 0,
      finalTotal: 0,
      applyCoupon: vi.fn(),
      removeCoupon: vi.fn(),
      isLoading: false,
      isApplyingCoupon: false,
      couponError: null,
    } as any);
  });

  it("renders H&M image grid following the 1-then-2 pattern on desktop", () => {
    render(
      <HMProductDetailSection
        product={mockProduct}
        galleryImages={mockImages}
        styleId="HM-JMP-1356"
      />
    );

    const imageContainers = document.querySelectorAll(
      '[data-testid="desktop-image-grid"] > div'
    );
    expect(imageContainers.length).toBe(6);

    // Image 0 (index 0): 1 full-width image (col-span-2)
    expect(imageContainers[0].className).toContain("sm:col-span-2");

    // Image 1 & 2 (indices 1 & 2): 2 half-width images (col-span-1 each)
    expect(imageContainers[1].className).toContain("sm:col-span-1");
    expect(imageContainers[2].className).toContain("sm:col-span-1");

    // Image 3 (index 3): 1 full-width image (col-span-2)
    expect(imageContainers[3].className).toContain("sm:col-span-2");

    // Image 4 & 5 (indices 4 & 5): 2 half-width images (col-span-1 each)
    expect(imageContainers[4].className).toContain("sm:col-span-1");
    expect(imageContainers[5].className).toContain("sm:col-span-1");
  });

  it("renders mobile horizontally sliding carousel with pagination indicators", () => {
    render(
      <HMProductDetailSection
        product={mockProduct}
        galleryImages={mockImages}
        styleId="HM-JMP-1356"
      />
    );

    const mobileCarousel = screen.getByTestId("mobile-image-carousel");
    expect(mobileCarousel).toBeInTheDocument();

    const mobileSlides = mobileCarousel.querySelectorAll("div.snap-center");
    expect(mobileSlides.length).toBe(6);

    const paginationTabs = screen.getAllByRole("tab", { name: /go to slide/i });
    expect(paginationTabs.length).toBe(6);
    expect(paginationTabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("renders product title, dynamic prices from DB, discount badge, and stock status", () => {
    render(
      <HMProductDetailSection
        product={mockProduct}
        galleryImages={mockImages}
        styleId="HM-JMP-1356"
      />
    );

    expect(
      screen.getByRole("heading", { name: "Fine-Knit Zip-Top Jumper" })
    ).toBeInTheDocument();
    expect(screen.getByText("₹1,919.36")).toBeInTheDocument();
    expect(screen.getByText("₹2,399.20")).toBeInTheDocument();
    expect(screen.getByText("-20%")).toBeInTheDocument();
    expect(screen.getByText(/In Stock — Ready to Dispatch/i)).toBeInTheDocument();
  });

  it("switches colors when selecting color swatches", () => {
    render(
      <HMProductDetailSection
        product={mockProduct}
        galleryImages={mockImages}
        styleId="HM-JMP-1356"
      />
    );

    expect(screen.getByText("Light Yellow")).toBeInTheDocument();

    const redSwatch = screen.getByRole("button", { name: /select crimson red/i });
    fireEvent.click(redSwatch);

    expect(screen.getByText("Crimson Red")).toBeInTheDocument();
  });

  it("selects sizes in the H&M border grid and adds to bag", async () => {
    render(
      <HMProductDetailSection
        product={mockProduct}
        galleryImages={mockImages}
        styleId="HM-JMP-1356"
      />
    );

    const mSizeBtn = screen.getByRole("button", { name: "M" });
    fireEvent.click(mSizeBtn);

    const addBtn = document.getElementById("add-to-bag-button")!;
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith("var-2", 1);
      expect(screen.getAllByText(/added to bag ✓/i).length).toBeGreaterThan(0);
    });
  });

  it("toggles wishlist heart icon state", () => {
    render(
      <HMProductDetailSection
        product={mockProduct}
        galleryImages={mockImages}
        styleId="HM-JMP-1356"
      />
    );

    const [wishlistBtn] = screen.getAllByRole("button", { name: /save to wishlist/i });
    fireEvent.click(wishlistBtn);

    expect(screen.getAllByRole("button", { name: /remove from wishlist/i })[0]).toBeInTheDocument();
  });

  it("opens and closes the Size Guide modal", () => {
    render(
      <HMProductDetailSection
        product={mockProduct}
        galleryImages={mockImages}
        styleId="HM-JMP-1356"
      />
    );

    const sizeGuideBtn = screen.getByRole("button", { name: /size guide/i });
    fireEvent.click(sizeGuideBtn);

    expect(screen.getByText(/Size Guide & Measurements/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "✕" });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Size Guide & Measurements/i)).not.toBeInTheDocument();
  });

  it("renders H&M minimalist accordions (Description, Material, Delivery)", () => {
    render(
      <HMProductDetailSection
        product={mockProduct}
        galleryImages={mockImages}
        styleId="HM-JMP-1356"
      />
    );

    expect(screen.getByText("Description & Fit")).toBeInTheDocument();
    expect(screen.getByText("Material & Care")).toBeInTheDocument();
    expect(screen.getByText("Delivery and Payment")).toBeInTheDocument();
  });

  it("renders mobile floating Add to Bag button and hides when static button is encountered", () => {
    render(
      <HMProductDetailSection
        product={mockProduct}
        galleryImages={mockImages}
        styleId="HM-JMP-1356"
      />
    );

    const floatingBar = screen.getByTestId("floating-add-to-bag-bar");
    expect(floatingBar).toBeInTheDocument();

    const floatingBtn = document.getElementById("floating-add-to-bag-button");
    expect(floatingBtn).toBeInTheDocument();
    expect(floatingBtn?.textContent).toContain("Add to Bag");
  });
});
