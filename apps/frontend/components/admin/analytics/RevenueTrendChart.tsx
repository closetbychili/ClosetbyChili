"use client";

import { useState } from "react";
import { BarChart3, Calendar, TrendingUp } from "lucide-react";
import type { RevenueTimeSeriesPoint } from "@/lib/api/admin";
import { formatINR } from "@/components/admin/dashboard/DashboardMetricCard";

interface RevenueTrendChartProps {
  data: RevenueTimeSeriesPoint[];
  periodLabel: string;
  granularity: string;
}

export default function RevenueTrendChart({
  data,
  periodLabel,
  granularity,
}: RevenueTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const numericRevenues = data.map((d) => parseFloat(d.revenue || "0"));
  const maxRevenue = Math.max(...numericRevenues, 100);
  const totalRevenue = numericRevenues.reduce((acc, v) => acc + v, 0);
  const totalOrders = data.reduce((acc, d) => acc + d.orders_count, 0);

  // Peak day / period
  const maxIdx = numericRevenues.indexOf(Math.max(...numericRevenues));
  const peakPoint = maxIdx >= 0 ? data[maxIdx] : null;

  const hasData = totalRevenue > 0 || totalOrders > 0;

  const formatBucketDate = (dStr: string) => {
    try {
      const parts = dStr.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
          year: parts[0] !== new Date().getFullYear().toString() ? "numeric" : undefined,
        });
      }
      return dStr;
    } catch {
      return dStr;
    }
  };

  // SVG dimensions for trend area
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 20;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const pointCount = data.length;
  const points = data.map((d, i) => {
    const x =
      pointCount <= 1
        ? paddingX + chartW / 2
        : paddingX + (i / (pointCount - 1)) * chartW;
    const yVal = parseFloat(d.revenue || "0");
    const y = paddingY + chartH - (yVal / maxRevenue) * chartH;
    return { x, y, point: d, idx: i };
  });

  const pathD = points.length > 0
    ? points.reduce(
        (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
        ""
      )
    : "";

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingY + chartH} L ${points[0].x} ${paddingY + chartH} Z`
    : "";

  const activePoint = hoveredIdx !== null && data[hoveredIdx] ? data[hoveredIdx] : null;

  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] flex flex-col justify-between">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-serif font-bold text-[#1F1B17]">
              Revenue & Sales Velocity
            </h2>
            <span className="text-[11px] font-medium text-[#6D1826] bg-[#FCF2EB] px-2.5 py-0.5 rounded-full border border-[#F3DEC9]">
              {periodLabel}
            </span>
            <span className="text-[10px] font-medium text-[#8C7A78] uppercase tracking-wider bg-[#FAF6F2] px-2 py-0.5 rounded-md border border-[#EBE2D8]">
              {granularity}
            </span>
          </div>
          <p className="text-xs text-[#554243]">
            Chronological trend of realized customer revenue and paid order transactions
          </p>
        </div>

        {/* Legend & Totals */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6D1826]" />
            <span className="text-[#554243]">Period Revenue:</span>
            <span className="font-bold text-[#1F1B17]">{formatINR(totalRevenue)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#C49A45]" />
            <span className="text-[#554243]">Volume:</span>
            <span className="font-bold text-[#1F1B17]">
              {totalOrders} {totalOrders === 1 ? "order" : "orders"}
            </span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="h-64 rounded-xl border border-dashed border-[#EBE2D8] bg-[#FAF6F2] flex flex-col items-center justify-center p-6 text-center my-2">
          <div className="w-10 h-10 rounded-full bg-white border border-[#EBE2D8] flex items-center justify-center text-[#8C7A78] mb-3">
            <BarChart3 className="w-5 h-5 text-[#6D1826]" />
          </div>
          <h3 className="text-sm font-semibold text-[#1F1B17]">No revenue in this timeframe</h3>
          <p className="text-xs text-[#8C7A78] max-w-sm mt-1">
            Confirmed customer payments within the selected dates will render chronological curve and transaction telemetry here.
          </p>
        </div>
      ) : (
        <div className="relative mt-2">
          {/* Active tooltip pill */}
          <div className="h-9 mb-2 flex items-center">
            {activePoint ? (
              <div className="flex items-center gap-3 bg-[#1F1B17] text-white text-xs px-3.5 py-1.5 rounded-lg shadow-md animate-fadeIn">
                <span className="font-medium flex items-center gap-1.5 text-[#E6DDD3]">
                  <Calendar className="w-3.5 h-3.5 text-[#C49A45]" />
                  {formatBucketDate(activePoint.date)}
                </span>
                <span className="w-px h-3 bg-[#554243]" />
                <span className="text-[#F3DEC9] font-bold">
                  {formatINR(activePoint.revenue)}
                </span>
                <span className="text-[#A89895]">
                  ({activePoint.orders_count} {activePoint.orders_count === 1 ? "order" : "orders"})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#8C7A78]">
                <TrendingUp className="w-3.5 h-3.5 text-[#6D1826]" />
                {peakPoint && parseFloat(peakPoint.revenue) > 0 ? (
                  <span>
                    Peak Day: <strong className="text-[#1F1B17]">{formatBucketDate(peakPoint.date)}</strong> with{" "}
                    <strong className="text-[#6D1826]">{formatINR(peakPoint.revenue)}</strong> ({peakPoint.orders_count} orders)
                  </span>
                ) : (
                  <span>Hover over points on the curve to inspect daily sales telemetry.</span>
                )}
              </div>
            )}
          </div>

          {/* SVG Chart Area */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-52 select-none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6D1826" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#6D1826" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              <line
                x1={paddingX}
                y1={paddingY}
                x2={svgWidth - paddingX}
                y2={paddingY}
                stroke="#F2ECE5"
                strokeDasharray="4 4"
              />
              <line
                x1={paddingX}
                y1={paddingY + chartH / 2}
                x2={svgWidth - paddingX}
                y2={paddingY + chartH / 2}
                stroke="#F2ECE5"
                strokeDasharray="4 4"
              />
              <line
                x1={paddingX}
                y1={paddingY + chartH}
                x2={svgWidth - paddingX}
                y2={paddingY + chartH}
                stroke="#EBE2D8"
              />

              {/* Gradient Area Fill */}
              {areaD && <path d={areaD} fill="url(#revenueAreaGrad)" />}

              {/* Primary Curve */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#6D1826"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Data Nodes */}
              {points.map((p) => {
                const isHovered = hoveredIdx === p.idx;
                return (
                  <g
                    key={p.idx}
                    onMouseEnter={() => setHoveredIdx(p.idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer"
                  >
                    {/* Invisible hover target */}
                    <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
                    {/* Outer ring */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? "5.5" : "3"}
                      fill="#FFFFFF"
                      stroke="#6D1826"
                      strokeWidth={isHovered ? "2.5" : "1.5"}
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Date Axis Labels */}
          {points.length > 0 && (
            <div className="flex justify-between items-center text-[10px] text-[#8C7A78] pt-2 border-t border-[#F2ECE5]">
              <span>{formatBucketDate(points[0].point.date)}</span>
              {points.length > 2 && (
                <span>
                  {formatBucketDate(points[Math.floor(points.length / 2)].point.date)}
                </span>
              )}
              <span>{formatBucketDate(points[points.length - 1].point.date)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

