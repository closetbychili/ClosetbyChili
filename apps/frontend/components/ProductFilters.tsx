"use client";

import { useTransition, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import type { CategorySummary, CollectionSummary } from "@/lib/api/types";

interface ProductFiltersProps {
  categories: CategorySummary[];
  collections: CollectionSummary[];
  totalCount: number;
}

const SORT_OPTIONS = [
  { label: "Newest Arrivals", value: "-created_at" },
  { label: "Name: A to Z", value: "name" },
  { label: "Name: Z to A", value: "-name" },
  { label: "Oldest", value: "created_at" },
];

export default function ProductFilters({
  categories,
  collections,
  totalCount,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentCategory = searchParams.get("category") || "";
  const currentCollection = searchParams.get("collection") || "";
  const currentSearch = searchParams.get("search") || "";
  const currentOrdering = searchParams.get("ordering") || "-created_at";

  const [prevSearch, setPrevSearch] = useState(currentSearch);
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Synchronize search input if URL changes externally (e.g. back/forward navigation)
  if (prevSearch !== currentSearch) {
    setPrevSearch(currentSearch);
    setSearchInput(currentSearch);
  }

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Reset pagination to page 1 whenever filters change
    params.delete("page");

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput.trim() || null });
  };

  const clearAllFilters = () => {
    setSearchInput("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(
    currentCategory || currentCollection || currentSearch || (currentOrdering && currentOrdering !== "-created_at")
  );

  return (
    <div className="w-full mb-8 lg:mb-10">
      {/* ── Search Bar & Filter Controls Row ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#111111]/8">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search kurtis, sets, anarkalis..."
            className="w-full bg-white border border-[#111111]/15 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-chili transition-colors"
          />
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                updateFilters({ search: null });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
            >
              <X size={15} />
            </button>
          )}
        </form>

        {/* Right Controls: Sort & Mobile Filter Toggle */}
        <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4">
          {/* Results Count */}
          <span className="text-xs text-ink/50 uppercase tracking-[0.15em] font-medium hidden sm:inline-block">
            {totalCount} {totalCount === 1 ? "Product" : "Products"}
          </span>

          {/* Sort Dropdown */}
          <div className="relative inline-flex items-center">
            <ArrowUpDown size={14} className="absolute left-3 text-ink/40 pointer-events-none" />
            <select
              value={currentOrdering}
              onChange={(e) => updateFilters({ ordering: e.target.value })}
              className="appearance-none bg-white border border-[#111111]/15 pl-8 pr-8 py-2.5 text-xs text-ink font-medium tracking-wide focus:outline-none focus:border-chili cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="md:hidden inline-flex items-center gap-2 border border-[#111111]/15 bg-white px-3.5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink"
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
        </div>
      </div>

      {/* ── Desktop Category & Collection Filter Bar ───────── */}
      <div className="hidden md:flex flex-wrap items-center gap-2 pt-5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/50 mr-2">
          Category:
        </span>
        <button
          type="button"
          onClick={() => updateFilters({ category: null })}
          className={`px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.12em] transition-all ${
            !currentCategory
              ? "bg-ink text-[#fff8f7]"
              : "bg-white border border-[#111111]/12 text-ink/75 hover:border-ink hover:text-ink"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() =>
              updateFilters({
                category: currentCategory === cat.slug ? null : cat.slug,
              })
            }
            className={`px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.12em] transition-all ${
              currentCategory === cat.slug
                ? "bg-ink text-[#fff8f7]"
                : "bg-white border border-[#111111]/12 text-ink/75 hover:border-ink hover:text-ink"
            }`}
          >
            {cat.name}
          </button>
        ))}

        {/* Collection Pills if any exist */}
        {collections.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 ml-4 pl-4 border-l border-[#111111]/10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/50 mr-2">
              Collection:
            </span>
            {collections.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() =>
                  updateFilters({
                    collection: currentCollection === col.slug ? null : col.slug,
                  })
                }
                className={`px-3 py-1.5 text-xs font-medium tracking-wide transition-all ${
                  currentCollection === col.slug
                    ? "bg-chili text-white font-semibold"
                    : "bg-white/80 border border-chili/20 text-chili/80 hover:border-chili hover:text-chili"
                }`}
              >
                {col.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Active Filter Tags Row ──────────────────────────── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink/40">
            Active Filters:
          </span>
          {currentSearch && (
            <span className="inline-flex items-center gap-1.5 bg-[#f5e8e5] text-ink text-xs px-2.5 py-1 rounded-xs">
              Search: &ldquo;{currentSearch}&rdquo;
              <button
                type="button"
                onClick={() => updateFilters({ search: null })}
                className="hover:text-chili"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {currentCategory && (
            <span className="inline-flex items-center gap-1.5 bg-[#f5e8e5] text-ink text-xs px-2.5 py-1 rounded-xs">
              Category: {categories.find((c) => c.slug === currentCategory)?.name || currentCategory}
              <button
                type="button"
                onClick={() => updateFilters({ category: null })}
                className="hover:text-chili"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {currentCollection && (
            <span className="inline-flex items-center gap-1.5 bg-[#f5e8e5] text-ink text-xs px-2.5 py-1 rounded-xs">
              Collection: {collections.find((c) => c.slug === currentCollection)?.name || currentCollection}
              <button
                type="button"
                onClick={() => updateFilters({ collection: null })}
                className="hover:text-chili"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[11px] uppercase tracking-[0.15em] text-chili font-semibold hover:underline ml-2"
          >
            Clear All
          </button>
        </div>
      )}

      {/* ── Mobile Filter Drawer ────────────────────────────── */}
      {mobileDrawerOpen && (
        <div className="md:hidden mt-4 p-5 bg-white border border-[#111111]/12 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#111111]/8">
            <h4 className="font-display text-sm font-semibold text-ink uppercase tracking-wider">
              Filter Products
            </h4>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className="text-ink/60 hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>

          {/* Categories in mobile */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/50 mb-2.5">
              Categories
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  updateFilters({ category: null });
                  setMobileDrawerOpen(false);
                }}
                className={`px-3 py-1.5 text-xs font-medium ${
                  !currentCategory ? "bg-ink text-white" : "bg-[#f7f2ef] text-ink"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    updateFilters({
                      category: currentCategory === cat.slug ? null : cat.slug,
                    });
                    setMobileDrawerOpen(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    currentCategory === cat.slug
                      ? "bg-ink text-white"
                      : "bg-[#f7f2ef] text-ink"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Collections in mobile */}
          {collections.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/50 mb-2.5">
                Collections
              </p>
              <div className="flex flex-wrap gap-2">
                {collections.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      updateFilters({
                        collection: currentCollection === col.slug ? null : col.slug,
                      });
                      setMobileDrawerOpen(false);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium ${
                      currentCollection === col.slug
                        ? "bg-chili text-white"
                        : "bg-white border border-chili/30 text-chili"
                    }`}
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
