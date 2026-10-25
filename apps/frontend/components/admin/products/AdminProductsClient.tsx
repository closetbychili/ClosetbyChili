"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  getAdminProducts,
  type AdminProductListItem,
} from "@/lib/api/admin";
import { getCategories, getCollections } from "@/lib/api/catalog";
import type { CategorySummary, CollectionSummary } from "@/lib/api/types";
import AdminProductsFilterBar from "./AdminProductsFilterBar";
import AdminProductsTable from "./AdminProductsTable";
import AdminProductsPagination from "./AdminProductsPagination";

const PAGE_SIZE = 20;

export default function AdminProductsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read current query params with robust defaults
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "all";
  const collection = searchParams.get("collection") || "all";
  const status = searchParams.get("status") || "all";
  const ordering = searchParams.get("ordering") || "-updated_at";

  const isFiltered = Boolean(
    search ||
      (category && category !== "all") ||
      (collection && collection !== "all") ||
      (status && status !== "all")
  );

  // Component state
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter taxonomy dropdown options
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);

  // Update URL helper
  const updateUrl = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Fetch taxonomy categories and collections once on mount
  useEffect(() => {
    let active = true;

    async function loadTaxonomy() {
      try {
        const [catResp, colResp] = await Promise.all([
          getCategories({ page_size: 100 }).catch(() => ({ results: [] })),
          getCollections({ page_size: 100 }).catch(() => ({ results: [] })),
        ]);

        if (active) {
          setCategories(catResp.results || []);
          setCollections(colResp.results || []);
        }
      } catch {
        // Taxonomy lookup failures should not block product listing
      }
    }

    loadTaxonomy();
    return () => {
      active = false;
    };
  }, []);

  // Fetch products from backend API
  const fetchProducts = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const data = await getAdminProducts({
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
          category: category !== "all" ? category : undefined,
          collection: collection !== "all" ? collection : undefined,
          status: status !== "all" ? status : undefined,
          ordering,
        });

        setProducts(data.results);
        setTotalCount(data.count);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load product catalog.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, collection, ordering, page, search, status]
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getAdminProducts({
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
          category: category !== "all" ? category : undefined,
          collection: collection !== "all" ? collection : undefined,
          status: status !== "all" ? status : undefined,
          ordering,
        });

        if (active) {
          setProducts(data.results);
          setTotalCount(data.count);
        }
      } catch (err: unknown) {
        if (active) {
          const message = err instanceof Error ? err.message : "Failed to load product catalog.";
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [category, collection, ordering, page, search, status]);

  // Event handlers
  const handleSearchChange = (newSearch: string) => {
    updateUrl({ search: newSearch, page: 1 });
  };

  const handleCategoryChange = (newCategory: string) => {
    updateUrl({ category: newCategory, page: 1 });
  };

  const handleCollectionChange = (newCollection: string) => {
    updateUrl({ collection: newCollection, page: 1 });
  };

  const handleStatusChange = (newStatus: string) => {
    updateUrl({ status: newStatus, page: 1 });
  };

  const handleOrderingChange = (newOrdering: string) => {
    updateUrl({ ordering: newOrdering, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage });
  };

  const handleResetFilters = () => {
    const params = new URLSearchParams();
    if (ordering !== "-updated_at") params.set("ordering", ordering);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <AdminPageHeader
        title="Products"
        description="Couture silhouettes, inventory matrices, variant configuration, and catalog pricing."
        breadcrumbs={[{ label: "Products" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchProducts(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EBE2D8] bg-white hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors shadow-2xs disabled:opacity-50"
              title="Refresh product list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#4F0012]" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </Link>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <AdminProductsFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        category={category}
        onCategoryChange={handleCategoryChange}
        collection={collection}
        onCollectionChange={handleCollectionChange}
        status={status}
        onStatusChange={handleStatusChange}
        ordering={ordering}
        onOrderingChange={handleOrderingChange}
        categories={categories}
        collections={collections}
        onReset={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* Products Table */}
      <AdminProductsTable
        products={products}
        loading={loading}
        error={error}
        onRetry={() => fetchProducts()}
        onRefresh={() => fetchProducts(true)}
        isFiltered={isFiltered}
        onResetFilters={handleResetFilters}
      />

      {/* Pagination Controls */}
      {!loading && !error && (
        <AdminProductsPagination
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
