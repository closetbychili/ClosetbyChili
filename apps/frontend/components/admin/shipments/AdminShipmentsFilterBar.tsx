"use client";

import { useState } from "react";
import { RefreshCw, RotateCcw, Search, X } from "lucide-react";

interface AdminShipmentsFilterBarProps {
  search: string;
  status: string;
  carrier: string;
  createdAfter: string;
  createdBefore: string;
  ordering: string;
  isFiltered: boolean;
  refreshing: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCarrierChange: (value: string) => void;
  onDateRangeChange: (createdAfter: string, createdBefore: string) => void;
  onOrderingChange: (value: string) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
}

const STATUS_CHOICES = [
  { value: "all", label: "All Statuses" },
  { value: "READY_TO_SHIP", label: "Ready to Ship" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Delivery Failed" },
  { value: "RETURNED", label: "Returned" },
  { value: "PENDING", label: "Pending" },
];

const CARRIER_CHOICES = [
  { value: "all", label: "All Carriers" },
  { value: "BlueDart", label: "BlueDart" },
  { value: "Delhivery", label: "Delhivery" },
  { value: "DTDC", label: "DTDC" },
  { value: "India Post", label: "India Post" },
  { value: "Shadowfax", label: "Shadowfax" },
];

const ORDERING_CHOICES = [
  { value: "-created_at", label: "Newest Shipments" },
  { value: "created_at", label: "Oldest Shipments" },
  { value: "-dispatched_at", label: "Recently Dispatched" },
  { value: "-delivered_at", label: "Recently Delivered" },
  { value: "-order__order_number", label: "Order # (Desc)" },
  { value: "order__order_number", label: "Order # (Asc)" },
];

export default function AdminShipmentsFilterBar({
  search,
  status,
  carrier,
  createdAfter,
  createdBefore,
  ordering,
  isFiltered,
  refreshing,
  onSearchChange,
  onStatusChange,
  onCarrierChange,
  onDateRangeChange,
  onOrderingChange,
  onResetFilters,
  onRefresh,
}: AdminShipmentsFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [prevSearch, setPrevSearch] = useState(search);

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
    <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 mb-6 shadow-sm space-y-3">
      {/* Top Row: Search and Action Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[280px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A78]" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search by order #, tracking #, carrier, patron email..."
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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#554243] bg-[#FAF6F2] hover:bg-[#F3ECE4] rounded-lg border border-[#EBE2D8] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Dropdown Filters & Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#F5EFE9]">
        {/* Status Filter */}
        <div>
          <label className="block text-[10px] uppercase font-semibold tracking-wider text-[#8C7A78] mb-1">
            Shipment Status
          </label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full text-xs py-1.5 px-2.5 bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6D1826] text-[#1F1B17]"
          >
            {STATUS_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </div>

        {/* Carrier Filter */}
        <div>
          <label className="block text-[10px] uppercase font-semibold tracking-wider text-[#8C7A78] mb-1">
            Carrier
          </label>
          <select
            value={carrier}
            onChange={(e) => onCarrierChange(e.target.value)}
            className="w-full text-xs py-1.5 px-2.5 bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6D1826] text-[#1F1B17]"
          >
            {CARRIER_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-[10px] uppercase font-semibold tracking-wider text-[#8C7A78] mb-1">
            Created Date Range
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={createdAfter}
              onChange={(e) => onDateRangeChange(e.target.value, createdBefore)}
              className="w-1/2 text-xs py-1.5 px-2 bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6D1826] text-[#1F1B17]"
              title="From date"
            />
            <span className="text-xs text-[#8C7A78]">—</span>
            <input
              type="date"
              value={createdBefore}
              onChange={(e) => onDateRangeChange(createdAfter, e.target.value)}
              className="w-1/2 text-xs py-1.5 px-2 bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6D1826] text-[#1F1B17]"
              title="To date"
            />
          </div>
        </div>

        {/* Sort Ordering */}
        <div>
          <label className="block text-[10px] uppercase font-semibold tracking-wider text-[#8C7A78] mb-1">
            Sort By
          </label>
          <select
            value={ordering}
            onChange={(e) => onOrderingChange(e.target.value)}
            className="w-full text-xs py-1.5 px-2.5 bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6D1826] text-[#1F1B17]"
          >
            {ORDERING_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
