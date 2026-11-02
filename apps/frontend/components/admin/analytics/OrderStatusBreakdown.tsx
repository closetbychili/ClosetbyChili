"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  RotateCcw,
  ShieldAlert,
  Truck,
  XCircle,
} from "lucide-react";
import type { OrderAnalyticsData } from "@/lib/api/admin";
import { formatINR } from "@/components/admin/dashboard/DashboardMetricCard";

interface OrderStatusBreakdownProps {
  data: OrderAnalyticsData;
}

export default function OrderStatusBreakdown({ data }: OrderStatusBreakdownProps) {
  const total = data.total_orders;

  const statusConfigs: Array<{
    key: string;
    label: string;
    color: string;
    icon: any;
  }> = [
    { key: "DELIVERED", label: "Delivered", color: "#059669", icon: CheckCircle2 },
    { key: "SHIPPED", label: "Shipped", color: "#0284C7", icon: Truck },
    { key: "PROCESSING", label: "Processing", color: "#C49A45", icon: Package },
    { key: "CONFIRMED", label: "Confirmed", color: "#6D1826", icon: CheckCircle2 },
    { key: "PENDING", label: "Pending", color: "#EAB308", icon: Clock },
    { key: "CANCELLED", label: "Cancelled", color: "#DC2626", icon: XCircle },
  ];

  const paymentRatio = total > 0 ? (data.paid_orders / total) * 100 : 0;
  const unpaidRatio = total > 0 ? (data.unpaid_orders / total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 1. Fulfillment Status Distribution */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-serif font-bold text-[#1F1B17]">
                Order Status & Fulfillment
              </h3>
              <p className="text-xs text-[#554243]">
                Distribution of order volume across the fulfillment pipeline
              </p>
            </div>
            <span className="text-xs font-semibold text-[#6D1826] bg-[#FAF6F2] px-2.5 py-1 rounded-lg border border-[#EBE2D8]">
              {total} Total Orders
            </span>
          </div>

          {/* Progress Stack */}
          {total > 0 && (
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#FAF6F2] mb-5 border border-[#EBE2D8]">
              {statusConfigs.map((s) => {
                const count = data.status_breakdown[s.key] || 0;
                if (count === 0) return null;
                const pct = (count / total) * 100;
                return (
                  <div
                    key={s.key}
                    style={{ width: `${pct}%`, backgroundColor: s.color }}
                    title={`${s.label}: ${count} (${pct.toFixed(1)}%)`}
                    className="h-full transition-all"
                  />
                );
              })}
            </div>
          )}

          {/* Status Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statusConfigs.map((s) => {
              const count = data.status_breakdown[s.key] || 0;
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
              const Icon = s.icon;
              return (
                <div
                  key={s.key}
                  className="p-3 rounded-xl bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <div>
                      <span className="text-xs font-medium text-[#1F1B17] block">
                        {s.label}
                      </span>
                      <span className="text-[10px] text-[#8C7A78]">{pct}% share</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold font-serif text-[#1F1B17]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-[#F2ECE5] flex items-center justify-between text-[11px] text-[#8C7A78]">
          <span>Authoritative PostgreSQL status tracking</span>
          <span className="text-[#6D1826] font-medium">Real-time DB sync</span>
        </div>
      </div>

      {/* 2. Paid vs Unpaid & Returns Insights */}
      <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-serif font-bold text-[#1F1B17] mb-1">
            Payment & Attrition Insights
          </h3>
          <p className="text-xs text-[#554243] mb-4">
            Payment realization and return rate telemetry
          </p>

          {/* Paid vs Unpaid Visual Bar */}
          <div className="p-3.5 rounded-xl bg-[#FAF6F2] border border-[#EBE2D8] mb-4">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-[#059669]">
                Paid: {data.paid_orders} ({paymentRatio.toFixed(0)}%)
              </span>
              <span className="font-semibold text-[#D97706]">
                Unpaid: {data.unpaid_orders} ({unpaidRatio.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EBE2D8] overflow-hidden flex">
              <div
                style={{ width: `${paymentRatio}%` }}
                className="bg-[#059669] h-full"
              />
              <div
                style={{ width: `${unpaidRatio}%` }}
                className="bg-[#D97706] h-full"
              />
            </div>
          </div>

          {/* Cancelled & Refunded Metrics */}
          <div className="space-y-3">
            {/* Cancelled */}
            <div className="p-3 rounded-xl bg-white border border-[#EBE2D8] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626]">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#1F1B17] block">
                    Cancelled Orders
                  </span>
                  <span className="text-[10px] text-[#8C7A78]">
                    Rate: {data.cancelled_orders.rate_pct}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-[#DC2626] block font-serif">
                  {data.cancelled_orders.count}
                </span>
                <span className="text-[10px] text-[#8C7A78]">
                  {formatINR(data.cancelled_orders.total_value)}
                </span>
              </div>
            </div>

            {/* Refunded */}
            <div className="p-3 rounded-xl bg-white border border-[#EBE2D8] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#1F1B17] block">
                    Refunded Orders
                  </span>
                  <span className="text-[10px] text-[#8C7A78]">
                    Rate: {data.refunded_orders.rate_pct}%
                    {data.refunded_orders.refunded_units !== undefined &&
                      ` • ${data.refunded_orders.refunded_units} units`}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-[#D97706] block font-serif">
                  {data.refunded_orders.count}
                </span>
                <span className="text-[10px] text-[#8C7A78]">
                  {formatINR(data.refunded_orders.total_value)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#F2ECE5] text-[11px] text-[#8C7A78] flex items-center justify-between">
          <span>Non-realized revenues excluded from Net Revenue</span>
          <span className="text-[10px] text-[#A89895]">Full order reversals</span>
        </div>
      </div>
    </div>
  );
}

