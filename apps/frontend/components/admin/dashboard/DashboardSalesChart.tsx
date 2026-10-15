"use client";

import { useState } from "react";
import { BarChart3, Calendar } from "lucide-react";
import type { SalesOverviewPoint } from "@/lib/api/admin";
import { formatINR } from "./DashboardMetricCard";

interface DashboardSalesChartProps {
  data: SalesOverviewPoint[];
  periodLabel: string;
}

export default function DashboardSalesChart({ data, periodLabel }: DashboardSalesChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<SalesOverviewPoint | null>(null);

  // Compute maximum revenue to scale bars
  const numericRevenues = data.map((d) => parseFloat(d.revenue || "0"));
  const maxRevenue = Math.max(...numericRevenues, 100);
  const totalRevenue = numericRevenues.reduce((acc, v) => acc + v, 0);
  const totalOrders = data.reduce((acc, d) => acc + d.orders_count, 0);

  // Format short date for axis
  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const hasSales = totalRevenue > 0 || totalOrders > 0;

  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-serif font-bold text-[#1F1B17]">Sales Overview</h2>
            <span className="text-[11px] font-medium text-[#6D1826] bg-[#FCF2EB] px-2.5 py-0.5 rounded-full border border-[#F3DEC9]">
              {periodLabel}
            </span>
          </div>
          <p className="text-xs text-[#554243]">
            Daily revenue & paid order volume based on verified transaction logs
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#6D1826]" />
            <span className="text-[#554243]">Revenue: </span>
            <span className="font-semibold text-[#1F1B17]">{formatINR(totalRevenue)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#C49A45]" />
            <span className="text-[#554243]">Volume: </span>
            <span className="font-semibold text-[#1F1B17]">
              {totalOrders} {totalOrders === 1 ? "order" : "orders"}
            </span>
          </div>
        </div>
      </div>

      {!hasSales ? (
        <div className="h-64 rounded-xl border border-dashed border-[#EBE2D8] bg-[#FAF6F2] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-white border border-[#EBE2D8] flex items-center justify-center text-[#8C7A78] mb-3">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#1F1B17]">No revenue recorded in this period</h3>
          <p className="text-xs text-[#8C7A78] max-w-sm mt-1">
            Confirmed, paid orders will automatically generate chronological revenue and order frequency points here.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Tooltip display */}
          <div className="h-9 mb-2 flex items-center">
            {hoveredPoint ? (
              <div className="flex items-center gap-3 bg-[#1F1B17] text-white text-xs px-3 py-1.5 rounded-lg shadow-md animate-fadeIn">
                <span className="font-medium flex items-center gap-1 text-[#E6DDD3]">
                  <Calendar className="w-3 h-3" />
                  {formatShortDate(hoveredPoint.date)}
                </span>
                <span className="w-px h-3 bg-[#554243]" />
                <span className="text-[#F3DEC9] font-bold">
                  {formatINR(hoveredPoint.revenue)}
                </span>
                <span className="text-[#A89895]">
                  ({hoveredPoint.orders_count} {hoveredPoint.orders_count === 1 ? "order" : "orders"})
                </span>
              </div>
            ) : (
              <span className="text-xs text-[#A89895] italic">
                Hover or focus over columns to inspect daily order and revenue data.
              </span>
            )}
          </div>

          {/* Accessible Chart Bars */}
          <div
            role="region"
            aria-label="Daily sales timeline chart"
            className="h-56 w-full flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-[#EBE2D8] overflow-x-auto"
          >
            {data.map((point) => {
              const rev = parseFloat(point.revenue || "0");
              const heightPercent = maxRevenue > 0 ? Math.max((rev / maxRevenue) * 100, 3) : 3;
              const hasOrder = point.orders_count > 0;
              const isHovered = hoveredPoint?.date === point.date;

              return (
                <div
                  key={point.date}
                  className="flex-1 min-w-3.5 max-w-10 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onFocus={() => setHoveredPoint(point)}
                  onBlur={() => setHoveredPoint(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${formatShortDate(point.date)}: ${formatINR(point.revenue)}, ${point.orders_count} orders`}
                >
                  <div
                    className={`w-full rounded-t transition-all duration-200 ${
                      isHovered
                        ? "bg-[#4F0012] scale-y-105"
                        : hasOrder
                        ? "bg-[#6D1826] hover:bg-[#4F0012]"
                        : "bg-[#EBE2D8]/60 hover:bg-[#D5C7B8]"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-Axis timeline labels */}
          <div className="flex justify-between items-center text-[10px] text-[#8C7A78] mt-2 px-1">
            <span>{data.length > 0 ? formatShortDate(data[0].date) : ""}</span>
            {data.length > 2 && (
              <span>{formatShortDate(data[Math.floor(data.length / 2)].date)}</span>
            )}
            <span>{data.length > 0 ? formatShortDate(data[data.length - 1].date) : ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
