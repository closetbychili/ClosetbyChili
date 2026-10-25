"use client";

import { useState } from "react";
import { Calendar, RefreshCw, RotateCcw, Search, X } from "lucide-react";

interface AdminOrdersFilterBarProps {
  search: string;
  status: string;
  paymentStatus: string;
  createdAfter: string;
  createdBefore: string;
  ordering: string;
  isFiltered: boolean;
  refreshing: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPaymentStatusChange: (value: string) => void;
  onDateRangeChange: (createdAfter: string, createdBefore: string) => void;
  onOrderingChange: (value: string) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
}

export default function AdminOrdersFilterBar({
  search,
  status,
  paymentStatus,
  createdAfter,
  createdBefore,
  ordering,
  isFiltered,
  refreshing,
  onSearchChange,
  onStatusChange,
  onPaymentStatusChange,
  onDateRangeChange,
  onOrderingChange,
  onResetFilters,
  onRefresh,
}: AdminOrdersFilterBarProps) {
  const [prevSearch, setPrevSearch] = useState(search);
  const [localSearch, setLocalSearch] = useState(search);

  if (search !== prevSearch) {
    setPrevSearch(search);
    setLocalSearch(search);
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    onSearchChange("");
  };

  return (
    <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 mb-6 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] flex flex-col gap-3">
      {/* Top row: Search input and action buttons */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 min-w-64"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A78]" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search by order #, customer name, email, or shipping address..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6D1826] focus:border-[#6D1826] transition-all text-[#1F1B17] placeholder:text-[#8C7A78]"
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7A78] hover:text-[#1F1B17]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* Action Controls: Refresh & Reset */}
        <div className="flex items-center gap-2 shrink-0">
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#6D1826] bg-[#FAF6F2] hover:bg-[#F3ECE4] rounded-lg border border-[#EBE2D8] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh orders"
            className="inline-flex items-center justify-center p-2 text-[#554243] hover:text-[#1F1B17] bg-[#FAF6F2] hover:bg-[#F3ECE4] rounded-lg border border-[#EBE2D8] transition-colors disabled:opacity-50"
            title="Refresh order records"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin text-[#6D1826]" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Bottom row: Filter selectors and date range */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#F5EFE9]">
        {/* Order Status Selector */}
        <div className="flex items-center gap-1.5 text-xs">
          <label htmlFor="filter-order-status" className="text-[#8C7A78] font-medium sr-only sm:not-sr-only">
            Status:
          </label>
          <select
            id="filter-order-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#6D1826] transition-all cursor-pointer font-medium"
          >
            <option value="all">All Order Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        {/* Payment Status Selector */}
        <div className="flex items-center gap-1.5 text-xs">
          <label htmlFor="filter-payment-status" className="text-[#8C7A78] font-medium sr-only sm:not-sr-only">
            Payment:
          </label>
          <select
            id="filter-payment-status"
            value={paymentStatus}
            onChange={(e) => onPaymentStatusChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#6D1826] transition-all cursor-pointer font-medium"
          >
            <option value="all">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending Payment</option>
            <option value="FAILED">Payment Failed</option>
            <option value="REFUNDED">Payment Refunded</option>
          </select>
        </div>

        {/* Date Range: From */}
        <div className="flex items-center gap-1.5 text-xs">
          <label htmlFor="filter-date-from" className="text-[#8C7A78] font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="sr-only sm:not-sr-only">From:</span>
          </label>
          <input
            id="filter-date-from"
            type="date"
            value={createdAfter}
            onChange={(e) => onDateRangeChange(e.target.value, createdBefore)}
            className="px-2.5 py-1.5 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#6D1826] transition-all cursor-pointer font-medium"
          />
        </div>

        {/* Date Range: To */}
        <div className="flex items-center gap-1.5 text-xs">
          <label htmlFor="filter-date-to" className="text-[#8C7A78] font-medium">
            To:
          </label>
          <input
            id="filter-date-to"
            type="date"
            value={createdBefore}
            onChange={(e) => onDateRangeChange(createdAfter, e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#6D1826] transition-all cursor-pointer font-medium"
          />
        </div>

        {/* Ordering Selector */}
        <div className="flex items-center gap-1.5 text-xs ml-auto">
          <label htmlFor="sort-orders" className="text-[#8C7A78] font-medium sr-only sm:not-sr-only">
            Sort:
          </label>
          <select
            id="sort-orders"
            value={ordering}
            onChange={(e) => onOrderingChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#6D1826] transition-all cursor-pointer font-medium"
          >
            <option value="-created_at">Date: Newest First</option>
            <option value="created_at">Date: Oldest First</option>
            <option value="-total">Total: High to Low</option>
            <option value="total">Total: Low to High</option>
            <option value="-item_count">Items: High to Low</option>
            <option value="item_count">Items: Low to High</option>
            <option value="order_number">Order Number: A-Z</option>
            <option value="-order_number">Order Number: Z-A</option>
          </select>
        </div>
      </div>
    </div>
  );
}
