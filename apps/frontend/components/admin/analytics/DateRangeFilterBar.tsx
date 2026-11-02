"use client";

import { Calendar, RefreshCw, SlidersHorizontal } from "lucide-react";
import type { AnalyticsPeriodPreset } from "@/lib/api/admin";

interface DateRangeFilterBarProps {
  period: AnalyticsPeriodPreset;
  onPeriodChange: (p: AnalyticsPeriodPreset) => void;
  startDate: string;
  onStartDateChange: (d: string) => void;
  endDate: string;
  onEndDateChange: (d: string) => void;
  onApplyCustom: () => void;
  granularity: "auto" | "day" | "week" | "month";
  onGranularityChange: (g: "auto" | "day" | "week" | "month") => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  periodLabel?: string;
}

const PRESETS: Array<{ id: AnalyticsPeriodPreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "90d", label: "Last 90 Days" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "custom", label: "Custom Range" },
];

export default function DateRangeFilterBar({
  period,
  onPeriodChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onApplyCustom,
  granularity,
  onGranularityChange,
  onRefresh,
  isRefreshing,
  periodLabel,
}: DateRangeFilterBarProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Presets Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {PRESETS.map((p) => {
            const isActive = period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPeriodChange(p.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#6D1826] text-white shadow-sm font-semibold"
                    : "bg-[#FAF6F2] text-[#554243] hover:bg-[#F2ECE5] border border-[#EBE2D8]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Right tools: Granularity + Refresh */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {/* Bucket Granularity */}
          <div className="flex items-center gap-1 bg-[#FAF6F2] border border-[#EBE2D8] rounded-xl px-2.5 py-1 text-xs text-[#554243]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C7A78]" />
            <span className="hidden sm:inline text-[#8C7A78]">Bucket:</span>
            <select
              value={granularity}
              onChange={(e) =>
                onGranularityChange(
                  e.target.value as "auto" | "day" | "week" | "month"
                )
              }
              aria-label="Granularity"
              className="bg-transparent text-xs font-semibold text-[#1F1B17] focus:outline-none cursor-pointer"
            >
              <option value="auto">Auto</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-medium bg-[#FAF6F2] hover:bg-[#F2ECE5] text-[#1F1B17] border border-[#EBE2D8] px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#6D1826] ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Bar (visible when 'custom' is selected) */}
      {period === "custom" && (
        <div className="pt-3 border-t border-[#F2ECE5] flex flex-wrap items-center gap-3 bg-[#FAF6F2] p-3 rounded-xl border border-[#EBE2D8]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#1F1B17]">
            <Calendar className="w-4 h-4 text-[#6D1826]" />
            <span>Select Custom Range:</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-white border border-[#EBE2D8] rounded-lg px-2.5 py-1 text-xs text-[#1F1B17] focus:outline-none focus:border-[#6D1826]"
              aria-label="Start date"
            />
            <span className="text-xs text-[#8C7A78]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-white border border-[#EBE2D8] rounded-lg px-2.5 py-1 text-xs text-[#1F1B17] focus:outline-none focus:border-[#6D1826]"
              aria-label="End date"
            />
          </div>

          <button
            type="button"
            onClick={onApplyCustom}
            className="bg-[#6D1826] hover:bg-[#52121D] text-white text-xs font-medium px-3.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* Active Range Indicator */}
      {periodLabel && (
        <div className="text-[11px] text-[#8C7A78] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6D1826]" />
          <span>Active Window:</span>
          <strong className="text-[#1F1B17]">{periodLabel}</strong>
          <span className="hidden sm:inline text-[#A89895]">
            (Compared with prior equivalent timeframe)
          </span>
        </div>
      )}
    </div>
  );
}

