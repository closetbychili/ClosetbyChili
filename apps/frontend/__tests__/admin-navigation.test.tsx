import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminMobileDrawer from "@/components/admin/AdminMobileDrawer";
import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";
import { AdminContext, type AdminContextValue } from "@/components/admin/AdminGuard";
import { ADMIN_NAV_ITEMS, isRouteActive } from "@/components/admin/nav-config";

let mockPathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockSignOut = vi.fn();

const mockAdminContextValue: AdminContextValue = {
  adminUser: {
    id: "admin-uuid-1",
    email: "superadmin@closetbychilli.com",
    role: "admin",
    is_admin: true,
    is_staff: true,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  signOut: mockSignOut,
};

function renderWithAdminContext(ui: React.ReactNode) {
  return render(
    <AdminContext.Provider value={mockAdminContextValue}>
      {ui}
    </AdminContext.Provider>
  );
}

describe("Admin Navigation & Layout Shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/admin";
  });

  describe("Route Matching Helper (isRouteActive)", () => {
    it("matches exact /admin only for root Overview link", () => {
      expect(isRouteActive("/admin", "/admin")).toBe(true);
      expect(isRouteActive("/admin/products", "/admin")).toBe(false);
      expect(isRouteActive("/admin/orders", "/admin")).toBe(false);
    });

    it("matches exact and nested paths for module subroutes", () => {
      expect(isRouteActive("/admin/products", "/admin/products")).toBe(true);
      expect(isRouteActive("/admin/products/new", "/admin/products")).toBe(true);
      expect(isRouteActive("/admin/products/variants/123", "/admin/products")).toBe(true);
      expect(isRouteActive("/admin/orders", "/admin/products")).toBe(false);
    });
  });

  describe("AdminSidebar Component", () => {
    it("renders all 12 required navigation links with valid hrefs and no dead anchors", () => {
      renderWithAdminContext(<AdminSidebar />);

      expect(ADMIN_NAV_ITEMS).toHaveLength(12);

      ADMIN_NAV_ITEMS.forEach((item) => {
        const link = screen.getByRole("link", { name: new RegExp(item.title, "i") });
        expect(link).toHaveAttribute("href", item.href);
        expect(link.getAttribute("href")).not.toBe("#");
      });
    });

    it("marks Overview as active on /admin route", () => {
      mockPathname = "/admin";
      renderWithAdminContext(<AdminSidebar />);

      const overviewLink = screen.getByRole("link", { name: /overview/i });
      expect(overviewLink).toHaveAttribute("aria-current", "page");

      const productsLink = screen.getByRole("link", { name: /products/i });
      expect(productsLink).not.toHaveAttribute("aria-current");
    });

    it("marks Products as active and Overview as inactive on nested /admin/products/new route", () => {
      mockPathname = "/admin/products/new";
      renderWithAdminContext(<AdminSidebar />);

      const overviewLink = screen.getByRole("link", { name: /overview/i });
      expect(overviewLink).not.toHaveAttribute("aria-current");

      const productsLink = screen.getByRole("link", { name: /products/i });
      expect(productsLink).toHaveAttribute("aria-current", "page");
    });

    it("renders verified staff email and wires sign out action", () => {
      renderWithAdminContext(<AdminSidebar />);

      expect(screen.getByText("superadmin@closetbychilli.com")).toBeInTheDocument();

      const signOutBtn = screen.getByRole("button", { name: /sign out of admin console/i });
      fireEvent.click(signOutBtn);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe("AdminHeader & Staff Account Menu", () => {
    it("displays current section title based on active route", () => {
      mockPathname = "/admin/inventory";
      renderWithAdminContext(<AdminHeader onOpenMobileNav={vi.fn()} />);

      expect(screen.getByRole("heading", { name: "Inventory" })).toBeInTheDocument();
    });

    it("opens and closes staff account dropdown menu accessibly", () => {
      renderWithAdminContext(<AdminHeader onOpenMobileNav={vi.fn()} />);

      const menuButton = screen.getByRole("button", { name: /superadmin@closetbychilli\.com/i });
      expect(menuButton).toHaveAttribute("aria-expanded", "false");

      // Click to open
      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getByText(/Administrative Role: admin/i)).toBeInTheDocument();

      // Press Escape to close
      fireEvent.keyDown(document, { key: "Escape" });
      expect(menuButton).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("executes signOut when clicking sign-out item in account menu", () => {
      renderWithAdminContext(<AdminHeader onOpenMobileNav={vi.fn()} />);

      const menuButton = screen.getByRole("button", { name: /superadmin@closetbychilli\.com/i });
      fireEvent.click(menuButton);

      const signOutMenuItem = screen.getByRole("menuitem", { name: /sign out/i });
      fireEvent.click(signOutMenuItem);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it("triggers mobile nav callback when clicking hamburger button", () => {
      const openMobileNavMock = vi.fn();
      renderWithAdminContext(<AdminHeader onOpenMobileNav={openMobileNavMock} />);

      const hamburgerBtn = screen.getByRole("button", { name: /open navigation menu/i });
      fireEvent.click(hamburgerBtn);

      expect(openMobileNavMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("AdminMobileDrawer Component", () => {
    it("does not render dialog when isOpen is false", () => {
      renderWithAdminContext(<AdminMobileDrawer isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders drawer dialog when isOpen is true and closes via close button", () => {
      const onCloseMock = vi.fn();
      renderWithAdminContext(<AdminMobileDrawer isOpen={true} onClose={onCloseMock} />);

      expect(screen.getByRole("dialog", { name: /admin navigation menu/i })).toBeInTheDocument();

      const closeBtn = screen.getByRole("button", { name: /close navigation menu/i });
      fireEvent.click(closeBtn);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("closes drawer when backdrop is clicked", () => {
      const onCloseMock = vi.fn();
      renderWithAdminContext(<AdminMobileDrawer isOpen={true} onClose={onCloseMock} />);

      const backdrop = screen.getByTestId("admin-drawer-backdrop");
      fireEvent.click(backdrop);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("closes drawer on Escape key press", () => {
      const onCloseMock = vi.fn();
      renderWithAdminContext(<AdminMobileDrawer isOpen={true} onClose={onCloseMock} />);

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("AdminLayoutClient Integration", () => {
    it("renders sidebar, header and child content", () => {
      renderWithAdminContext(
        <AdminLayoutClient>
          <div data-testid="test-content">Dashboard Statistics Body</div>
        </AdminLayoutClient>
      );

      expect(screen.getByTestId("test-content")).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: /admin sidebar navigation/i })).toBeInTheDocument();
    });
  });

  describe("AdminPlaceholderPage Component", () => {
    it("renders module placeholder with title, route path, and scheduled notice", () => {
      render(
        <AdminPlaceholderPage
          title="Inventory"
          description="Stock ledger movements."
          routePath="/admin/inventory"
        />
      );

      expect(screen.getByRole("heading", { name: "Inventory" })).toBeInTheDocument();
      expect(screen.getByText("Inventory Management Console")).toBeInTheDocument();
      expect(screen.getByText("/admin/inventory")).toBeInTheDocument();
      expect(screen.getByText("Module Scheduled")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /return to admin overview/i })).toHaveAttribute("href", "/admin");
    });
  });
});
