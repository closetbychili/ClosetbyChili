"use client";

import type { AdminInventorySummary } from "@/lib/api/admin";
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";

interface AdminInventorySummaryCardsProps {
  summary: AdminInventorySummary | null;
  loading: boolean;
  activeStatus?: string;
  onStatusFilterClick?: (status: "in_stock" | "low_stock" | "out_of_stock" | "all") => void;
}

export default function AdminInventorySummaryCards({
  summary,
  loading,
  activeStatus,
  onStatusFilterClick,
}: AdminInventorySummaryCardsProps) {
  const cards = [
    {
      title: "Active Variants",
      value: summary?.active_variants_tracked ?? 0,
      subtitle: "Tracked in ledger",
      icon: Layers,
      color: "text-[#6D1826]",
      bg: "bg-[#FAF6F2]",
      border: "border-[#EBE2D8]",
      filterStatus: "all" as const,
    },
    {
      title: "On-Hand Units",
      value: summary?.total_on_hand ?? 0,
      subtitle: "Physical atelier stock",
      icon: Boxes,
      color: "text-[#1F1B17]",
      bg: "bg-[#FAF6F2]",
      border: "border-[#EBE2D8]",
    },
    {
      title: "Available Units",
      value: summary?.total_available ?? 0,
      subtitle: "Sellable to patrons",
      icon: CheckCircle2,
      color: "text-[#059669]",
      bg: "bg-[#ECFDF5]",
      border: "border-[#A7F3D0]",
      filterStatus: "in_stock" as const,
    },
    {
      title: "Reserved Units",
      value: summary?.total_reserved ?? 0,
      subtitle: "Held for active orders",
      icon: Clock,
      color: "text-[#D97706]",
      bg: "bg-[#FFFBEB]",
      border: "border-[#FDE68A]",
    },
    {
      title: "Low Stock",
      value: summary?.low_stock_variants ?? 0,
      subtitle: `≤ ${summary?.low_stock_threshold ?? 5} units available`,
      icon: AlertTriangle,
      color: "text-[#D97706]",
      bg: "bg-[#FFFBEB]",
      border: "border-[#FDE68A]",
      filterStatus: "low_stock" as const,
      badge:
        summary?.unacknowledged_alerts && summary.unacknowledged_alerts > 0
          ? `${summary.unacknowledged_alerts} unacknowledged`
          : undefined,
    },
    {
      title: "Out of Stock",
      value: summary?.out_of_stock_variants ?? 0,
      subtitle: "0 available units",
      icon: AlertCircle,
      color: "text-[#DC2626]",
      bg: "bg-[#FEF2F2]",
      border: "border-[#FECACA]",
      filterStatus: "out_of_stock" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isClickable = Boolean(card.filterStatus && onStatusFilterClick);
        const isActive =
          card.filterStatus &&
          (activeStatus === card.filterStatus ||
            (card.filterStatus === "all" && (!activeStatus || activeStatus === "all")));

        return (
          <div
            key={idx}
            onClick={() => {
              if (isClickable && card.filterStatus) {
                onStatusFilterClick?.(card.filterStatus);
              }
            }}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (isClickable && card.filterStatus && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onStatusFilterClick?.(card.filterStatus);
              }
            }}
            className={`bg-white rounded-xl border p-4 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] hover:shadow-[0_4px_16px_-2px_rgba(79,0,18,0.06)] transition-all flex flex-col justify-between ${
              isActive
                ? "border-[#4F0012] ring-2 ring-[#4F0012]/10"
                : "border-[#EBE2D8]"
            } ${isClickable ? "cursor-pointer hover:border-[#4F0012]/40" : ""}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-[#8C7A78] uppercase tracking-wider truncate">
                {card.title}
              </span>
              <div
                className={`w-7 h-7 rounded-md ${card.bg} border ${card.border} flex items-center justify-center ${card.color} shrink-0`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              {loading ? (
                <div className="h-7 w-14 bg-[#FAF6F2] animate-pulse rounded my-1" />
              ) : (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <div
                    className="text-xl sm:text-2xl font-serif font-bold text-[#1F1B17] tracking-tight"
                    data-testid={`metric-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {card.value.toLocaleString("en-IN")}
                  </div>
                  {card.badge && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                      {card.badge}
                    </span>
                  )}
                </div>
              )}
              <div className="text-[10px] text-[#8C7A78] mt-0.5 truncate">
                {card.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
