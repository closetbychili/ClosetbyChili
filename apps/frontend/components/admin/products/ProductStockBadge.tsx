"use client";

import type { AdminProductStockSummary } from "@/lib/api/admin";

interface ProductStockBadgeProps {
  stockSummary: AdminProductStockSummary;
}

export default function ProductStockBadge({ stockSummary }: ProductStockBadgeProps) {
  const { total_available, total_reserved, status } = stockSummary;

  switch (status) {
    case "in_stock":
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span>{total_available} in stock</span>
          </span>
          {total_reserved > 0 && (
            <span className="text-[10px] text-[#8C7A78] font-mono pl-1">
              {total_reserved} reserved
            </span>
          )}
        </div>
      );
    case "low_stock":
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            <span>{total_available} left (Low)</span>
          </span>
          {total_reserved > 0 && (
            <span className="text-[10px] text-[#8C7A78] font-mono pl-1">
              {total_reserved} reserved
            </span>
          )}
        </div>
      );
    case "out_of_stock":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
          <span>Out of stock</span>
        </span>
      );
    case "no_variants":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]" />
          <span>No variants</span>
        </span>
      );
    case "untracked":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#FAF6F2] text-[#8C7A78] border border-[#EBE2D8]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A89895]" />
          <span>Untracked</span>
        </span>
      );
  }
}
