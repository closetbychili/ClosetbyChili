"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import type { RecentOrder } from "@/lib/api/admin";
import { formatINR } from "./DashboardMetricCard";

interface RecentOrdersTableProps {
  orders: RecentOrder[];
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "DELIVERED":
        return "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]";
      case "SHIPPED":
        return "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]";
      case "PROCESSING":
      case "CONFIRMED":
        return "bg-[#FCF2EB] text-[#6D1826] border-[#F3DEC9]";
      case "CANCELLED":
        return "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]";
      case "PENDING":
      default:
        return "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]";
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PAID":
        return "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]";
      case "REFUNDED":
        return "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]";
      case "FAILED":
        return "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]";
      case "PENDING":
      default:
        return "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-serif font-bold text-[#1F1B17]">Recent Orders</h2>
            <p className="text-xs text-[#554243] mt-0.5">
              Latest patron purchases and fulfillment statuses
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-medium text-[#6D1826] hover:text-[#4F0012] flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="py-12 rounded-xl border border-dashed border-[#EBE2D8] bg-[#FAF6F2] flex flex-col items-center justify-center text-center p-6">
            <div className="w-10 h-10 rounded-full bg-white border border-[#EBE2D8] flex items-center justify-center text-[#8C7A78] mb-3">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#1F1B17]">No orders placed yet</h3>
            <p className="text-xs text-[#8C7A78] max-w-xs mt-1">
              Customer orders received through checkout will be listed here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EBE2D8] text-[11px] font-semibold text-[#8C7A78] uppercase tracking-wider">
                  <th className="pb-3 px-3 sm:px-0">Order</th>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">Customer</th>
                  <th className="pb-3 px-3">Payment</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE5] text-xs">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#FAF6F2]/60 transition-colors">
                    <td className="py-3 px-3 sm:px-0">
                      <span className="font-mono font-medium text-[#1F1B17]">
                        {ord.order_number}
                      </span>
                      <span className="block text-[10px] text-[#8C7A78]">
                        {ord.items_count} {ord.items_count === 1 ? "item" : "items"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#554243] whitespace-nowrap">
                      {formatDate(ord.created_at)}
                    </td>
                    <td className="py-3 px-3 text-[#1F1B17] max-w-35 truncate" title={ord.customer_email}>
                      {ord.customer_email}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPaymentStatusBadge(
                          ord.payment_status
                        )}`}
                      >
                        {ord.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getOrderStatusBadge(
                          ord.status
                        )}`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-[#1F1B17] whitespace-nowrap">
                      {formatINR(ord.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
