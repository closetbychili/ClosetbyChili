"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, Flame, Layers, Package, TrendingDown } from "lucide-react";
import type { AnalyticsProductItem, ProductPerformanceData } from "@/lib/api/admin";
import { formatINR } from "@/components/admin/dashboard/DashboardMetricCard";

interface ProductPerformanceSectionProps {
  data: ProductPerformanceData;
}

export default function ProductPerformanceSection({
  data,
}: ProductPerformanceSectionProps) {
  const [tab, setTab] = useState<"revenue" | "units" | "slow">("revenue");

  let activeList: AnalyticsProductItem[] = [];
  if (tab === "revenue") activeList = data.top_by_revenue;
  else if (tab === "units") activeList = data.top_by_units;
  else activeList = data.slow_moving;

  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-serif font-bold text-[#1F1B17]">
            Product & Silhouette Performance
          </h3>
          <p className="text-xs text-[#554243]">
            Merchandising velocity rankings based on confirmed customer purchases
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 bg-[#FAF6F2] p-1 rounded-xl border border-[#EBE2D8] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTab("revenue")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === "revenue"
                ? "bg-[#6D1826] text-white shadow-sm"
                : "text-[#554243] hover:text-[#1F1B17]"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Top Revenue
          </button>

          <button
            type="button"
            onClick={() => setTab("units")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === "units"
                ? "bg-[#6D1826] text-white shadow-sm"
                : "text-[#554243] hover:text-[#1F1B17]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Top Units
          </button>

          <button
            type="button"
            onClick={() => setTab("slow")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === "slow"
                ? "bg-[#6D1826] text-white shadow-sm"
                : "text-[#554243] hover:text-[#1F1B17]"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Slow-Moving
          </button>
        </div>
      </div>

      {activeList.length === 0 ? (
        <div className="py-12 text-center rounded-xl border border-dashed border-[#EBE2D8] bg-[#FAF6F2]">
          <Package className="w-8 h-8 text-[#8C7A78] mx-auto mb-2" />
          <p className="text-xs text-[#8C7A78]">
            No product telemetry recorded for this timeframe.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EBE2D8] text-[11px] font-semibold text-[#8C7A78] uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3">Product Silhouette</th>
                <th className="py-3 px-3 text-right">Units Sold</th>
                <th className="py-3 px-3 text-right">Revenue</th>
                {tab === "slow" ? (
                  <th className="py-3 px-3 text-right">Available Stock</th>
                ) : (
                  <th className="py-3 px-3 text-right">Orders</th>
                )}
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2ECE5] text-xs">
              {activeList.map((prod, idx) => (
                <tr
                  key={prod.product_id || idx}
                  className="hover:bg-[#FAF6F2] transition-colors"
                >
                  <td className="py-3 px-3 text-center font-bold text-[#8C7A78]">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-[#1F1B17] block">
                      {prod.product_name}
                    </span>
                    {prod.product_id && (
                      <span className="text-[10px] text-[#A89895] font-mono">
                        ID: {prod.product_id.slice(0, 8)}...
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-[#1F1B17]">
                    {prod.units_sold.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-3 text-right font-bold font-serif text-[#1F1B17]">
                    {formatINR(prod.revenue)}
                  </td>
                  {tab === "slow" ? (
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                          (prod.available_stock ?? 0) > 0
                            ? "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                            : "bg-[#F3F4F6] text-[#6B7280]"
                        }`}
                      >
                        {prod.available_stock ?? 0} in stock
                      </span>
                    </td>
                  ) : (
                    <td className="py-3 px-3 text-right text-[#554243]">
                      {prod.orders_count ?? 1}
                    </td>
                  )}
                  <td className="py-3 px-3 text-right">
                    {prod.product_id ? (
                      <Link
                        href={`/admin/products/${prod.product_id}/edit`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D1826] hover:text-[#52121D] transition-colors"
                      >
                        Manage
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-[#A89895] text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

