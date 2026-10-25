"use client";

import { useState } from "react";
import { RefreshCw, RotateCcw, Search, X } from "lucide-react";
import type { CategorySummary } from "@/lib/api/types";

interface AdminInventoryFilterBarProps {
  search: string;
  stockStatus: string;
  category: string;
  ordering: string;
  categories: CategorySummary[];
  isFiltered: boolean;
  refreshing: boolean;
  onSearchChange: (value: string) => void;
  onStockStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onOrderingChange: (value: string) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
}

export default function AdminInventoryFilterBar({
  search,
  stockStatus,
  category,
  ordering,
  categories,
  isFiltered,
  refreshing,
  onSearchChange,
  onStockStatusChange,
  onCategoryChange,
  onOrderingChange,
  onResetFilters,
  onRefresh,
}: AdminInventoryFilterBarProps) {
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
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 min-w-60"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A78]" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search by product name or SKU..."
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

        {/* Filter and Sorting Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stock Status Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <label htmlFor="filter-stock-status" className="sr-only">
              Stock Status
            </label>
            <select
              id="filter-stock-status"
              value={stockStatus}
              onChange={(e) => onStockStatusChange(e.target.value)}
              className="px-2.5 py-2 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#6D1826] transition-all cursor-pointer font-medium"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (&gt; 5)</option>
              <option value="low_stock">Low Stock (1–5)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>

          {/* Category Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <label htmlFor="filter-category" className="sr-only">
              Category
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="px-2.5 py-2 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#6D1826] transition-all cursor-pointer font-medium max-w-35 truncate"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug || cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ordering Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <label htmlFor="sort-ordering" className="sr-only">
              Sort By
            </label>
            <select
              id="sort-ordering"
              value={ordering}
              onChange={(e) => onOrderingChange(e.target.value)}
              className="px-2.5 py-2 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#6D1826] transition-all cursor-pointer font-medium"
            >
              <option value="-updated_at">Recently Updated</option>
              <option value="product">Product Name (A–Z)</option>
              <option value="-product">Product Name (Z–A)</option>
              <option value="sku">SKU (A–Z)</option>
              <option value="-sku">SKU (Z–A)</option>
              <option value="-available">Available (High to Low)</option>
              <option value="available">Available (Low to High)</option>
              <option value="-last_movement">Last Movement (Newest)</option>
              <option value="last_movement">Last Movement (Oldest)</option>
            </select>
          </div>

          {/* Reset Filters button */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-[#6D1826] bg-[#6D1826]/5 hover:bg-[#6D1826]/10 border border-[#6D1826]/20 rounded-lg transition-colors font-medium"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-[#554243] bg-[#FAF6F2] hover:bg-[#FAF6F2]/80 border border-[#EBE2D8] rounded-lg transition-colors font-medium disabled:opacity-50"
            title="Refresh inventory"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#6D1826]" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
