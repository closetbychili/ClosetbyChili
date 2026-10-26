"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  TicketPercent,
  CheckCircle2,
  RotateCcw,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  DollarSign,
  Receipt,
} from "lucide-react";
import {
  getAdminCouponReportsOverview,
  getAdminCouponReportsPerformance,
  getAdminCouponReportsRedemptions,
  type AdminCouponReportOverview,
  type AdminCouponPerformanceItem,
  type AdminCouponRedemptionReportItem,
} from "@/lib/api/admin";

export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0.00";
  const numeric = typeof amount === "number" ? amount : parseFloat(amount || "0");
  if (isNaN(numeric)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "—";
  }
}

type DatePreset = "7d" | "30d" | "90d" | "all" | "custom";

function computePresetDates(preset: DatePreset): { start_date?: string; end_date?: string } {
  const now = new Date();
  const end_date = now.toISOString().split("T")[0];

  if (preset === "7d") {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start_date: d.toISOString().split("T")[0], end_date };
  }
  if (preset === "30d") {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start_date: d.toISOString().split("T")[0], end_date };
  }
  if (preset === "90d") {
    const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { start_date: d.toISOString().split("T")[0], end_date };
  }
  return {};
}

const PAGE_SIZE = 15;

export default function AdminCouponReportsView() {
  // Navigation sub-tab: 'performance' | 'redemptions'
  const [activeTab, setActiveTab] = useState<"performance" | "redemptions">("performance");

  // Date Range State
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [appliedDateRange, setAppliedDateRange] = useState<{ start_date?: string; end_date?: string }>(() =>
    computePresetDates("30d")
  );

  // Overview Data State
  const [overview, setOverview] = useState<AdminCouponReportOverview | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Coupon Performance Table State
  const [performanceItems, setPerformanceItems] = useState<AdminCouponPerformanceItem[]>([]);
  const [perfTotalCount, setPerfTotalCount] = useState<number>(0);
  const [perfPage, setPerfPage] = useState<number>(1);
  const [perfSearch, setPerfSearch] = useState<string>("");
  const [perfIsActive, setPerfIsActive] = useState<string>("all");
  const [perfDiscountType, setPerfDiscountType] = useState<string>("all");
  const [perfLifecycle, setPerfLifecycle] = useState<string>("all");
  const [perfOrdering, setPerfOrdering] = useState<string>("-successful_redemptions_count");
  const [isPerfLoading, setIsPerfLoading] = useState<boolean>(true);
  const [perfError, setPerfError] = useState<string | null>(null);

  // Redemptions Report Table State
  const [redemptionsItems, setRedemptionsItems] = useState<AdminCouponRedemptionReportItem[]>([]);
  const [redemptionsTotalCount, setRedemptionsTotalCount] = useState<number>(0);
  const [redemptionsPage, setRedemptionsPage] = useState<number>(1);
  const [redemptionsSearch, setRedemptionsSearch] = useState<string>("");
  const [redemptionsState, setRedemptionsState] = useState<string>("all");
  const [redemptionsOrderStatus, setRedemptionsOrderStatus] = useState<string>("all");
  const [redemptionsPaymentStatus, setRedemptionsPaymentStatus] = useState<string>("all");
  const [redemptionsOrdering, setRedemptionsOrdering] = useState<string>("-created_at");
  const [isRedemptionsLoading, setIsRedemptionsLoading] = useState<boolean>(true);
  const [redemptionsError, setRedemptionsError] = useState<string | null>(null);

  // General Refresh state
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Handle Date Preset Change
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      const dates = computePresetDates(preset);
      setAppliedDateRange(dates);
      setPerfPage(1);
      setRedemptionsPage(1);
    }
  };

  const handleApplyCustomDateRange = () => {
    if (!customStartDate && !customEndDate) {
      setAppliedDateRange({});
    } else {
      setAppliedDateRange({
        start_date: customStartDate || undefined,
        end_date: customEndDate || undefined,
      });
    }
    setPerfPage(1);
    setRedemptionsPage(1);
  };

  // Effects for reactive data fetching
  useEffect(() => {
    let ignore = false;
    getAdminCouponReportsOverview(appliedDateRange)
      .then((data) => {
        if (!ignore) {
          setOverview(data);
          setOverviewError(null);
          setIsOverviewLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg =
            (err as { message?: string })?.message || "Failed to load overview report metrics.";
          setOverviewError(msg);
          setIsOverviewLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [appliedDateRange]);

  useEffect(() => {
    let ignore = false;
    getAdminCouponReportsPerformance({
      page: perfPage,
      page_size: PAGE_SIZE,
      search: perfSearch || undefined,
      start_date: appliedDateRange.start_date,
      end_date: appliedDateRange.end_date,
      is_active: perfIsActive !== "all" ? perfIsActive : undefined,
      discount_type: perfDiscountType !== "all" ? perfDiscountType : undefined,
      lifecycle_status: perfLifecycle !== "all" ? perfLifecycle : undefined,
      ordering: perfOrdering,
    })
      .then((data) => {
        if (!ignore) {
          setPerformanceItems(data.results || []);
          setPerfTotalCount(data.count || 0);
          setPerfError(null);
          setIsPerfLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg =
            (err as { message?: string })?.message || "Failed to load coupon performance metrics.";
          setPerfError(msg);
          setIsPerfLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [
    perfPage,
    perfSearch,
    appliedDateRange,
    perfIsActive,
    perfDiscountType,
    perfLifecycle,
    perfOrdering,
  ]);

  useEffect(() => {
    let ignore = false;
    getAdminCouponReportsRedemptions({
      page: redemptionsPage,
      page_size: PAGE_SIZE,
      search: redemptionsSearch || undefined,
      start_date: appliedDateRange.start_date,
      end_date: appliedDateRange.end_date,
      state: redemptionsState !== "all" ? redemptionsState : undefined,
      order_status: redemptionsOrderStatus !== "all" ? redemptionsOrderStatus : undefined,
      payment_status: redemptionsPaymentStatus !== "all" ? redemptionsPaymentStatus : undefined,
      ordering: redemptionsOrdering,
    })
      .then((data) => {
        if (!ignore) {
          setRedemptionsItems(data.results || []);
          setRedemptionsTotalCount(data.count || 0);
          setRedemptionsError(null);
          setIsRedemptionsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg =
            (err as { message?: string })?.message || "Failed to load redemption history report.";
          setRedemptionsError(msg);
          setIsRedemptionsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [
    redemptionsPage,
    redemptionsSearch,
    appliedDateRange,
    redemptionsState,
    redemptionsOrderStatus,
    redemptionsPaymentStatus,
    redemptionsOrdering,
  ]);

  // Manual callback handlers for retry and refresh
  const fetchOverview = useCallback(async () => {
    setIsOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await getAdminCouponReportsOverview(appliedDateRange);
      setOverview(data);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to load overview report metrics.";
      setOverviewError(msg);
    } finally {
      setIsOverviewLoading(false);
    }
  }, [appliedDateRange]);

  const fetchPerformance = useCallback(async () => {
    setIsPerfLoading(true);
    setPerfError(null);
    try {
      const data = await getAdminCouponReportsPerformance({
        page: perfPage,
        page_size: PAGE_SIZE,
        search: perfSearch || undefined,
        start_date: appliedDateRange.start_date,
        end_date: appliedDateRange.end_date,
        is_active: perfIsActive !== "all" ? perfIsActive : undefined,
        discount_type: perfDiscountType !== "all" ? perfDiscountType : undefined,
        lifecycle_status: perfLifecycle !== "all" ? perfLifecycle : undefined,
        ordering: perfOrdering,
      });
      setPerformanceItems(data.results || []);
      setPerfTotalCount(data.count || 0);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to load coupon performance metrics.";
      setPerfError(msg);
    } finally {
      setIsPerfLoading(false);
    }
  }, [
    perfPage,
    perfSearch,
    appliedDateRange,
    perfIsActive,
    perfDiscountType,
    perfLifecycle,
    perfOrdering,
  ]);

  const fetchRedemptions = useCallback(async () => {
    setIsRedemptionsLoading(true);
    setRedemptionsError(null);
    try {
      const data = await getAdminCouponReportsRedemptions({
        page: redemptionsPage,
        page_size: PAGE_SIZE,
        search: redemptionsSearch || undefined,
        start_date: appliedDateRange.start_date,
        end_date: appliedDateRange.end_date,
        state: redemptionsState !== "all" ? redemptionsState : undefined,
        order_status: redemptionsOrderStatus !== "all" ? redemptionsOrderStatus : undefined,
        payment_status: redemptionsPaymentStatus !== "all" ? redemptionsPaymentStatus : undefined,
        ordering: redemptionsOrdering,
      });
      setRedemptionsItems(data.results || []);
      setRedemptionsTotalCount(data.count || 0);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to load redemption history report.";
      setRedemptionsError(msg);
    } finally {
      setIsRedemptionsLoading(false);
    }
  }, [
    redemptionsPage,
    redemptionsSearch,
    appliedDateRange,
    redemptionsState,
    redemptionsOrderStatus,
    redemptionsPaymentStatus,
    redemptionsOrdering,
  ]);

  // Refresh All
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchOverview(), fetchPerformance(), fetchRedemptions()]);
    } finally {
      setIsRefreshing(false);
    }
  };


  const perfTotalPages = Math.max(1, Math.ceil(perfTotalCount / PAGE_SIZE));
  const redemptionsTotalPages = Math.max(1, Math.ceil(redemptionsTotalCount / PAGE_SIZE));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls: Date Range Bar & Refresh */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 mr-1">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span>Reporting Window:</span>
          </div>

          <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5 text-xs font-medium">
            {(
              [
                { id: "7d", label: "7 Days" },
                { id: "30d", label: "30 Days" },
                { id: "90d", label: "90 Days" },
                { id: "all", label: "All Time" },
                { id: "custom", label: "Custom" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePresetChange(opt.id)}
                className={`px-3 py-1.5 rounded-md transition ${
                  datePreset === opt.id
                    ? "bg-white font-semibold text-stone-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white"
                placeholder="From"
              />
              <span className="text-stone-400 text-xs">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white"
                placeholder="To"
              />
              <button
                type="button"
                onClick={handleApplyCustomDateRange}
                className="px-3 py-1 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {appliedDateRange.start_date || appliedDateRange.end_date ? (
            <span className="text-[11px] text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full font-mono">
              {appliedDateRange.start_date || "Earliest"} → {appliedDateRange.end_date || "Latest"}
            </span>
          ) : (
            <span className="text-[11px] text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
              Full Historical Ledger
            </span>
          )}

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing || isOverviewLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      {overviewError ? (
        <div className="bg-white border border-rose-200 rounded-xl p-6 text-center space-y-2">
          <div className="inline-flex p-2.5 rounded-full bg-rose-50 text-rose-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-stone-900">{overviewError}</p>
          <button
            type="button"
            onClick={fetchOverview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Overview</span>
          </button>
        </div>
      ) : isOverviewLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-stone-200 rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-stone-100 rounded w-1/2" />
              <div className="h-8 bg-stone-100 rounded w-3/4" />
              <div className="h-3 bg-stone-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : overview ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Successful Redemptions */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between text-emerald-800 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Successful Redemptions
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold text-stone-900">
                {overview.successful_redemptions_count}
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <span>In-flight Reserved: {overview.reserved_redemptions_count}</span>
                <span className="text-stone-400">Released: {overview.released_redemptions_count}</span>
              </div>
            </div>

            {/* Card 2: Discount Granted */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Paid Discounts Granted
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <TicketPercent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold text-stone-900">
                {formatINR(overview.total_discount_granted)}
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <span>Avg / Redemption:</span>
                <span className="font-semibold text-stone-800">
                  {formatINR(overview.average_discount_per_redemption)}
                </span>
              </div>
            </div>

            {/* Card 3: Paid Order Revenue */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Coupon Paid Revenue
                </span>
                <div className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold text-stone-900">
                {formatINR(overview.total_paid_revenue ?? overview.paid_orders_revenue)}
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <span>
                  Net AOV:{" "}
                  {formatINR(
                    overview.average_order_value_after_discount ?? overview.average_paid_order_value
                  )}
                </span>
                <span className="text-stone-400">
                  (Gross: {formatINR(overview.average_order_value_before_discount)})
                </span>
              </div>
            </div>

            {/* Card 4: Distinct Customers & Capacity */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Audience & Capacity
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold text-stone-900">
                {overview.distinct_customers_count}
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <span>Active Campaigns: {overview.active_coupons_count ?? overview.active_coupons ?? 0}</span>
                <span>
                  Remaining:{" "}
                  {(() => {
                    const rem =
                      overview.global_capacity_metrics?.total_remaining_capacity ??
                      overview.total_remaining_capacity;
                    return rem !== null && rem !== undefined && rem >= 0 ? rem : "—";
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Pills: Order & Payment Status Breakdown */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-stone-600 uppercase tracking-wider text-[11px]">
                Order Status Distribution:
              </span>
              {Object.entries(overview.orders_by_order_status ?? overview.orders_by_status ?? {}).length === 0 ? (
                <span className="text-stone-400">None</span>
              ) : (
                Object.entries(overview.orders_by_order_status ?? overview.orders_by_status ?? {}).map(([st, count]) => (
                  <span
                    key={st}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-50 border border-stone-200 font-medium text-stone-700"
                  >
                    <span>{st}:</span>
                    <span className="font-bold text-stone-900">{count}</span>
                  </span>
                ))
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-stone-600 uppercase tracking-wider text-[11px]">
                Payment Status Distribution:
              </span>
              {Object.entries(overview.orders_by_payment_status ?? {}).length === 0 ? (
                <span className="text-stone-400">None</span>
              ) : (
                Object.entries(overview.orders_by_payment_status ?? {}).map(([pst, count]) => (
                  <span
                    key={pst}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${
                      pst === "PAID"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : pst === "FAILED"
                        ? "bg-rose-50 border-rose-200 text-rose-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}
                  >
                    <span>{pst}:</span>
                    <span className="font-bold">{count}</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

      ) : null}

      {/* Module Sub-tabs: Performance vs Redemptions Ledger */}
      <div className="border-b border-stone-200 flex items-center justify-between pt-2">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("performance")}
            className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "performance"
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Coupon Performance Table</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono">
              {perfTotalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("redemptions")}
            className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "redemptions"
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Cross-Coupon Redemption Ledger</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono">
              {redemptionsTotalCount}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: Coupon Performance Table */}
      {activeTab === "performance" && (
        <div className="space-y-4">
          {/* Performance Filters & Search */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={perfSearch}
                onChange={(e) => {
                  setPerfSearch(e.target.value);
                  setPerfPage(1);
                }}
                placeholder="Search promo code or campaign name..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={perfIsActive}
                onChange={(e) => {
                  setPerfIsActive(e.target.value);
                  setPerfPage(1);
                }}
                className="px-2.5 py-2 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white"
              >
                <option value="all">Status: All</option>
                <option value="true">Active only</option>
                <option value="false">Inactive only</option>
              </select>

              <select
                value={perfDiscountType}
                onChange={(e) => {
                  setPerfDiscountType(e.target.value);
                  setPerfPage(1);
                }}
                className="px-2.5 py-2 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white"
              >
                <option value="all">Type: All</option>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed (₹)</option>
              </select>

              <select
                value={perfLifecycle}
                onChange={(e) => {
                  setPerfLifecycle(e.target.value);
                  setPerfPage(1);
                }}
                className="px-2.5 py-2 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white"
              >
                <option value="all">Lifecycle: All</option>
                <option value="CURRENTLY_VALID">Currently Valid</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="EXPIRED">Expired</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <select
                value={perfOrdering}
                onChange={(e) => {
                  setPerfOrdering(e.target.value);
                  setPerfPage(1);
                }}
                className="px-2.5 py-2 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white font-medium"
              >
                <option value="-successful_redemptions_count">Sort: Most Redemptions</option>
                <option value="-paid_order_revenue">Sort: Highest Paid Revenue</option>
                <option value="-total_discount_amount">Sort: Highest Discount</option>
                <option value="-last_redemption_at">Sort: Most Recent Redemption</option>
                <option value="code">Sort: Code A-Z</option>
              </select>
            </div>
          </div>

          {/* Performance Data Table */}
          {perfError ? (
            <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
              <p className="text-sm font-medium text-stone-900">{perfError}</p>
              <button
                type="button"
                onClick={fetchPerformance}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg"
              >
                Retry
              </button>
            </div>
          ) : isPerfLoading ? (
            <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-xs text-stone-500 animate-pulse">
              Loading coupon performance dataset...
            </div>
          ) : performanceItems.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-2">
              <TicketPercent className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-medium text-stone-700">No coupon performance records found</p>
              <p className="text-xs text-stone-400">
                Try widening your date range or adjusting the active filters.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50/75 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Coupon</th>
                      <th className="py-3 px-4">Lifecycle / Status</th>
                      <th className="py-3 px-4">Discount</th>
                      <th className="py-3 px-4 text-right">Redemptions</th>
                      <th className="py-3 px-4 text-right">Customers</th>
                      <th className="py-3 px-4 text-right">Paid Revenue</th>
                      <th className="py-3 px-4 text-right">Total Discount</th>
                      <th className="py-3 px-4 text-right">Avg Order Value</th>
                      <th className="py-3 px-4 text-center">Remaining Capacity</th>
                      <th className="py-3 px-4">Last Redeemed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {performanceItems.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-stone-900">{item.code}</div>
                          <div className="text-[11px] text-stone-500 truncate max-w-xs">{item.name}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.is_active
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-stone-100 text-stone-500 border border-stone-200"
                              }`}
                            >
                              {item.is_active ? "Active" : "Inactive"}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {item.lifecycle_status.replace("_", " ")}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-stone-800">
                            {item.discount_type === "PERCENTAGE"
                              ? `${parseFloat(item.discount_value)}%`
                              : formatINR(item.discount_value)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-medium text-stone-900">
                          {item.successful_redemptions_count}
                        </td>

                        <td className="py-3 px-4 text-right text-stone-600">
                          {item.distinct_customers_count}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="font-semibold text-stone-900">
                            {formatINR(item.paid_order_revenue)}
                          </div>
                          <div className="text-[10px] text-stone-400">{item.paid_order_count} paid orders</div>
                        </td>

                        <td className="py-3 px-4 text-right font-semibold text-rose-700">
                          {formatINR(item.total_discount_amount)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="text-stone-800 font-medium">
                            {formatINR(item.average_order_value_after_discount)}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            Pre: {formatINR(item.average_order_value_before_discount)}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {item.remaining_capacity !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                                item.remaining_capacity <= 5
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-stone-50 text-stone-700 border border-stone-200"
                              }`}
                            >
                              {item.remaining_capacity} left
                            </span>
                          ) : (
                            <span className="text-stone-400 font-mono text-[11px]">Unlimited</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                          {formatDate(item.last_redemption_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Performance Pagination */}
              <div className="py-3 px-4 bg-stone-50/75 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
                <span>
                  Showing page {perfPage} of {perfTotalPages} ({perfTotalCount} campaigns)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPerfPage((p) => Math.max(1, p - 1))}
                    disabled={perfPage <= 1}
                    className="p-1.5 rounded-md border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerfPage((p) => Math.min(perfTotalPages, p + 1))}
                    disabled={perfPage >= perfTotalPages}
                    className="p-1.5 rounded-md border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Cross-Coupon Redemption Audit History */}
      {activeTab === "redemptions" && (
        <div className="space-y-4">
          {/* Redemptions Filters & Search */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={redemptionsSearch}
                onChange={(e) => {
                  setRedemptionsSearch(e.target.value);
                  setRedemptionsPage(1);
                }}
                placeholder="Search code, order #, or release reason..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={redemptionsState}
                onChange={(e) => {
                  setRedemptionsState(e.target.value);
                  setRedemptionsPage(1);
                }}
                className="px-2.5 py-2 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white font-medium"
              >
                <option value="all">Redemption State: All</option>
                <option value="REDEEMED">REDEEMED (Successful)</option>
                <option value="RESERVED">RESERVED (In Checkout)</option>
                <option value="RELEASED">RELEASED (Cancelled / Expired)</option>
              </select>

              <select
                value={redemptionsPaymentStatus}
                onChange={(e) => {
                  setRedemptionsPaymentStatus(e.target.value);
                  setRedemptionsPage(1);
                }}
                className="px-2.5 py-2 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white"
              >
                <option value="all">Payment: All</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>

              <select
                value={redemptionsOrderStatus}
                onChange={(e) => {
                  setRedemptionsOrderStatus(e.target.value);
                  setRedemptionsPage(1);
                }}
                className="px-2.5 py-2 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white"
              >
                <option value="all">Order Status: All</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <select
                value={redemptionsOrdering}
                onChange={(e) => {
                  setRedemptionsOrdering(e.target.value);
                  setRedemptionsPage(1);
                }}
                className="px-2.5 py-2 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white font-medium"
              >
                <option value="-created_at">Order: Most Recent First</option>
                <option value="created_at">Order: Oldest First</option>
                <option value="-discount_amount">Order: Highest Discount</option>
                <option value="discount_amount">Order: Lowest Discount</option>
              </select>
            </div>
          </div>

          {/* Redemptions Audit Table */}
          {redemptionsError ? (
            <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
              <p className="text-sm font-medium text-stone-900">{redemptionsError}</p>
              <button
                type="button"
                onClick={fetchRedemptions}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg"
              >
                Retry
              </button>
            </div>
          ) : isRedemptionsLoading ? (
            <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-xs text-stone-500 animate-pulse">
              Loading redemption ledger records...
            </div>
          ) : redemptionsItems.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-2">
              <Receipt className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-medium text-stone-700">No redemptions found for criteria</p>
              <p className="text-xs text-stone-400">
                Adjust the redemption state, order filters, or date range.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50/75 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Coupon</th>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Masked Customer</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4 text-right">Discount Snapshot</th>
                      <th className="py-3 px-4">Reservation Time</th>
                      <th className="py-3 px-4">Finalized Time</th>
                      <th className="py-3 px-4">Release Note</th>
                      <th className="py-3 px-4">Order & Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {redemptionsItems.map((r) => (
                      <tr key={r.id} className="hover:bg-stone-50/60 transition">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-stone-900">{r.coupon_code}</span>
                          <div className="text-[10px] text-stone-400 truncate max-w-xs">{r.coupon_name}</div>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-stone-800">
                          {r.order_number || <span className="text-stone-400 font-normal">—</span>}
                        </td>

                        <td className="py-3 px-4 font-mono text-stone-600">
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                            <span>{r.customer_email_masked}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${
                              r.state === "REDEEMED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : r.state === "RESERVED"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-stone-100 text-stone-600 border border-stone-200"
                            }`}
                          >
                            {r.state}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-semibold text-rose-700 font-mono">
                          {formatINR(r.discount_amount)}
                        </td>

                        <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                          {formatDate(r.created_at)}
                        </td>

                        <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                          {formatDate(r.finalized_at)}
                        </td>

                        <td className="py-3 px-4 text-stone-500 text-[11px] max-w-xs">
                          {r.released_at ? (
                            <div>
                              <div className="text-rose-600 font-medium">
                                Released: {formatDate(r.released_at)}
                              </div>
                              {r.release_reason && (
                                <div className="text-stone-400 truncate" title={r.release_reason}>
                                  {r.release_reason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start text-[10px]">
                            {r.order_status ? (
                              <span className="font-semibold text-stone-800">
                                Status: {r.order_status}
                              </span>
                            ) : null}
                            {r.payment_status ? (
                              <span
                                className={`font-semibold ${
                                  r.payment_status === "PAID"
                                    ? "text-emerald-700"
                                    : r.payment_status === "FAILED"
                                    ? "text-rose-700"
                                    : "text-amber-700"
                                }`}
                              >
                                Payment: {r.payment_status}
                              </span>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Redemptions Pagination */}
              <div className="py-3 px-4 bg-stone-50/75 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
                <span>
                  Showing page {redemptionsPage} of {redemptionsTotalPages} ({redemptionsTotalCount}{" "}
                  redemptions)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRedemptionsPage((p) => Math.max(1, p - 1))}
                    disabled={redemptionsPage <= 1}
                    className="p-1.5 rounded-md border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRedemptionsPage((p) => Math.min(redemptionsTotalPages, p + 1))}
                    disabled={redemptionsPage >= redemptionsTotalPages}
                    className="p-1.5 rounded-md border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
