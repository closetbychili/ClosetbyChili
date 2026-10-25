"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, HelpCircle } from "lucide-react";
import type { MetricCardData } from "@/lib/api/admin";

interface DashboardMetricCardProps {
  title: string;
  metric: MetricCardData<number | string>;
  icon: LucideIcon;
  isCurrency?: boolean;
  thresholdLabel?: string;
  emptyLabel?: string;
}

export function formatINR(amount: number | string): string {
  const numeric = typeof amount === "number" ? amount : parseFloat(amount || "0");
  if (isNaN(numeric)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export default function DashboardMetricCard({
  title,
  metric,
  icon: Icon,
  isCurrency = false,
  thresholdLabel,
}: DashboardMetricCardProps) {
  const rawValue = metric.value;
  const displayValue = isCurrency ? formatINR(rawValue) : rawValue;
  const hasChange = metric.change_percentage !== null && metric.change_percentage !== undefined;
  const isPositive = (metric.change_percentage ?? 0) >= 0;

  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(79,0,18,0.06)] transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-[#8C7A78] uppercase tracking-wider">
            {title}
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center text-[#6D1826]">
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1B17] tracking-tight">
            {displayValue}
          </span>

          {hasChange && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                isPositive
                  ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                  : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {Math.abs(metric.change_percentage!)}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#F2ECE5] flex items-center justify-between text-[11px] text-[#8C7A78]">
        {thresholdLabel ? (
          <span className="font-medium text-[#6D1826]">{thresholdLabel}</span>
        ) : metric.definition ? (
          <span className="truncate max-w-60 flex items-center gap-1" title={metric.definition}>
            <HelpCircle className="w-3 h-3 text-[#A89895] shrink-0" />
            <span className="truncate">{metric.definition}</span>
          </span>
        ) : (
          <span>Verified store ledger</span>
        )}

        {hasChange && metric.previous_value !== undefined && metric.previous_value !== null && (
          <span className="shrink-0 text-[#A89895]">
            vs prev ({isCurrency ? formatINR(metric.previous_value) : metric.previous_value})
          </span>
        )}
      </div>
    </div>
  );
}
