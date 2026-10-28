"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Layers,
  Search,
  X,
  Check,
  Loader2,
  AlertCircle,
  Package,
  FolderTree,
  Sparkles,
  Info,
} from "lucide-react";
import type {
  AdminCouponTargetingMode,
  AdminCouponTargetItem,
} from "@/lib/api/admin";
import { getProducts, getCategories, getCollections } from "@/lib/api/catalog";
import type { ProductListItem, Category, Collection } from "@/lib/api/types";

export interface TargetingSelectionState {
  mode: AdminCouponTargetingMode;
  products: AdminCouponTargetItem[];
  categories: AdminCouponTargetItem[];
  collections: AdminCouponTargetItem[];
}

interface AdminCouponTargetingSelectorProps {
  mode: AdminCouponTargetingMode;
  onModeChange: (mode: AdminCouponTargetingMode) => void;
  selectedProducts: AdminCouponTargetItem[];
  onProductsChange: (products: AdminCouponTargetItem[]) => void;
  selectedCategories: AdminCouponTargetItem[];
  onCategoriesChange: (categories: AdminCouponTargetItem[]) => void;
  selectedCollections: AdminCouponTargetItem[];
  onCollectionsChange: (collections: AdminCouponTargetItem[]) => void;
  error?: string | null;
  isLoadingDetail?: boolean;
}

const TARGETING_MODES: {
  value: AdminCouponTargetingMode;
  label: string;
  description: string;
}[] = [
  {
    value: "ALL_PRODUCTS",
    label: "All Products",
    description: "Applies storewide to all published and eligible products.",
  },
  {
    value: "SPECIFIC_PRODUCTS",
    label: "Specific Products",
    description: "Applies exclusively to explicitly selected products.",
  },
  {
    value: "SPECIFIC_CATEGORIES",
    label: "Specific Categories",
    description: "Applies to products in chosen taxonomy categories.",
  },
  {
    value: "SPECIFIC_COLLECTIONS",
    label: "Specific Collections",
    description: "Applies to products grouped in designated collections.",
  },
  {
    value: "PRODUCTS_AND_CATEGORIES",
    label: "Products & Categories",
    description: "Applies to products matching either chosen products or categories.",
  },
  {
    value: "PRODUCTS_AND_COLLECTIONS",
    label: "Products & Collections",
    description: "Applies to products matching either chosen products or collections.",
  },
  {
    value: "CATEGORIES_AND_COLLECTIONS",
    label: "Categories & Collections",
    description: "Applies to products matching either chosen categories or collections.",
  },
  {
    value: "MIXED",
    label: "Mixed Targets",
    description: "Union of all chosen products, categories, and merchandising collections.",
  },
];

