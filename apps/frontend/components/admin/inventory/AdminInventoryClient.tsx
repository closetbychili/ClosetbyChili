"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  getAdminInventory,
  getAdminInventorySummary,
  type AdminInventoryItem,
  type AdminInventorySummary,
} from "@/lib/api/admin";
import { getCategories } from "@/lib/api/catalog";
import type { CategorySummary } from "@/lib/api/types";
import AdminInventorySummaryCards from "./AdminInventorySummaryCards";
import AdminInventoryFilterBar from "./AdminInventoryFilterBar";
import AdminInventoryTable from "./AdminInventoryTable";
import AdminInventoryPagination from "./AdminInventoryPagination";

const PAGE_SIZE = 20;

export default function AdminInventoryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL query params
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const search = searchParams.get("search") || "";
  const stockStatus = searchParams.get("stock_status") || "all";
  const category = searchParams.get("category") || "all";
  const ordering = searchParams.get("ordering") || "-updated_at";

  const isFiltered = Boolean(
    search ||
      (stockStatus && stockStatus !== "all") ||
      (category && category !== "all")
  );

  // Component state
  const [items, setItems] = useState<AdminInventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [summary, setSummary] = useState<AdminInventorySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Taxonomy category options
  const [categories, setCategories] = useState<CategorySummary[]>([]);

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

  // Load category taxonomy once on mount
  useEffect(() => {
    let active = true;

    async function loadTaxonomy() {
      try {
        const catResp = await getCategories({ page_size: 100 });
        if (active) {
          setCategories(catResp.results || []);
        }
      } catch {
        // Taxonomy lookup failure should not break inventory
      }
    }

    loadTaxonomy();
    return () => {
      active = false;
    };
  }, []);

  // Fetch inventory summary and paginated items
  const fetchData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const validStockStatus =
          stockStatus !== "all"
            ? (stockStatus as "in_stock" | "low_stock" | "out_of_stock")
            : undefined;

        // Fetch summary metrics and paginated inventory in parallel
        const [summaryData, listData] = await Promise.all([
          getAdminInventorySummary({
            category: category !== "all" ? category : undefined,
          }),
          getAdminInventory({
            page,
            page_size: PAGE_SIZE,
            search: search || undefined,
            stock_status: validStockStatus,
            category: category !== "all" ? category : undefined,
            ordering,
          }),
        ]);

        setSummary(summaryData);
        setItems(listData.results || []);
        setTotalCount(listData.count || 0);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load inventory data. Please try again.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, stockStatus, category, ordering]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const validStockStatus =
          stockStatus !== "all"
            ? (stockStatus as "in_stock" | "low_stock" | "out_of_stock")
            : undefined;

        const [summaryData, listData] = await Promise.all([
          getAdminInventorySummary({
            category: category !== "all" ? category : undefined,
          }),
          getAdminInventory({
            page,
            page_size: PAGE_SIZE,
            search: search || undefined,
            stock_status: validStockStatus,
            category: category !== "all" ? category : undefined,
            ordering,
          }),
        ]);

        if (active) {
          setSummary(summaryData);
          setItems(listData.results || []);
          setTotalCount(listData.count || 0);
        }
      } catch (err: unknown) {
        if (active) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to load inventory data. Please try again.";
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
  }, [category, ordering, page, search, stockStatus]);

  // Handler functions
  const handleSearchChange = (newSearch: string) => {
    updateUrl({ search: newSearch, page: 1 });
  };

  const handleStockStatusChange = (newStatus: string) => {
    updateUrl({ stock_status: newStatus, page: 1 });
  };

  const handleCategoryChange = (newCategory: string) => {
    updateUrl({ category: newCategory, page: 1 });
  };

  const handleOrderingChange = (newOrdering: string) => {
    updateUrl({ ordering: newOrdering, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage });
  };

  const handleResetFilters = () => {
    updateUrl({ search: null, stock_status: null, category: null, page: 1 });
  };

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Inventory"
        description="Atelier stock levels, reservation allocations, low-stock thresholds, and ledger movements."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Inventory" },
        ]}
      />

      {/* Summary KPI Cards */}
      <AdminInventorySummaryCards
        summary={summary}
        loading={loading && !refreshing}
        activeStatus={stockStatus}
        onStatusFilterClick={handleStockStatusChange}
      />

      {/* Search and Filters Bar */}
      <AdminInventoryFilterBar
        search={search}
        stockStatus={stockStatus}
        category={category}
        ordering={ordering}
        categories={categories}
        isFiltered={isFiltered}
        refreshing={refreshing}
        onSearchChange={handleSearchChange}
        onStockStatusChange={handleStockStatusChange}
        onCategoryChange={handleCategoryChange}
        onOrderingChange={handleOrderingChange}
        onResetFilters={handleResetFilters}
        onRefresh={() => fetchData(true)}
      />

      {/* Inventory Table */}
      <AdminInventoryTable
        items={items}
        loading={loading}
        error={error}
        ordering={ordering}
        isFiltered={isFiltered}
        onRetry={() => fetchData(false)}
        onResetFilters={handleResetFilters}
        onSort={handleOrderingChange}
      />

      {/* Pagination Controls */}
      {!loading && !error && totalCount > 0 && (
        <AdminInventoryPagination
          currentPage={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
