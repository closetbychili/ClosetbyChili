"use client";

import React from "react";
import { Search, X, RotateCcw } from "lucide-react";

interface AdminCouponsFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  lifecycle: string;
  onLifecycleChange: (value: string) => void;
  discountType: string;
  onDiscountTypeChange: (value: string) => void;
  targetingMode?: string;
  onTargetingModeChange?: (value: string) => void;
  isActive: string;
  onIsActiveChange: (value: string) => void;
  ordering: string;
  onOrderingChange: (value: string) => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export default function AdminCouponsFilterBar({
  search,
  onSearchChange,
  lifecycle,
  onLifecycleChange,
  discountType,
  onDiscountTypeChange,
  targetingMode = "all",
  onTargetingModeChange,
  isActive,
  onIsActiveChange,
  ordering,
  onOrderingChange,
  onResetFilters,
  isFiltered,
}: AdminCouponsFilterBarProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm mb-6 space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by coupon code or campaign name..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Lifecycle filter */}
          <select
            value={lifecycle}
            onChange={(e) => onLifecycleChange(e.target.value)}
            aria-label="Filter by lifecycle status"
            className="text-xs font-medium py-2 px-3 border border-stone-300 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900"
          >
            <option value="all">All Lifecycles</option>
            <option value="currently_valid">Currently Valid</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Discount type filter */}
          <select
            value={discountType}
            onChange={(e) => onDiscountTypeChange(e.target.value)}
            aria-label="Filter by discount type"
            className="text-xs font-medium py-2 px-3 border border-stone-300 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900"
          >
            <option value="all">All Types</option>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
          </select>

          {/* Targeting Mode filter */}
          {onTargetingModeChange && (
            <select
              value={targetingMode}
              onChange={(e) => onTargetingModeChange(e.target.value)}
              aria-label="Filter by targeting mode"
              className="text-xs font-medium py-2 px-3 border border-stone-300 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900"
            >
              <option value="all">All Targeting</option>
              <option value="ALL_PRODUCTS">All Products</option>
              <option value="SPECIFIC_PRODUCTS">Specific Products</option>
              <option value="SPECIFIC_CATEGORIES">Specific Categories</option>
              <option value="SPECIFIC_COLLECTIONS">Specific Collections</option>
              <option value="PRODUCTS_AND_CATEGORIES">Products & Categories</option>
              <option value="PRODUCTS_AND_COLLECTIONS">Products & Collections</option>
              <option value="CATEGORIES_AND_COLLECTIONS">Categories & Collections</option>
              <option value="MIXED">Mixed Targets</option>
            </select>
          )}

          {/* Active status filter */}
          <select
            value={isActive}
            onChange={(e) => onIsActiveChange(e.target.value)}
            aria-label="Filter by activation state"
            className="text-xs font-medium py-2 px-3 border border-stone-300 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900"
          >
            <option value="all">All States</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          {/* Ordering sort */}
          <select
            value={ordering}
            onChange={(e) => onOrderingChange(e.target.value)}
            aria-label="Sort coupons"
            className="text-xs font-medium py-2 px-3 border border-stone-300 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900"
          >
            <option value="-created_at">Created (Newest)</option>
            <option value="created_at">Created (Oldest)</option>
            <option value="code">Code (A-Z)</option>
            <option value="-code">Code (Z-A)</option>
            <option value="-discount_value">Discount (High-Low)</option>
            <option value="discount_value">Discount (Low-High)</option>
            <option value="-start_date">Start Date (Latest)</option>
            <option value="start_date">Start Date (Earliest)</option>
          </select>

          {/* Reset Filters button */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-3 text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
