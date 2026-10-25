"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";
import type { AdminOrderListItem } from "@/lib/api/admin";

interface AdminOrdersTableProps {
  orders: AdminOrderListItem[];
  loading: boolean;
  error: string | null;
  ordering: string;
  isFiltered: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
  onSort: (column: string) => void;
}

export default function AdminOrdersTable({
  orders,
  loading,
  error,
  ordering,
  isFiltered,
  onRetry,
  onResetFilters,
  onSort,
}: AdminOrdersTableProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: string | number, currency = "INR") => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return `${currency} ${amount}`;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const renderSortIcon = (field: string) => {
    if (ordering === field) {
      return <ArrowUp className="w-3.5 h-3.5 text-[#6D1826]" />;
    }
    if (ordering === `-${field}`) {
      return <ArrowDown className="w-3.5 h-3.5 text-[#6D1826]" />;
    }
    return (
      <ArrowUpDown className="w-3.5 h-3.5 text-[#8C7A78] opacity-40 group-hover:opacity-100 transition-opacity" />
    );
  };

  const handleSortToggle = (field: string) => {
    if (ordering === `-${field}`) {
      onSort(field);
    } else if (ordering === field) {
      onSort(`-${field}`);
    } else {
      onSort(`-${field}`);
    }
  };

  const renderOrderStatusBadge = (status: string, display: string) => {
    const st = (status || "").toUpperCase();
    let badgeClass = "bg-gray-100 text-gray-700 border-gray-200";
    let dotClass = "bg-gray-500";

    switch (st) {
      case "CONFIRMED":
        badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
        dotClass = "bg-emerald-600";
        break;
      case "PROCESSING":
        badgeClass = "bg-blue-50 text-blue-800 border-blue-200";
        dotClass = "bg-blue-600";
        break;
      case "SHIPPED":
        badgeClass = "bg-purple-50 text-purple-800 border-purple-200";
        dotClass = "bg-purple-600";
        break;
      case "DELIVERED":
        badgeClass = "bg-teal-50 text-teal-800 border-teal-200";
        dotClass = "bg-teal-600";
        break;
      case "PENDING":
        badgeClass = "bg-amber-50 text-amber-800 border-amber-200";
        dotClass = "bg-amber-500";
        break;
      case "CANCELLED":
        badgeClass = "bg-rose-50 text-rose-800 border-rose-200";
        dotClass = "bg-rose-600";
        break;
      case "REFUNDED":
        badgeClass = "bg-zinc-100 text-zinc-700 border-zinc-200";
        dotClass = "bg-zinc-500";
        break;
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${badgeClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
        <span>{display || status}</span>
      </span>
    );
  };

  const renderPaymentStatusBadge = (paymentStatus: string, display: string) => {
    const st = (paymentStatus || "").toUpperCase();
    let badgeClass = "bg-gray-100 text-gray-700 border-gray-200";
    let dotClass = "bg-gray-500";

    switch (st) {
      case "PAID":
        badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
        dotClass = "bg-emerald-600";
        break;
      case "PENDING":
        badgeClass = "bg-amber-50 text-amber-800 border-amber-200";
        dotClass = "bg-amber-500";
        break;
      case "FAILED":
        badgeClass = "bg-rose-50 text-rose-800 border-rose-200";
        dotClass = "bg-rose-600";
        break;
      case "REFUNDED":
        badgeClass = "bg-zinc-100 text-zinc-700 border-zinc-200";
        dotClass = "bg-zinc-500";
        break;
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${badgeClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
        <span>{display || paymentStatus}</span>
      </span>
    );
  };

  // Error State
  if (error && !loading && orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#FECACA] p-8 text-center my-6 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)]">
        <div className="w-12 h-12 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626] mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-serif font-bold text-[#1F1B17] mb-1">
          Failed to Load Orders
        </h3>
        <p className="text-xs text-[#8C7A78] max-w-md mx-auto mb-4">
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#EBE2D8] shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#EBE2D8] bg-[#FAF6F2] text-[#8C7A78] uppercase text-[10px] tracking-wider font-semibold select-none">
              <th scope="col" className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleSortToggle("order_number")}
                  className="group inline-flex items-center gap-1.5 hover:text-[#1F1B17] transition-colors focus:outline-none"
                >
                  <span>Order #</span>
                  {renderSortIcon("order_number")}
                </button>
              </th>

              <th scope="col" className="py-3 px-4">
                <span>Customer</span>
              </th>

              <th scope="col" className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleSortToggle("created_at")}
                  className="group inline-flex items-center gap-1.5 hover:text-[#1F1B17] transition-colors focus:outline-none"
                >
                  <span>Date</span>
                  {renderSortIcon("created_at")}
                </button>
              </th>

              <th scope="col" className="py-3 px-4 text-center">
                <button
                  type="button"
                  onClick={() => handleSortToggle("item_count")}
                  className="group inline-flex items-center justify-center gap-1.5 hover:text-[#1F1B17] transition-colors focus:outline-none"
                >
                  <span>Items</span>
                  {renderSortIcon("item_count")}
                </button>
              </th>

              <th scope="col" className="py-3 px-4 text-right">
                <button
                  type="button"
                  onClick={() => handleSortToggle("total")}
                  className="group inline-flex items-center justify-end gap-1.5 hover:text-[#1F1B17] transition-colors focus:outline-none ml-auto"
                >
                  <span>Total</span>
                  {renderSortIcon("total")}
                </button>
              </th>

              <th scope="col" className="py-3 px-4 text-center">
                <button
                  type="button"
                  onClick={() => handleSortToggle("status")}
                  className="group inline-flex items-center justify-center gap-1.5 hover:text-[#1F1B17] transition-colors focus:outline-none"
                >
                  <span>Order Status</span>
                  {renderSortIcon("status")}
                </button>
              </th>

              <th scope="col" className="py-3 px-4 text-center">
                <button
                  type="button"
                  onClick={() => handleSortToggle("payment_status")}
                  className="group inline-flex items-center justify-center gap-1.5 hover:text-[#1F1B17] transition-colors focus:outline-none"
                >
                  <span>Payment</span>
                  {renderSortIcon("payment_status")}
                </button>
              </th>

              <th scope="col" className="py-3 px-4 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F5EFE9]">
            {loading && orders.length === 0 ? (
              // Loading Skeleton
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-28 mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-16" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-40" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-3.5 bg-gray-200 rounded w-24" />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="h-4 bg-gray-200 rounded w-8 mx-auto" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="h-5 bg-gray-200 rounded-full w-20 mx-auto" />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="h-5 bg-gray-200 rounded-full w-16 mx-auto" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-7 bg-gray-200 rounded w-14 ml-auto" />
                  </td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={8} className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center text-[#8C7A78] mx-auto mb-3">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-serif font-bold text-[#1F1B17] mb-1">
                    No Orders Found
                  </h3>
                  <p className="text-xs text-[#8C7A78] max-w-sm mx-auto mb-4">
                    {isFiltered
                      ? "No customer orders matched your active filters or search query."
                      : "No customer orders have been placed yet."}
                  </p>
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={onResetFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6D1826] bg-[#FAF6F2] hover:bg-[#F3ECE4] rounded-lg border border-[#EBE2D8] transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              // Order Rows
              orders.map((order) => {
                const customerName =
                  order.customer?.display_name?.trim() || "Guest Customer";
                const customerEmail = order.customer?.email || "—";
                const customerPhone = order.customer?.phone || null;

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-[#FAF6F2]/60 transition-colors group"
                  >
                    {/* Order Number */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono font-semibold text-[#1F1B17] hover:text-[#6D1826] transition-colors inline-flex items-center gap-1 group/link"
                      >
                        <span>{order.order_number}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity text-[#8C7A78]" />
                      </Link>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#1F1B17]">
                        {customerName}
                      </div>
                      <div className="text-[11px] text-[#8C7A78] truncate max-w-xs">
                        {customerEmail}
                        {customerPhone && (
                          <span className="ml-1 text-[#A89895]">· {customerPhone}</span>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-[#554243] whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </td>

                    {/* Items */}
                    <td className="py-3.5 px-4 text-center font-medium text-[#1F1B17]">
                      {order.item_count}
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right font-medium text-[#1F1B17] tabular-nums whitespace-nowrap">
                      {formatCurrency(order.total, order.currency)}
                    </td>

                    {/* Order Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {renderOrderStatusBadge(order.status, order.status_display)}
                    </td>

                    {/* Payment Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {renderPaymentStatusBadge(
                        order.payment_status,
                        order.payment_status_display
                      )}
                    </td>

                    {/* Detail Link */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#6D1826] hover:text-white bg-[#FAF6F2] hover:bg-[#6D1826] border border-[#EBE2D8] hover:border-[#6D1826] rounded-md transition-all shadow-xs"
                      >
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
