"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Diamond,
  FolderTree,
  Image,
  Package,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TicketPercent,
  TrendingUp,
  UserCheck,
  Users,
  Warehouse,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminContext } from "@/components/admin/AdminGuard";
import DashboardMetricCard from "@/components/admin/dashboard/DashboardMetricCard";
import DashboardSalesChart from "@/components/admin/dashboard/DashboardSalesChart";
import RecentOrdersTable from "@/components/admin/dashboard/RecentOrdersTable";
import LowStockAlertsCard from "@/components/admin/dashboard/LowStockAlertsCard";
import TopSellingProductsCard from "@/components/admin/dashboard/TopSellingProductsCard";
import {
  getAdminDashboardOverview,
  type AdminDashboardOverview,
} from "@/lib/api/admin";

type PeriodOption = "7d" | "30d" | "90d" | "all";

export default function AdminOverviewPage() {
  const { adminUser } = useAdminContext();
  const [period, setPeriod] = useState<PeriodOption>("30d");
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        const data = await getAdminDashboardOverview({ period });
        setOverview(data);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard overview.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period]
  );

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const quickLinks = [
    { title: "Products", href: "/admin/products", icon: Package, count: "Catalog" },
    { title: "Categories", href: "/admin/categories", icon: FolderTree, count: "Taxonomy" },
    { title: "Collections", href: "/admin/collections", icon: Sparkles, count: "Curations" },
    { title: "Media Library", href: "/admin/media", icon: Image, count: "Assets" },
    { title: "Inventory", href: "/admin/inventory", icon: Warehouse, count: "Stock Ledger" },
    { title: "Orders", href: "/admin/orders", icon: ShoppingBag, count: "Fulfillment" },
    { title: "Coupons", href: "/admin/coupons", icon: TicketPercent, count: "Promotions" },
    { title: "Customers", href: "/admin/customers", icon: Users, count: "Patrons" },
    { title: "Analytics", href: "/admin/analytics", icon: BarChart3, count: "Reports" },
    { title: "Settings", href: "/admin/settings", icon: Settings, count: "Configuration" },
  ];

  const getPeriodLabel = (p: PeriodOption) => {
    switch (p) {
      case "7d":
        return "Last 7 Days";
      case "30d":
        return "Last 30 Days";
      case "90d":
        return "Last 90 Days";
      case "all":
        return "All Time";
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Header with period toggle and refresh action */}
      <AdminPageHeader
        title="Atelier Operations Overview"
        description="Real-time transaction KPIs, order fulfillment status, and inventory health."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center bg-[#FAF6F2] p-1 rounded-xl border border-[#EBE2D8] text-xs">
              {(["7d", "30d", "90d", "all"] as PeriodOption[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    period === p
                      ? "bg-white text-[#6D1826] shadow-2xs font-semibold"
                      : "text-[#8C7A78] hover:text-[#1F1B17]"
                  }`}
                >
                  {p === "all" ? "All Time" : p.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fetchOverview(true)}
              disabled={refreshing || loading}
              className="px-3 py-1.5 bg-white border border-[#EBE2D8] hover:border-[#6D1826] text-xs font-medium text-[#1F1B17] rounded-xl flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all disabled:opacity-50"
              aria-label="Refresh overview data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#6D1826] ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-xs text-[#DC2626] flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load dashboard data</p>
              <p className="text-[#991B1B] mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchOverview()}
            className="px-3 py-1.5 bg-white border border-[#FECACA] font-medium text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !overview && (
        <div className="space-y-8 animate-pulse">
          {/* Skeleton Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#EBE2D8] p-6 h-36 flex flex-col justify-between"
              >
                <div className="h-4 bg-[#FAF6F2] rounded w-24" />
                <div className="h-8 bg-[#FAF6F2] rounded w-36" />
                <div className="h-3 bg-[#FAF6F2] rounded w-full" />
              </div>
            ))}
          </div>

          {/* Skeleton Chart */}
          <div className="bg-white rounded-2xl border border-[#EBE2D8] p-6 h-80">
            <div className="h-5 bg-[#FAF6F2] rounded w-48 mb-6" />
            <div className="h-48 bg-[#FAF6F2] rounded-xl w-full" />
          </div>

          {/* Skeleton Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[#EBE2D8] p-6 h-72">
              <div className="h-5 bg-[#FAF6F2] rounded w-36 mb-4" />
              <div className="space-y-3">
                <div className="h-10 bg-[#FAF6F2] rounded" />
                <div className="h-10 bg-[#FAF6F2] rounded" />
                <div className="h-10 bg-[#FAF6F2] rounded" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EBE2D8] p-6 h-72">
              <div className="h-5 bg-[#FAF6F2] rounded w-36 mb-4" />
              <div className="space-y-3">
                <div className="h-10 bg-[#FAF6F2] rounded" />
                <div className="h-10 bg-[#FAF6F2] rounded" />
                <div className="h-10 bg-[#FAF6F2] rounded" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Populated Dashboard */}
      {overview && (
        <div className="space-y-8">
          {/* 1. KPI Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardMetricCard
              title="Gross Revenue"
              metric={overview.metrics.gross_revenue}
              icon={Coins}
              isCurrency={true}
            />

            <DashboardMetricCard
              title="Total Orders"
              metric={overview.metrics.total_orders}
              icon={ShoppingBag}
              isCurrency={false}
            />

            <DashboardMetricCard
              title="Average Order Value"
              metric={overview.metrics.average_order_value}
              icon={TrendingUp}
              isCurrency={true}
            />

            <DashboardMetricCard
              title="Low-Stock Variants"
              metric={{
                value: overview.metrics.low_stock_variants.count,
                definition: overview.metrics.low_stock_variants.definition,
              }}
              icon={Warehouse}
              isCurrency={false}
              thresholdLabel={`Threshold: ≤ ${overview.metrics.low_stock_variants.threshold} units`}
            />
          </div>

          {/* 2. Sales Overview Chart */}
          <DashboardSalesChart
            data={overview.sales_overview}
            periodLabel={getPeriodLabel(period)}
          />

          {/* 3. Recent Orders & Top-Selling Products Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentOrdersTable orders={overview.recent_orders} />
            <TopSellingProductsCard products={overview.top_selling_products} />
          </div>

          {/* 4. Low-Stock Alerts Section */}
          <LowStockAlertsCard
            alerts={overview.low_stock_alerts}
            threshold={overview.metrics.low_stock_variants.threshold}
          />

          {/* 5. Verified Administrator Session & Quick Links */}
          <div className="bg-white rounded-2xl shadow-[0_10px_35px_-4px_rgba(79,0,18,0.04)] border border-[#EBE2D8] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-semibold text-[#1F1B17]">
                  Verified Staff Session
                </h2>
                <p className="text-xs text-[#554243] mt-0.5">
                  Authenticated as {adminUser.email} with {adminUser.role.toUpperCase()} privileges
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {quickLinks.slice(0, 5).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="bg-[#FAF6F2] hover:bg-white rounded-xl border border-[#EBE2D8] hover:border-[#6D1826] p-3.5 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white border border-[#EBE2D8] group-hover:bg-[#6D1826] group-hover:text-white flex items-center justify-center text-[#6D1826] transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-serif text-xs font-semibold text-[#1F1B17] group-hover:text-[#6D1826] transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8C7A78]">
                      {item.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
