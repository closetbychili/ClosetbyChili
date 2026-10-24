import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminInventorySummaryCards from "@/components/admin/inventory/AdminInventorySummaryCards";
import AdminInventoryDetailClient from "@/components/admin/inventory/AdminInventoryDetailClient";
import * as adminApi from "@/lib/api/admin";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/inventory/var-low-1",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API functions
vi.mock("@/lib/api/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof adminApi>();
  return {
    ...actual,
    getAdminInventoryDetail: vi.fn(),
    getAdminInventoryMovements: vi.fn(),
    updateInventoryThreshold: vi.fn(),
    acknowledgeInventoryAlert: vi.fn(),
  };
});

describe("Sprint A3.4 — Admin Inventory Monitoring & Low-Stock Alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AdminInventorySummaryCards", () => {
    it("renders real counts and unacknowledged alerts badge", () => {
      const mockSummary: adminApi.AdminInventorySummary = {
        active_variants_tracked: 42,
        total_on_hand: 500,
        total_reserved: 50,
        total_available: 450,
        out_of_stock_variants: 3,
        low_stock_variants: 7,
        in_stock_variants: 32,
        unacknowledged_alerts: 4,
        low_stock_threshold: 5,
      };

      render(
        <AdminInventorySummaryCards
          summary={mockSummary}
          loading={false}
          activeStatus="all"
          onStatusFilterClick={vi.fn()}
        />
      );

      expect(screen.getByTestId("metric-active-variants")).toHaveTextContent("42");
      expect(screen.getByTestId("metric-low-stock")).toHaveTextContent("7");
      expect(screen.getByTestId("metric-out-of-stock")).toHaveTextContent("3");
      expect(screen.getByText("4 unacknowledged")).toBeInTheDocument();
    });

    it("triggers status filter when clicking Low Stock or Out of Stock cards", () => {
      const mockFilterClick = vi.fn();
      const mockSummary: adminApi.AdminInventorySummary = {
        active_variants_tracked: 20,
        total_on_hand: 100,
        total_reserved: 10,
        total_available: 90,
        out_of_stock_variants: 2,
        low_stock_variants: 5,
        in_stock_variants: 13,
        unacknowledged_alerts: 2,
        low_stock_threshold: 5,
      };

      render(
        <AdminInventorySummaryCards
          summary={mockSummary}
          loading={false}
          activeStatus="all"
          onStatusFilterClick={mockFilterClick}
        />
      );

      // Click on Low Stock card
      const lowStockLabel = screen.getByText("Low Stock");
      fireEvent.click(lowStockLabel.closest("[role='button']")!);
      expect(mockFilterClick).toHaveBeenCalledWith("low_stock");

      // Click on Out of Stock card
      const outOfStockLabel = screen.getByText("Out of Stock");
      fireEvent.click(outOfStockLabel.closest("[role='button']")!);
      expect(mockFilterClick).toHaveBeenCalledWith("out_of_stock");
    });
  });

  describe("AdminInventoryDetailClient Alert & Threshold Management", () => {
    const mockLowStockDetail: adminApi.AdminInventoryDetail = {
      id: "inv-1",
      variant_id: "var-low-1",
      product_id: "prod-1",
      product_name: "Raw Silk Anarkali",
      product_slug: "raw-silk-anarkali",
      product_status: "active",
      product_is_active: true,
      category_name: "Anarkalis",
      category_id: "cat-1",
      thumbnail_url: "https://example.com/anarkali.jpg",
      sku: "RSA-MAROON-S",
      size: "S",
      color: "Maroon",
      variant_title: "S / Maroon",
      retail_price: "8500.00",
      sale_price: null,
      is_active: true,
      quantity_on_hand: 4,
      quantity_reserved: 1,
      quantity_available: 3,
      stock_status: "low_stock",
      stock_status_label: "Low Stock",
      low_stock_threshold: 5,
      is_low_stock: true,
      is_out_of_stock: false,
      is_alert_acknowledged: false,
      alert_acknowledged_at: null,
      last_movement_at: null,
      last_movement: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      images: [],
      recent_movements: [],
    };

    beforeEach(() => {
      vi.mocked(adminApi.getAdminInventoryDetail).mockResolvedValue(mockLowStockDetail);
      vi.mocked(adminApi.getAdminInventoryMovements).mockResolvedValue({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });
    });

    it("displays alert banner and supports acknowledging/unacknowledging alerts", async () => {
      vi.mocked(adminApi.acknowledgeInventoryAlert).mockResolvedValue({
        variant_id: "var-low-1",
        is_alert_acknowledged: true,
        alert_acknowledged_at: "2026-01-02T10:00:00Z",
        stock_status: "low_stock",
        stock_status_label: "Low Stock",
        message: "Alert acknowledged successfully.",
      });

      render(<AdminInventoryDetailClient variantId="var-low-1" />);

      await waitFor(() => {
        expect(screen.getByTestId("inventory-alert-banner")).toBeInTheDocument();
      });

      expect(screen.getByText("Low Stock Condition")).toBeInTheDocument();
      const ackButton = screen.getByTestId("alert-ack-button");
      expect(ackButton).toHaveTextContent("Acknowledge Alert");

      // Click acknowledge
      fireEvent.click(ackButton);

      await waitFor(() => {
        expect(adminApi.acknowledgeInventoryAlert).toHaveBeenCalledWith("var-low-1", true);
        expect(screen.getByText("Unacknowledge")).toBeInTheDocument();
      });
    });

    it("supports threshold configuration with validation", async () => {
      vi.mocked(adminApi.updateInventoryThreshold).mockResolvedValue({
        variant_id: "var-low-1",
        low_stock_threshold: 2,
        stock_status: "in_stock",
        stock_status_label: "In Stock",
        quantity_available: 3,
        is_alert_acknowledged: false,
        message: "Threshold updated to 2 successfully.",
      });

      render(<AdminInventoryDetailClient variantId="var-low-1" />);

      await waitFor(() => {
        expect(screen.getByTestId("edit-threshold-button")).toBeInTheDocument();
      });

      // Click Configure button
      fireEvent.click(screen.getByTestId("edit-threshold-button"));

      const input = screen.getByTestId("threshold-input");
      expect(input).toBeInTheDocument();

      // Test negative threshold rejection
      fireEvent.change(input, { target: { value: "-3" } });
      fireEvent.click(screen.getByTestId("save-threshold-button"));

      expect(screen.getByText("Threshold must be a non-negative integer.")).toBeInTheDocument();
      expect(adminApi.updateInventoryThreshold).not.toHaveBeenCalled();

      // Test valid threshold update
      fireEvent.change(input, { target: { value: "2" } });
      fireEvent.click(screen.getByTestId("save-threshold-button"));

      await waitFor(() => {
        expect(adminApi.updateInventoryThreshold).toHaveBeenCalledWith("var-low-1", 2);
        expect(screen.getByText(/Low-stock threshold updated to 2 units/)).toBeInTheDocument();
      });
    });
  });
});
