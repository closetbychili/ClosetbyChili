"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BarChart3, RefreshCw } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useAdminContext } from "@/components/admin/AdminGuard";
import {
  getAdminAnalytics,
  type AdminAnalyticsData,
  type AnalyticsPeriodPreset,
} from "@/lib/api/admin";

import DateRangeFilterBar from "./DateRangeFilterBar";
import AnalyticsKpiCards from "./AnalyticsKpiCards";
import RevenueTrendChart from "./RevenueTrendChart";
import OrderStatusBreakdown from "./OrderStatusBreakdown";
import ProductPerformanceSection from "./ProductPerformanceSection";
import CategoryPerformanceSection from "./CategoryPerformanceSection";
import CustomerAnalyticsSection from "./CustomerAnalyticsSection";

export default function AdminAnalyticsClient() {
  const { adminUser } = useAdminContext();
  const [period, setPeriod] = useState<AnalyticsPeriodPreset>("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [granularity, setGranularity] = useState<"auto" | "day" | "week" | "month">("auto");

  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const params: any = {
          period,
          granularity,
          refresh: isRefresh,
        };

        if (period === "custom") {
          if (!startDate || !endDate) {
            setError("Please provide both start date and end date for custom range.");
            setLoading(false);
            setRefreshing(false);
            return;
          }
          params.start_date = startDate;
          params.end_date = endDate;
        }

        const res = await getAdminAnalytics(params);
        setData(res);
      } catch (err: any) {
        console.error("Failed to load admin analytics:", err);
        setError(err.message || "Failed to load analytics telemetry. Please verify server connection.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, startDate, endDate, granularity]
  );

  useEffect(() => {
    // Only auto-trigger when not custom, or when custom dates are ready
    if (period !== "custom" || (startDate && endDate)) {
      loadAnalytics(false);
    }
  }, [period, granularity, loadAnalytics]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <AdminPageHeader
        title="Analytics & Business Intelligence"
        description="Actionable revenue velocity, merchandising turnover, order fulfillment, and patron acquisition insights."
      />

      {/* Date Range & Controls */}
      <DateRangeFilterBar
        period={period}
        onPeriodChange={(p) => {
          setPeriod(p);
          if (p !== "custom") {
            setError(null);
          }
        }}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onApplyCustom={() => loadAnalytics(false)}
        granularity={granularity}
        onGranularityChange={setGranularity}
        onRefresh={() => loadAnalytics(true)}
        isRefreshing={refreshing}
        periodLabel={data?.period_label}
      />

      {/* Error state */}
      {error && (
        <div className="rounded-2xl bg-[#FEF2F2] border border-[#FECACA] p-4 sm:p-5 flex items-start gap-3.5">
          <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-[#991B1B]">Analytics Data Error</h4>
            <p className="text-xs text-[#B91C1C] mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadAnalytics(false)}
            className="text-xs font-semibold text-[#991B1B] hover:text-[#7F1D1D] underline shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Skeleton loading state */}
      {loading && !data && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-[#FAF6F2] border border-[#EBE2D8]"
              />
            ))}
          </div>
          <div className="h-72 rounded-2xl bg-[#FAF6F2] border border-[#EBE2D8]" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 h-64 rounded-2xl bg-[#FAF6F2] border border-[#EBE2D8]" />
            <div className="h-64 rounded-2xl bg-[#FAF6F2] border border-[#EBE2D8]" />
          </div>
        </div>
      )}

      {/* Populated Analytics Sections */}
      {data && (
        <div className="space-y-6">
          {/* Section A: KPI Summary Cards */}
          <AnalyticsKpiCards kpis={data.kpi_summary} />

          {/* Section B: Revenue Trend Chart */}
          <RevenueTrendChart
            data={data.revenue_time_series}
            periodLabel={data.period_label}
            granularity={data.granularity}
          />

          {/* Section C: Order Analytics & Status Breakdown */}
          <OrderStatusBreakdown data={data.order_analytics} />

          {/* Section D: Product Performance */}
          <ProductPerformanceSection data={data.product_performance} />

          {/* Section E: Category Performance */}
          <CategoryPerformanceSection categories={data.category_performance} />

          {/* Section F: Customer Analytics */}
          <CustomerAnalyticsSection data={data.customer_analytics} />
        </div>
      )}
    </div>
  );
}

