"use client";

import { useState } from "react";
import { ArrowUpDown, Filter, RotateCcw, Search, X } from "lucide-react";
import type { CategorySummary, CollectionSummary } from "@/lib/api/types";

interface AdminProductsFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  collection: string;
  onCollectionChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  ordering: string;
  onOrderingChange: (value: string) => void;
  categories: CategorySummary[];
  collections: CollectionSummary[];
  onReset: () => void;
  isFiltered: boolean;
}

export default function AdminProductsFilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  collection,
  onCollectionChange,
  status,
  onStatusChange,
  ordering,
  onOrderingChange,
  categories,
  collections,
  onReset,
  isFiltered,
}: AdminProductsFilterBarProps) {
  const [prevSearch, setPrevSearch] = useState(search);
  const [searchInput, setSearchInput] = useState(search);

  if (search !== prevSearch) {
    setPrevSearch(search);
    setSearchInput(search);
  }

  // Handle immediate form submission on enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    onSearchChange("");
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] mb-6 flex flex-col gap-4">
      {/* Top Row: Search and Ordering */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-[#8C7A78] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onBlur={() => {
              if (searchInput !== search) {
                onSearchChange(searchInput.trim());
              }
            }}
            placeholder="Search silhouettes by name, SKU, slug..."
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-[#EBE2D8] bg-[#FAF6F2]/50 text-xs text-[#1F1B17] placeholder-[#8C7A78] focus:outline-none focus:ring-1 focus:ring-[#4F0012] focus:border-[#4F0012] transition-colors"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A78] hover:text-[#1F1B17] p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Ordering Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="admin-products-ordering" className="text-xs text-[#8C7A78] flex items-center gap-1 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sort:</span>
          </label>
          <select
            id="admin-products-ordering"
            value={ordering}
            onChange={(e) => onOrderingChange(e.target.value)}
            className="py-2 px-3 rounded-xl border border-[#EBE2D8] bg-[#FAF6F2]/50 text-xs text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#4F0012] focus:border-[#4F0012] transition-colors cursor-pointer"
          >
            <option value="-updated_at">Last Updated (Newest)</option>
            <option value="updated_at">Last Updated (Oldest)</option>
            <option value="-created_at">Date Created (Newest)</option>
            <option value="created_at">Date Created (Oldest)</option>
            <option value="name">Name (A–Z)</option>
            <option value="-name">Name (Z–A)</option>
            <option value="status">Publication Status</option>
          </select>
        </div>
      </div>

      {/* Bottom Row: Filters (Category, Collection, Status) and Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F2ECE5]">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-[#8C7A78] mr-1">
            <Filter className="w-3.5 h-3.5 text-[#4F0012]" />
            <span className="font-medium text-[#1F1B17]">Filters:</span>
          </div>

          {/* Publication Status Filter */}
          <select
            aria-label="Filter by Status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-[#EBE2D8] bg-white text-xs text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#4F0012] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active (Published)</option>
            <option value="draft">Draft (Unpublished)</option>
            <option value="archived">Archived</option>
          </select>

          {/* Category Filter */}
          <select
            aria-label="Filter by Category"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-[#EBE2D8] bg-white text-xs text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#4F0012] cursor-pointer max-w-[160px] truncate"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Collection Filter */}
          <select
            aria-label="Filter by Collection"
            value={collection}
            onChange={(e) => onCollectionChange(e.target.value)}
            className="py-1.5 px-3 rounded-lg border border-[#EBE2D8] bg-white text-xs text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#4F0012] cursor-pointer max-w-[160px] truncate"
          >
            <option value="all">All Collections</option>
            {collections.map((col) => (
              <option key={col.id} value={col.slug}>
                {col.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filters Action */}
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#6D1826] hover:bg-[#FAF6F2] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
