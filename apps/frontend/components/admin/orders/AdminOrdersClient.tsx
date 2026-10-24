"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  getAdminOrders,
  type AdminOrderListItem,
} from "@/lib/api/admin";
import AdminOrdersFilterBar from "./AdminOrdersFilterBar";
import AdminOrdersTable from "./AdminOrdersTable";
import AdminOrdersPagination from "./AdminOrdersPagination";

const PAGE_SIZE = 20;

export default function AdminOrdersClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL query parameters
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const paymentStatus = searchParams.get("payment_status") || "all";
  const createdAfter = searchParams.get("created_after") || "";
  const createdBefore = searchParams.get("created_before") || "";
  const ordering = searchParams.get("ordering") || "-created_at";

  const isFiltered = Boolean(
    search ||
      (status && status !== "all") ||
      (paymentStatus && paymentStatus !== "all") ||
      createdAfter ||
      createdBefore
  );

  // Component state
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to update URL query params cleanly
  const updateUrl = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          value === "" ||
          value === "all"
        ) {
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

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const resp = await getAdminOrders({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        status: status !== "all" ? status : undefined,
        payment_status: paymentStatus !== "all" ? paymentStatus : undefined,
        created_after: createdAfter || undefined,
        created_before: createdBefore || undefined,
        ordering,
      });

      setOrders(resp.results || []);
      setTotalCount(resp.count || 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to reload orders. Please try again.";
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [page, search, status, paymentStatus, createdAfter, createdBefore, ordering]);

  // Main data fetching effect with race condition cancellation
  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const resp = await getAdminOrders({
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
          status: status !== "all" ? status : undefined,
          payment_status: paymentStatus !== "all" ? paymentStatus : undefined,
          created_after: createdAfter || undefined,
          created_before: createdBefore || undefined,
          ordering,
        });

        if (active) {
          setOrders(resp.results || []);
          setTotalCount(resp.count || 0);
        }
      } catch (err: unknown) {
        if (active) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to load orders. Please try again.";
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [page, search, status, paymentStatus, createdAfter, createdBefore, ordering]);

  // Filter change handlers (all reset page back to 1)
  const handleSearchChange = (newSearch: string) => {
    updateUrl({ search: newSearch, page: 1 });
  };

  const handleStatusChange = (newStatus: string) => {
    updateUrl({ status: newStatus, page: 1 });
  };

  const handlePaymentStatusChange = (newPaymentStatus: string) => {
    updateUrl({ payment_status: newPaymentStatus, page: 1 });
  };

  const handleDateRangeChange = (newAfter: string, newBefore: string) => {
    updateUrl({ created_after: newAfter, created_before: newBefore, page: 1 });
  };

  const handleOrderingChange = (newOrdering: string) => {
    updateUrl({ ordering: newOrdering, page: 1 });
  };

  const handleResetFilters = () => {
    updateUrl({
      search: null,
      status: null,
      payment_status: null,
      created_after: null,
      created_before: null,
      ordering: "-created_at",
      page: 1,
    });
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Page Header */}
      <AdminPageHeader
        title="Orders"
        description="Patron orders, payment verification states, order statuses, and fulfillment tracking."
        breadcrumbs={[{ label: "Orders" }]}
      />

      {/* Filter and Search Bar */}
      <AdminOrdersFilterBar
        search={search}
        status={status}
        paymentStatus={paymentStatus}
        createdAfter={createdAfter}
        createdBefore={createdBefore}
        ordering={ordering}
        isFiltered={isFiltered}
        refreshing={refreshing}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onPaymentStatusChange={handlePaymentStatusChange}
        onDateRangeChange={handleDateRangeChange}
        onOrderingChange={handleOrderingChange}
        onResetFilters={handleResetFilters}
        onRefresh={handleRefresh}
      />

      {/* Paginated Orders Table */}
      <AdminOrdersTable
        orders={orders}
        loading={loading}
        error={error}
        ordering={ordering}
        isFiltered={isFiltered}
        onRetry={handleRefresh}
        onResetFilters={handleResetFilters}
        onSort={handleOrderingChange}
      />

      {/* Pagination Controls */}
      {!loading && totalCount > 0 && (
        <AdminOrdersPagination
          currentPage={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
