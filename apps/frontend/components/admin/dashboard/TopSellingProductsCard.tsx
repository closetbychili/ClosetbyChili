"use client";

import Link from "next/link";
import { ArrowRight, Package, Trophy } from "lucide-react";
import type { TopSellingProduct } from "@/lib/api/admin";
import { formatINR } from "./DashboardMetricCard";

interface TopSellingProductsCardProps {
  products: TopSellingProduct[];
}

export default function TopSellingProductsCard({ products }: TopSellingProductsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-serif font-bold text-[#1F1B17]">Top-Selling Curations</h2>
            <p className="text-xs text-[#554243] mt-0.5">
              Ranked by aggregate paid order items and sales volume
            </p>
          </div>
          <Link
            href="/admin/products"
            className="text-xs font-medium text-[#6D1826] hover:text-[#4F0012] flex items-center gap-1 transition-colors"
          >
            <span>Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="py-10 rounded-xl border border-dashed border-[#EBE2D8] bg-[#FAF6F2] flex flex-col items-center justify-center text-center p-6">
            <div className="w-10 h-10 rounded-full bg-white border border-[#EBE2D8] flex items-center justify-center text-[#8C7A78] mb-3">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#1F1B17]">No paid order items yet</h3>
            <p className="text-xs text-[#8C7A78] max-w-xs mt-1">
              Top products will automatically rank here once customer purchases are confirmed.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F2ECE5]">
            {products.map((item, idx) => (
              <div
                key={item.product_id || item.product_name + idx}
                className="py-3 flex items-center justify-between gap-3 hover:bg-[#FAF6F2]/50 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0
                        ? "bg-[#FCF2EB] text-[#6D1826] border border-[#F3DEC9]"
                        : "bg-[#FAF6F2] text-[#8C7A78] border border-[#EBE2D8]"
                    }`}
                  >
                    {idx === 0 ? <Trophy className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-[#1F1B17] truncate">
                      {item.product_name}
                    </h3>
                    <span className="text-[11px] text-[#8C7A78]">
                      {item.units_sold} {item.units_sold === 1 ? "unit sold" : "units sold"}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-[#1F1B17] block">
                    {formatINR(item.revenue)}
                  </span>
                  <span className="text-[10px] text-[#8C7A78]">gross sales</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-[#F2ECE5] flex items-center justify-between text-[11px] text-[#8C7A78]">
        <span>Aggregated from paid order items</span>
        <span className="text-[#A89895]">Top 5 performers</span>
      </div>
    </div>
  );
}