export default function AdminCouponTargetingSelector({
  mode,
  onModeChange,
  selectedProducts,
  onProductsChange,
  selectedCategories,
  onCategoriesChange,
  selectedCollections,
  onCollectionsChange,
  error,
  isLoadingDetail = false,
}: AdminCouponTargetingSelectorProps) {
  // Whether each entity type is active for current mode
  const showProducts = useMemo(
    () =>
      [
        "SPECIFIC_PRODUCTS",
        "PRODUCTS_AND_CATEGORIES",
        "PRODUCTS_AND_COLLECTIONS",
        "MIXED",
      ].includes(mode),
    [mode]
  );

  const showCategories = useMemo(
    () =>
      [
        "SPECIFIC_CATEGORIES",
        "PRODUCTS_AND_CATEGORIES",
        "CATEGORIES_AND_COLLECTIONS",
        "MIXED",
      ].includes(mode),
    [mode]
  );

  const showCollections = useMemo(
    () =>
      [
        "SPECIFIC_COLLECTIONS",
        "PRODUCTS_AND_COLLECTIONS",
        "CATEGORIES_AND_COLLECTIONS",
        "MIXED",
      ].includes(mode),
    [mode]
  );

  // Catalog options state
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<ProductListItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const [collectionsList, setCollectionsList] = useState<Collection[]>([]);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);

  const [catalogFetchError, setCatalogFetchError] = useState<string | null>(null);

  const productDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const collectionDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProductDropdownOpen(false);
      }
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
      if (
        collectionDropdownRef.current &&
        !collectionDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCollectionDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch categories once when relevant
  useEffect(() => {
    if (!showCategories || categoriesList.length > 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setIsLoadingCategories(true);
    }, 0);
    getCategories({ page_size: 100, is_active: true })
      .then((resp) => {
        if (!cancelled) {
          setCategoriesList(resp.results || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogFetchError(
            (err as { message?: string })?.message || "Failed to load categories."
          );
        }
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setIsLoadingCategories(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showCategories, categoriesList.length]);

  // Fetch collections once when relevant
  useEffect(() => {
    if (!showCollections || collectionsList.length > 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setIsLoadingCollections(true);
    }, 0);
    getCollections({ page_size: 100 })
      .then((resp) => {
        if (!cancelled) {
          setCollectionsList(resp.results || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogFetchError(
            (err as { message?: string })?.message || "Failed to load collections."
          );
        }
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setIsLoadingCollections(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showCollections, collectionsList.length]);

  // Debounced product search
  useEffect(() => {
    if (!showProducts) return;
    let cancelled = false;

    const timer = setTimeout(() => {
      setIsLoadingProducts(true);
      getProducts({ search: productSearch.trim() || undefined, page_size: 20 })
        .then((resp) => {
          if (!cancelled) {
            setProductOptions(resp.results || []);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setCatalogFetchError(
              (err as { message?: string })?.message || "Failed to search products."
            );
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoadingProducts(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showProducts, productSearch]);

  // Product selection handlers
  const handleToggleProduct = (prod: ProductListItem) => {
    const exists = selectedProducts.some((p) => p.id === prod.id);
    if (exists) {
      onProductsChange(selectedProducts.filter((p) => p.id !== prod.id));
    } else {
      onProductsChange([
        ...selectedProducts,
        {
          id: prod.id,
          name: prod.name,
          slug: prod.slug,
          status: "active",
          is_active: true,
        },
      ]);
    }
  };

  const handleRemoveProduct = (id: string) => {
    onProductsChange(selectedProducts.filter((p) => p.id !== id));
  };

  // Category selection handlers
  const handleToggleCategory = (cat: Category) => {
    const exists = selectedCategories.some((c) => c.id === cat.id);
    if (exists) {
      onCategoriesChange(selectedCategories.filter((c) => c.id !== cat.id));
    } else {
      onCategoriesChange([
        ...selectedCategories,
        {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          is_active: cat.is_active,
        },
      ]);
    }
  };

  const handleRemoveCategory = (id: string) => {
    onCategoriesChange(selectedCategories.filter((c) => c.id !== id));
  };

  // Collection selection handlers
  const handleToggleCollection = (col: Collection) => {
    const exists = selectedCollections.some((c) => c.id === col.id);
    if (exists) {
      onCollectionsChange(selectedCollections.filter((c) => c.id !== col.id));
    } else {
      onCollectionsChange([
        ...selectedCollections,
        {
          id: col.id,
          name: col.name,
          slug: col.slug,
          is_active: col.is_active,
        },
      ]);
    }
  };

  const handleRemoveCollection = (id: string) => {
    onCollectionsChange(selectedCollections.filter((c) => c.id !== id));
  };

  // Filtered categories & collections based on input search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categoriesList;
    const q = categorySearch.toLowerCase();
    return categoriesList.filter((c) => c.name.toLowerCase().includes(q));
  }, [categoriesList, categorySearch]);

  const filteredCollections = useMemo(() => {
    if (!collectionSearch.trim()) return collectionsList;
    const q = collectionSearch.toLowerCase();
    return collectionsList.filter((c) => c.name.toLowerCase().includes(q));
  }, [collectionsList, collectionSearch]);

  return (
    <div className="space-y-4 pt-3 border-t border-stone-200">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-stone-500" />
          Discount Targeting Rules
        </label>
        {isLoadingDetail && (
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Hydrating targets...</span>
          </div>
        )}
      </div>

      {catalogFetchError && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{catalogFetchError}</span>
        </div>
      )}

      {/* Targeting Mode Selector */}
      <div>
        <label
          htmlFor="targeting-mode-select"
          className="block text-xs font-medium text-stone-600 mb-1"
        >
          Targeting Mode
        </label>
        <select
          id="targeting-mode-select"
          value={mode}
          onChange={(e) => onModeChange(e.target.value as AdminCouponTargetingMode)}
          className="w-full text-sm rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
        >
          {TARGETING_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label} — {m.description}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-500">
          {TARGETING_MODES.find((m) => m.value === mode)?.description}
        </p>
      </div>

      {/* ALL_PRODUCTS State Banner */}
      {mode === "ALL_PRODUCTS" && (
        <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Storewide Coupon</span>
            <p className="text-emerald-700 mt-0.5">
              This promotion applies to all published catalog products that meet subtotal
              and validity criteria. No explicit catalog targets are required.
            </p>
          </div>
        </div>
      )}

      {/* Product Selection Section */}
      {showProducts && (
        <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-stone-500" />
              Target Products ({selectedProducts.length} selected)
            </span>
            {selectedProducts.length > 0 && (
              <button
                type="button"
                onClick={() => onProductsChange([])}
                className="text-xs text-stone-500 hover:text-stone-800 underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Product Search & Dropdown */}
          <div className="relative" ref={productDropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search products by title or slug..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setIsProductDropdownOpen(true);
                }}
                onFocus={() => setIsProductDropdownOpen(true)}
                className="w-full text-xs rounded-lg border border-stone-300 bg-white pl-8 pr-8 py-2 text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
              {isLoadingProducts && (
                <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-stone-400" />
              )}
            </div>

            {/* Dropdown Options */}
            {isProductDropdownOpen && (
              <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl py-1 text-xs">
                {productOptions.length === 0 ? (
                  <div className="px-3 py-2 text-stone-400 text-center">
                    {isLoadingProducts ? "Searching products..." : "No products found"}
                  </div>
                ) : (
                  productOptions.map((prod) => {
                    const isSelected = selectedProducts.some((p) => p.id === prod.id);
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleToggleProduct(prod)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-stone-50 transition ${
                          isSelected ? "bg-stone-100 font-semibold" : ""
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className="text-stone-900 block truncate">{prod.name}</span>
                          <span className="text-stone-400 text-[11px] block">{prod.slug}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-stone-900 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Selected Product Chips */}
          {selectedProducts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedProducts.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-stone-900 text-white font-medium"
                >
                  <span className="max-w-50 truncate">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(p.id)}
                    className="p-0.5 hover:bg-stone-700 rounded-full transition"
                    aria-label={`Remove ${p.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              At least one product must be selected for this targeting mode.
            </p>
          )}
        </div>
      )}

      {/* Category Selection Section */}
      {showCategories && (
        <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-stone-500" />
              Target Categories ({selectedCategories.length} selected)
            </span>
            {selectedCategories.length > 0 && (
              <button
                type="button"
                onClick={() => onCategoriesChange([])}
                className="text-xs text-stone-500 hover:text-stone-800 underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Category Search & Dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => {
                  setCategorySearch(e.target.value);
                  setIsCategoryDropdownOpen(true);
                }}
                onFocus={() => setIsCategoryDropdownOpen(true)}
                className="w-full text-xs rounded-lg border border-stone-300 bg-white pl-8 pr-8 py-2 text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
              {isLoadingCategories && (
                <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-stone-400" />
              )}
            </div>

            {/* Dropdown Options */}
            {isCategoryDropdownOpen && (
              <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl py-1 text-xs">
                {filteredCategories.length === 0 ? (
                  <div className="px-3 py-2 text-stone-400 text-center">
                    {isLoadingCategories ? "Loading categories..." : "No categories found"}
                  </div>
                ) : (
                  filteredCategories.map((cat) => {
                    const isSelected = selectedCategories.some((c) => c.id === cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleCategory(cat)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-stone-50 transition ${
                          isSelected ? "bg-stone-100 font-semibold" : ""
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className="text-stone-900 block truncate">{cat.name}</span>
                          <span className="text-stone-400 text-[11px] block">{cat.slug}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-stone-900 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Selected Category Chips */}
          {selectedCategories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedCategories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-indigo-900 text-white font-medium"
                >
                  <span className="max-w-50 truncate">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(c.id)}
                    className="p-0.5 hover:bg-indigo-700 rounded-full transition"
                    aria-label={`Remove ${c.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              Select at least one category for this rule.
            </p>
          )}
        </div>
      )}

      {/* Collection Selection Section */}
      {showCollections && (
        <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-stone-500" />
              Target Collections ({selectedCollections.length} selected)
            </span>
            {selectedCollections.length > 0 && (
              <button
                type="button"
                onClick={() => onCollectionsChange([])}
                className="text-xs text-stone-500 hover:text-stone-800 underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Collection Search & Dropdown */}
          <div className="relative" ref={collectionDropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search collections..."
                value={collectionSearch}
                onChange={(e) => {
                  setCollectionSearch(e.target.value);
                  setIsCollectionDropdownOpen(true);
                }}
                onFocus={() => setIsCollectionDropdownOpen(true)}
                className="w-full text-xs rounded-lg border border-stone-300 bg-white pl-8 pr-8 py-2 text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
              {isLoadingCollections && (
                <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-stone-400" />
              )}
            </div>

            {/* Dropdown Options */}
            {isCollectionDropdownOpen && (
              <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl py-1 text-xs">
                {filteredCollections.length === 0 ? (
                  <div className="px-3 py-2 text-stone-400 text-center">
                    {isLoadingCollections ? "Loading collections..." : "No collections found"}
                  </div>
                ) : (
                  filteredCollections.map((col) => {
                    const isSelected = selectedCollections.some((c) => c.id === col.id);
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => handleToggleCollection(col)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-stone-50 transition ${
                          isSelected ? "bg-stone-100 font-semibold" : ""
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className="text-stone-900 block truncate">{col.name}</span>
                          <span className="text-stone-400 text-[11px] block">{col.slug}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-stone-900 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Selected Collection Chips */}
          {selectedCollections.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedCollections.map((col) => (
                <span
                  key={col.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-800 text-white font-medium"
                >
                  <span className="max-w-50 truncate">{col.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCollection(col.id)}
                    className="p-0.5 hover:bg-amber-700 rounded-full transition"
                    aria-label={`Remove ${col.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              Select at least one collection for this rule.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
