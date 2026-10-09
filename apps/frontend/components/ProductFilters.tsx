"use client";

import { useTransition, useState, type ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  LayoutGrid,
  Grid3X3,
  Check,
  Ruler,
} from "lucide-react";
import type { CategorySummary, CollectionSummary } from "@/lib/api/types";

interface ProductFiltersProps {
  categories: CategorySummary[];
  collections: CollectionSummary[];
  totalCount: number;
  children?: ReactNode;
}

const SORT_OPTIONS = [
  { label: "Newest Arrivals", value: "-created_at" },
  { label: "Name: A to Z", value: "name" },
  { label: "Name: Z to A", value: "-name" },
  { label: "Oldest First", value: "created_at" },
];

const SIGNATURE_COLORS = [
  { name: "Chili Red", hex: "#8b000a", border: false },
  { name: "Noir Black", hex: "#111111", border: false },
  { name: "Royal Gold", hex: "#e9c349", border: false },
  { name: "Sand Ivory", hex: "#FAF7F2", border: true },
  { name: "Terracotta", hex: "#A6533D", border: false },
  { name: "Plum Wine", hex: "#722c19", border: false },
  { name: "Emerald", hex: "#1b3d2f", border: false },
  { name: "Pearl Cream", hex: "#F7F3EE", border: true },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const FABRICS = [
  "100% Mulberry Silk",
  "Handloom Chanderi",
  "Pure Mulmul Cotton",
  "Organza & Tissue Zari",
];

const PRICE_BRACKETS = [
  { label: "Under ₹2,999", value: "under-2999" },
  { label: "₹3,000 – ₹5,999", value: "3000-5999" },
  { label: "₹6,000 – ₹9,999", value: "6000-9999" },
  { label: "Above ₹10,000", value: "above-10000" },
];

export default function ProductFilters({
  categories,
  collections,
  totalCount,
  children,
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(4);

  // Client-only cosmetic filters for rich sidebar experience
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedFabric, setSelectedFabric] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);

  // Synchronize search input if URL changes externally
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
    setSelectedColor(null);
    setSelectedSize(null);
    setSelectedFabric(null);
    setSelectedPrice(null);
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(
    currentCategory ||
      currentCollection ||
      currentSearch ||
      (currentOrdering && currentOrdering !== "-created_at") ||
      selectedColor ||
      selectedSize ||
      selectedFabric ||
      selectedPrice
  );

  const activeFilterCount =
    (currentCategory ? 1 : 0) +
    (currentCollection ? 1 : 0) +
    (currentSearch ? 1 : 0) +
    (selectedColor ? 1 : 0) +
    (selectedSize ? 1 : 0) +
    (selectedFabric ? 1 : 0) +
    (selectedPrice ? 1 : 0);

  return (
    <div className="w-full flex flex-col">


      {/* ── Merchandising Bar & Sticky Sort Controls ────────── */}
      <section className="w-full bg-surface-container-low sticky top-20 z-30 shadow-xs border-y border-outline-variant/30 my-2">
        <div className="w-full py-3 px-3 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Filter Toggle & Active Summary */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              id="toggleFilterBtn"
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-2 bg-surface text-on-surface font-label-caps text-xs uppercase px-4 py-2 shadow-xs hover:bg-surface-container-highest transition-colors border border-outline-variant/30"
            >
              <SlidersHorizontal size={15} />
              <span id="filterToggleLabel">
                {sidebarOpen ? "Hide Filters" : "Show Filters"}
              </span>
            </button>

            {/* Mobile Filter Trigger Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden flex items-center gap-1.5 bg-surface text-on-surface font-label-caps text-xs uppercase px-3.5 py-2 shadow-xs border border-outline-variant/30"
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-body text-on-surface-variant">
              <span>Active:</span>
              <span className="font-semibold text-primary">
                {activeFilterCount > 0 ? `${activeFilterCount} Applied` : "0 Applied"}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-tertiary underline font-label-caps text-xs ml-2 hover:text-primary transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Right: Search Input + Sort Dropdown + Grid View Switcher */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            {/* Integrated Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative w-44 sm:w-56">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search kurtis, sets, anarkalis..."
                className="w-full bg-surface text-xs font-body text-on-surface placeholder:text-outline/70 pl-8 pr-7 py-2 border border-outline-variant/40 focus:outline-none focus:border-primary transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    updateFilters({ search: null });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
                  aria-label="Clear search input"
                >
                  <X size={12} />
                </button>
              )}
            </form>

            {/* Results Count indicator for tests and users */}
            <span className="font-label-caps text-xs uppercase text-on-surface-variant font-medium hidden xl:inline-block">
              {totalCount} {totalCount === 1 ? "Product" : "Products"}
            </span>

            {/* Sort By Dropdown */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="sortBySelect"
                className="font-label-caps text-xs uppercase text-on-surface-variant hidden md:inline"
              >
                Sort By:
              </label>
              <div className="relative">
                <select
                  id="sortBySelect"
                  value={currentOrdering}
                  onChange={(e) => updateFilters({ ordering: e.target.value })}
                  className="bg-surface text-on-surface font-label-ui text-xs px-3.5 py-2 pr-8 appearance-none focus:outline-none shadow-xs cursor-pointer border border-outline-variant/30"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
              </div>
            </div>

            {/* Grid View Switcher (Desktop) */}
            <div className="hidden md:flex items-center bg-surface p-1 shadow-xs border border-outline-variant/30 gap-1">
              <button
                id="gridCol3Btn"
                type="button"
                aria-label="3 Column View"
                onClick={() => setGridCols(3)}
                className={`p-1.5 transition-colors ${
                  gridCols === 3
                    ? "bg-primary text-on-primary shadow-2xs"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                id="gridCol4Btn"
                type="button"
                aria-label="4 Column View"
                onClick={() => setGridCols(4)}
                className={`p-1.5 transition-colors ${
                  gridCols === 4
                    ? "bg-primary text-on-primary shadow-2xs"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <Grid3X3 size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Active Filter Tags Row ──────────────────────────── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 py-3 px-1">
          <span className="font-label-caps text-xs uppercase tracking-widest text-on-surface-variant font-bold">
            Active Filters:
          </span>
          {currentSearch && (
            <span className="inline-flex items-center gap-1.5 bg-surface text-on-surface border border-outline-variant/40 text-xs px-2.5 py-1 shadow-2xs">
              Search: &ldquo;{currentSearch}&rdquo;
              <button
                type="button"
                onClick={() => updateFilters({ search: null })}
                className="hover:text-primary transition-colors cursor-pointer"
                aria-label="Remove search filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {currentCategory && (
            <span className="inline-flex items-center gap-1.5 bg-surface text-on-surface border border-outline-variant/40 text-xs px-2.5 py-1 shadow-2xs">
              Category:{" "}
              {categories.find((c) => c.slug === currentCategory)?.name ||
                currentCategory}
              <button
                type="button"
                onClick={() => updateFilters({ category: null })}
                className="hover:text-primary transition-colors cursor-pointer"
                aria-label="Remove category filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {currentCollection && (
            <span className="inline-flex items-center gap-1.5 bg-surface text-on-surface border border-outline-variant/40 text-xs px-2.5 py-1 shadow-2xs">
              Collection:{" "}
              {collections.find((c) => c.slug === currentCollection)?.name ||
                currentCollection}
              <button
                type="button"
                onClick={() => updateFilters({ collection: null })}
                className="hover:text-primary transition-colors cursor-pointer"
                aria-label="Remove collection filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {selectedPrice && (
            <span className="inline-flex items-center gap-1.5 bg-surface text-on-surface border border-outline-variant/40 text-xs px-2.5 py-1 shadow-2xs">
              Price: {PRICE_BRACKETS.find((p) => p.value === selectedPrice)?.label}
              <button
                type="button"
                onClick={() => setSelectedPrice(null)}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {selectedColor && (
            <span className="inline-flex items-center gap-1.5 bg-surface text-on-surface border border-outline-variant/40 text-xs px-2.5 py-1 shadow-2xs">
              Color: {selectedColor}
              <button
                type="button"
                onClick={() => setSelectedColor(null)}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {selectedSize && (
            <span className="inline-flex items-center gap-1.5 bg-surface text-on-surface border border-outline-variant/40 text-xs px-2.5 py-1 shadow-2xs">
              Size: {selectedSize}
              <button
                type="button"
                onClick={() => setSelectedSize(null)}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {selectedFabric && (
            <span className="inline-flex items-center gap-1.5 bg-surface text-on-surface border border-outline-variant/40 text-xs px-2.5 py-1 shadow-2xs">
              Fabric: {selectedFabric}
              <button
                type="button"
                onClick={() => setSelectedFabric(null)}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            className="font-label-caps text-xs uppercase tracking-widest text-primary font-bold hover:underline ml-2 cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* ── Main Catalog Body: Collapsible Sidebar + Content ── */}
      <div className="w-full flex items-start gap-8 pt-6">
        {/* Desktop Filter Sidebar (Collapsible) */}
        {sidebarOpen && (
          <aside
            id="filterSidebar"
            className="w-72 shrink-0 hidden lg:flex flex-col gap-6 sticky top-36 max-h-[calc(100vh-160px)] overflow-y-auto pr-2 scrollbar-none transition-all"
          >
            {/* Applied Chips Card */}
            {hasActiveFilters && (
              <div className="bg-surface-container-low p-4 shadow-xs flex flex-col gap-3 border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-xs uppercase font-bold text-on-surface">
                    Applied Filters
                  </span>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="font-label-caps text-xs text-primary uppercase underline hover:opacity-80 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentCategory && (
                    <span className="bg-surface text-on-surface font-label-caps text-[11px] px-2.5 py-1 flex items-center gap-1 shadow-2xs border border-outline-variant/30">
                      Silhouette:{" "}
                      {categories.find((c) => c.slug === currentCategory)?.name ||
                        currentCategory}
                      <button
                        type="button"
                        onClick={() => updateFilters({ category: null })}
                        className="hover:text-primary ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {currentCollection && (
                    <span className="bg-surface text-on-surface font-label-caps text-[11px] px-2.5 py-1 flex items-center gap-1 shadow-2xs border border-outline-variant/30">
                      Edit:{" "}
                      {collections.find((c) => c.slug === currentCollection)?.name ||
                        currentCollection}
                      <button
                        type="button"
                        onClick={() => updateFilters({ collection: null })}
                        className="hover:text-primary ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {selectedColor && (
                    <span className="bg-surface text-on-surface font-label-caps text-[11px] px-2.5 py-1 flex items-center gap-1 shadow-2xs border border-outline-variant/30">
                      {selectedColor}
                      <button
                        type="button"
                        onClick={() => setSelectedColor(null)}
                        className="hover:text-primary ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {selectedSize && (
                    <span className="bg-surface text-on-surface font-label-caps text-[11px] px-2.5 py-1 flex items-center gap-1 shadow-2xs border border-outline-variant/30">
                      Size: {selectedSize}
                      <button
                        type="button"
                        onClick={() => setSelectedSize(null)}
                        className="hover:text-primary ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Silhouette Categories */}
            <div className="bg-surface-container-low p-4 shadow-xs flex flex-col gap-3 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <h3 className="font-label-caps text-xs tracking-widest uppercase font-bold text-on-surface">
                  Silhouette Category
                </h3>
                {currentCategory && (
                  <button
                    type="button"
                    onClick={() => updateFilters({ category: null })}
                    className="text-[10px] text-primary uppercase font-semibold hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1 pt-1 font-body text-xs text-on-surface-variant">
                <button
                  type="button"
                  onClick={() => updateFilters({ category: null })}
                  className={`flex items-center justify-between px-2.5 py-1.5 transition-colors text-left ${
                    !currentCategory
                      ? "bg-primary text-on-primary font-semibold shadow-2xs"
                      : "hover:bg-surface-container text-on-surface"
                  }`}
                >
                  <span>All Silhouettes</span>
                  <span className="text-[10px] opacity-70">{totalCount}</span>
                </button>
                {categories.map((cat) => {
                  const isSelected = currentCategory === cat.slug;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        updateFilters({
                          category: isSelected ? null : cat.slug,
                        })
                      }
                      className={`flex items-center justify-between px-2.5 py-1.5 transition-colors text-left ${
                        isSelected
                          ? "bg-primary text-on-primary font-semibold shadow-2xs"
                          : "hover:bg-surface-container text-on-surface"
                      }`}
                    >
                      <span>{cat.name}</span>
                      {isSelected && <Check size={13} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Curated Collections */}
            {collections.length > 0 && (
              <div className="bg-surface-container-low p-4 shadow-xs flex flex-col gap-3 border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-label-caps text-xs tracking-widest uppercase font-bold text-on-surface">
                    Curated Collections
                  </h3>
                  {currentCollection && (
                    <button
                      type="button"
                      onClick={() => updateFilters({ collection: null })}
                      className="text-[10px] text-primary uppercase font-semibold hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1 pt-1 font-body text-xs text-on-surface-variant">
                  {collections.map((col) => {
                    const isSelected = currentCollection === col.slug;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() =>
                          updateFilters({
                            collection: isSelected ? null : col.slug,
                          })
                        }
                        className={`flex items-center justify-between px-2.5 py-1.5 transition-colors text-left ${
                          isSelected
                            ? "bg-secondary text-on-secondary font-semibold shadow-2xs"
                            : "hover:bg-surface-container text-on-surface"
                        }`}
                      >
                        <span>{col.name}</span>
                        {isSelected && <Check size={13} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price Range Filter */}
            <div className="bg-surface-container-low p-4 shadow-xs flex flex-col gap-3 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <h3 className="font-label-caps text-xs tracking-widest uppercase font-bold text-on-surface">
                  Price Range (₹)
                </h3>
              </div>
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center justify-between font-label-ui text-xs font-semibold text-on-surface">
                  <span>₹1,299</span>
                  <span>₹15,000+</span>
                </div>
                <div className="relative w-full h-1.5 bg-surface-container-highest rounded-full">
                  <div className="absolute left-1/4 right-1/6 h-full bg-primary rounded-full" />
                </div>
                <div className="flex flex-col gap-1.5 mt-1">
                  {PRICE_BRACKETS.map((bracket) => (
                    <label
                      key={bracket.value}
                      className="flex items-center gap-2 text-xs font-body text-on-surface-variant cursor-pointer hover:text-on-surface"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPrice === bracket.value}
                        onChange={() =>
                          setSelectedPrice(
                            selectedPrice === bracket.value ? null : bracket.value
                          )
                        }
                        className="accent-primary w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>{bracket.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Signature Color Palette */}
            <div className="bg-surface-container-low p-4 shadow-xs flex flex-col gap-3 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <h3 className="font-label-caps text-xs tracking-widest uppercase font-bold text-on-surface">
                  Signature Color Palette
                </h3>
                {selectedColor && (
                  <button
                    type="button"
                    onClick={() => setSelectedColor(null)}
                    className="text-[10px] text-primary uppercase font-semibold hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {SIGNATURE_COLORS.map((col) => {
                  const isSelected = selectedColor === col.name;
                  return (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() =>
                        setSelectedColor(isSelected ? null : col.name)
                      }
                      className={`flex items-center gap-2.5 px-2.5 py-2 border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
                          : "border-outline-variant/40 bg-surface hover:border-outline text-on-surface"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full shrink-0 shadow-2xs ${
                          col.border ? "border border-outline-variant/60" : ""
                        }`}
                        style={{ backgroundColor: col.hex }}
                      />
                      <span className="text-xs truncate font-body">{col.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size & Fit Selector */}
            <div className="bg-surface-container-low p-4 shadow-xs flex flex-col gap-3 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <h3 className="font-label-caps text-xs tracking-widest uppercase font-bold text-on-surface">
                  Size &amp; Fit
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 font-label-ui text-xs">
                {SIZES.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(isSelected ? null : size)}
                      className={`h-9 flex items-center justify-center transition-colors border ${
                        isSelected
                          ? "bg-primary text-on-primary font-bold border-primary shadow-xs"
                          : "bg-surface hover:bg-surface-container text-on-surface border-outline-variant/30"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSize(
                      selectedSize === "Custom Fit" ? null : "Custom Fit"
                    )
                  }
                  className={`col-span-3 h-9 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors border ${
                    selectedSize === "Custom Fit"
                      ? "bg-primary text-on-primary border-primary shadow-xs"
                      : "bg-surface hover:bg-surface-container text-on-surface border-outline-variant/30"
                  }`}
                >
                  <Ruler size={13} />
                  <span>Complimentary Custom Fit</span>
                </button>
              </div>
            </div>

            {/* Pure Handwoven Fabric */}
            <div className="bg-surface-container-low p-4 shadow-xs flex flex-col gap-3 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <h3 className="font-label-caps text-xs tracking-widest uppercase font-bold text-on-surface">
                  Pure Handwoven Fabric
                </h3>
              </div>
              <div className="flex flex-col gap-2 pt-1 font-body text-xs text-on-surface-variant">
                {FABRICS.map((fabric) => (
                  <label
                    key={fabric}
                    className="flex items-center justify-between cursor-pointer hover:text-on-surface"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedFabric === fabric}
                        onChange={() =>
                          setSelectedFabric(
                            selectedFabric === fabric ? null : fabric
                          )
                        }
                        className="accent-primary w-4 h-4 cursor-pointer"
                      />
                      <span>{fabric}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Dispatch & Atelier */}
            <div className="bg-surface-container-low p-4 shadow-xs flex flex-col gap-2.5 font-body text-xs border border-outline-variant/30">
              <label className="flex items-center gap-2 cursor-pointer text-on-surface font-semibold">
                <input
                  type="checkbox"
                  defaultChecked
                  className="accent-primary w-4 h-4"
                />
                <span>Express Dispatch (24–48h)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-on-surface-variant">
                <input type="checkbox" className="accent-primary w-4 h-4" />
                <span>Bespoke Atelier Orders</span>
              </label>
            </div>
          </aside>
        )}

        {/* ── Main Catalog Product Grid Column ────────────────── */}
        <div
          className={`flex-1 w-full min-w-0 flex flex-col gap-8 ${
            gridCols === 3
              ? "[&_.catalog-product-grid]:xl:grid-cols-3"
              : "[&_.catalog-product-grid]:xl:grid-cols-4"
          }`}
        >
          {children}
        </div>
      </div>

      {/* ── Mobile Filter Drawer ────────────────────────────── */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-ink/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative ml-auto w-full max-w-xs h-full bg-surface shadow-xl flex flex-col z-10 overflow-y-auto">
            <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low">
              <h4 className="font-headline-sm text-sm uppercase font-semibold text-on-surface">
                Filter Silhouettes
              </h4>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-6">
              {/* Mobile Categories */}
              <div>
                <p className="font-label-caps text-xs uppercase tracking-wider text-on-surface-variant font-bold mb-3">
                  Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateFilters({ category: null });
                      setMobileDrawerOpen(false);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${
                      !currentCategory
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface"
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
                          category:
                            currentCategory === cat.slug ? null : cat.slug,
                        });
                        setMobileDrawerOpen(false);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${
                        currentCategory === cat.slug
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Collections */}
              {collections.length > 0 && (
                <div>
                  <p className="font-label-caps text-xs uppercase tracking-wider text-on-surface-variant font-bold mb-3">
                    Curated Collections
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {collections.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          updateFilters({
                            collection:
                              currentCollection === col.slug ? null : col.slug,
                          });
                          setMobileDrawerOpen(false);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${
                          currentCollection === col.slug
                            ? "bg-secondary text-on-secondary"
                            : "bg-surface-container text-on-surface"
                        }`}
                      >
                        {col.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile Reset & Apply */}
              <div className="pt-4 flex items-center gap-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => {
                    clearAllFilters();
                    setMobileDrawerOpen(false);
                  }}
                  className="flex-1 py-2.5 border border-outline-variant/50 text-xs font-label-caps uppercase text-on-surface"
                >
                  Reset All
                </button>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex-1 py-2.5 bg-primary text-on-primary text-xs font-label-caps uppercase"
                >
                  View Pieces
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
