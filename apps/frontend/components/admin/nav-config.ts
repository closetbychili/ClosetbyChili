import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardList,
  FolderTree,
  Image,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Sparkles,
  TicketPercent,
  Users,
  Warehouse,
} from "lucide-react";

export interface AdminNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  section: "core" | "catalog" | "operations" | "management";
  description?: string;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    title: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    section: "core",
    description: "Operational metrics and atelier activity summary",
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: ShoppingBag,
    section: "catalog",
    description: "Couture catalog, silhouettes, and variants",
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
    section: "catalog",
    description: "Taxonomy, parent-child silhouettes and hierarchy",
  },
  {
    title: "Collections",
    href: "/admin/collections",
    icon: Sparkles,
    section: "catalog",
    description: "Editorial curations, festive drops and lookbooks",
  },
  {
    title: "Media",
    href: "/admin/media",
    icon: Image,
    section: "catalog",
    description: "Digital asset storage, campaign shots and zoom galleries",
  },
  {
    title: "Inventory",
    href: "/admin/inventory",
    icon: Warehouse,
    section: "operations",
    description: "Atelier stock levels, allocations and ledger movements",
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: ClipboardList,
    section: "operations",
    description: "Customer orders, payment states and fulfillment tracking",
  },
  {
    title: "Coupons & Promotions",
    href: "/admin/coupons",
    icon: TicketPercent,
    section: "operations",
    description: "Promotional discount rules, vouchers and limits",
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: Users,
    section: "management",
    description: "Patron profiles, shipping addresses and order history",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    section: "management",
    description: "Revenue performance, average order value and return rates",
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    section: "management",
    description: "Atelier configuration, gateway keys and staff access",
  },
];

/**
 * Checks if a nav link is active for the current pathname.
 * Root "/admin" requires exact match; subroutes match if pathname begins with href + "/".
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
