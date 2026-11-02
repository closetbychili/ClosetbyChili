"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  CreditCard,
  HelpCircle,
  Package,
  ShoppingBag,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import type { AnalyticsKpiSummary } from "@/lib/api/admin";
import { formatINR } from "@/components/admin/dashboard/DashboardMetricCard";

interface AnalyticsKpiCardsProps {
  kpis: AnalyticsKpiSummary;
}

export default function AnalyticsKpiCards({ kpis }: AnalyticsKpiCardsProps) {
  const cards = [
    {
      id: "gross_sales",
      title: "Gross Sales",
      value: formatINR(kpis.gross_sales.value),
      delta: kpis.gross_sales.change_percentage,
      definition: kpis.gross_sales.definition,
      icon: Coins,
      sublabel: "Catalog merchandise before deductions",
    },
    {
      id: "net_revenue",
      title: "Net Revenue",
      value: formatINR(kpis.net_revenue.value),
      delta: kpis.net_revenue.change_percentage,
      definition: kpis.net_revenue.definition,
      icon: CreditCard,
      sublabel: "Realized cashflow (excl. returns)",
      highlight: true,
    },
    {
      id: "total_orders",
      title: "Total Orders",
      value: Number(kpis.total_orders.value).toLocaleString("en-IN"),
      delta: kpis.total_orders.change_percentage,
      definition: kpis.total_orders.definition,
      icon: ShoppingBag,
      sublabel: `${kpis.total_orders.paid_orders_count ?? 0} paid & fulfilled orders`,
    },
    {
      id: "average_order_value",
      title: "Average Order Value",
      value: formatINR(kpis.average_order_value.value),
      delta: kpis.average_order_value.change_percentage,
      definition: kpis.average_order_value.definition,
      icon: TrendingUp,
      sublabel: "Net revenue per paid transaction",
    },
    {
      id: "units_sold",
      title: "Units Sold",
      value: Number(kpis.units_sold.value).toLocaleString("en-IN"),
      delta: kpis.units_sold.change_percentage,
      definition: kpis.units_sold.definition,
      icon: Package,
      sublabel:
        kpis.units_sold.gross_units !== undefined
          ? `${kpis.units_sold.gross_units} gross • ${kpis.units_sold.refunded_units ?? 0} refunded`
          : "Net physical garments retained",
    },
    {
      id: "new_customers",
      title: "New Customers",
      value: Number(kpis.new_customers.value).toLocaleString("en-IN"),
      delta: kpis.new_customers.change_percentage,
      definition: kpis.new_customers.definition,
      icon: UserPlus,
      sublabel: `${kpis.new_customers.total_registered_customers ?? 0} total registered patrons`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {cards.map((c) => {
        const Icon = c.icon;
        const hasDelta = c.delta !== null && c.delta !== undefined;
        const isPositive = (c.delta ?? 0) >= 0;

        return (
          <div
            key={c.id}
            className={`rounded-2xl border p-5 sm:p-6 transition-all flex flex-col justify-between ${
              c.highlight
                ? "bg-gradient-to-br from-[#FCF7F2] to-white border-[#E8D4C0] shadow-[0_4px_24px_-4px_rgba(109,24,38,0.06)]"
                : "bg-white border-[#EBE2D8] shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(79,0,18,0.06)]"
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#8C7A78] uppercase tracking-wider">
                    {c.title}
                  </span>
                  {c.definition && (
                    <div className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-[#B3A19E] hover:text-[#6D1826] cursor-help" />
                      <div className="hidden group-hover:block absolute left-0 bottom-full mb-1.5 z-20 w-56 p-2 bg-[#1F1B17] text-white text-[11px] rounded-lg shadow-lg pointer-events-none">
                        {c.definition}
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                    c.highlight
                      ? "bg-[#6D1826] text-white border-[#6D1826]"
                      : "bg-[#FAF6F2] text-[#6D1826] border-[#EBE2D8]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {/* Metric Value & Delta */}
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1B17] tracking-tight">
                  {c.value}
                </span>

                {hasDelta && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      isPositive
                        ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                        : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {Math.abs(c.delta!)}%
                  </span>
                )}
              </div>
            </div>

            {/* Sublabel / Footnote */}
            <div className="mt-4 pt-3 border-t border-[#F2ECE5] text-[11px] text-[#8C7A78] flex items-center justify-between">
              <span>{c.sublabel}</span>
              {hasDelta && (
                <span className="text-[10px] text-[#B3A19E]">vs prior period</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

