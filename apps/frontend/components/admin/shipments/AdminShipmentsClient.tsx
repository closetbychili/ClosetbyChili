"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  getAdminShipments,
  type AdminShipmentListItem,
} from "@/lib/api/admin";
import AdminShipmentsFilterBar from "./AdminShipmentsFilterBar";
import AdminShipmentsTable from "./AdminShipmentsTable";
import AdminShipmentDetailDrawer from "./AdminShipmentDetailDrawer";

const PAGE_SIZE = 20;

export default function AdminShipmentsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL query parameters
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const carrier = searchParams.get("carrier") || "all";
  const createdAfter = searchParams.get("created_after") || "";
  const createdBefore = searchParams.get("created_before") || "";
  const ordering = searchParams.get("ordering") || "-created_at";

  const isFiltered = Boolean(
    search ||
      (status && status !== "all") ||
      (carrier && carrier !== "all") ||
      createdAfter ||
      createdBefore
  );

  // Component state
  const [shipments, setShipments] = useState<AdminShipmentListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Drawer state
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

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

      const resp = await getAdminShipments({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        status: status !== "all" ? status : undefined,
        carrier: carrier !== "all" ? carrier : undefined,
        created_after: createdAfter || undefined,
        created_before: createdBefore || undefined,
        ordering,
      });

      setShipments(resp.results || []);
      setTotalCount(resp.count || 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to reload shipments. Please try again.";
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [page, search, status, carrier, createdAfter, createdBefore, ordering]);

  // Main data fetching effect
  useEffect(() => {
    let active = true;

    const loadShipments = async () => {
      try {
        setLoading(true);
        setError(null);

        const resp = await getAdminShipments({
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
          status: status !== "all" ? status : undefined,
          carrier: carrier !== "all" ? carrier : undefined,
          created_after: createdAfter || undefined,
          created_before: createdBefore || undefined,
          ordering,
        });

        if (active) {
          setShipments(resp.results || []);
          setTotalCount(resp.count || 0);
        }
      } catch (err: unknown) {
        if (active) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to load shipments. Please try again.";
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadShipments();

    return () => {
      active = false;
    };
  }, [page, search, status, carrier, createdAfter, createdBefore, ordering]);

  // Filter change handlers (all reset page to 1)
  const handleSearchChange = (newSearch: string) => {
    updateUrl({ search: newSearch, page: 1 });
  };

  const handleStatusChange = (newStatus: string) => {
    updateUrl({ status: newStatus, page: 1 });
  };

  const handleCarrierChange = (newCarrier: string) => {
    updateUrl({ carrier: newCarrier, page: 1 });
  };

  const handleDateRangeChange = (start: string, end: string) => {
    updateUrl({ created_after: start, created_before: end, page: 1 });
  };

  const handleOrderingChange = (newOrdering: string) => {
    updateUrl({ ordering: newOrdering });
  };

  const handleResetFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage });
  };

  const handleOpenDrawer = (shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedShipmentId(null);
  };

  // Metrics summary
  const readyCount = shipments.filter((s) => s.status === "READY_TO_SHIP").length;
  const inTransitCount = shipments.filter(
    (s) => s.status === "SHIPPED" || s.status === "IN_TRANSIT" || s.status === "OUT_FOR_DELIVERY"
  ).length;
  const deliveredCount = shipments.filter((s) => s.status === "DELIVERED").length;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Shipment Management"
        description="Manage carrier parcels, track dispatches, and coordinate delivery lifecycles"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#554243] bg-white hover:bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Refresh Shipments"}</span>
            </button>
          </div>
        }
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[#8C7A78]">
            <span className="text-xs font-medium">Total Registered</span>
            <Package className="w-4 h-4 text-[#6D1826]" />
          </div>
          <div className="text-2xl font-bold text-[#1F1B17]">{totalCount}</div>
          <div className="text-[11px] text-[#A89895]">All parcels recorded</div>
        </div>

        <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[#8C7A78]">
            <span className="text-xs font-medium">Ready to Ship</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{readyCount}</div>
          <div className="text-[11px] text-[#A89895]">Packed & awaiting carrier</div>
        </div>

        <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[#8C7A78]">
            <span className="text-xs font-medium">Dispatched & In Transit</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{inTransitCount}</div>
          <div className="text-[11px] text-[#A89895]">En route to patron</div>
        </div>

        <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[#8C7A78]">
            <span className="text-xs font-medium">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{deliveredCount}</div>
          <div className="text-[11px] text-[#A89895]">Fulfilled successfully</div>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <span className="text-xs font-medium">{error}</span>
          <button
            onClick={handleRefresh}
            className="text-xs font-bold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <AdminShipmentsFilterBar
        search={search}
        status={status}
        carrier={carrier}
        createdAfter={createdAfter}
        createdBefore={createdBefore}
        ordering={ordering}
        isFiltered={isFiltered}
        refreshing={refreshing}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onCarrierChange={handleCarrierChange}
        onDateRangeChange={handleDateRangeChange}
        onOrderingChange={handleOrderingChange}
        onResetFilters={handleResetFilters}
        onRefresh={handleRefresh}
      />

      {/* Main Table */}
      <AdminShipmentsTable
        shipments={shipments}
        loading={loading}
        onSelectShipment={handleOpenDrawer}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* Pagination Bar */}
      {!loading && totalCount > 0 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-[#EBE2D8] rounded-xl text-xs text-[#554243] shadow-sm">
          <div>
            Showing <strong className="text-[#1F1B17]">{(page - 1) * PAGE_SIZE + 1}</strong> to{" "}
            <strong className="text-[#1F1B17]">
              {Math.min(page * PAGE_SIZE, totalCount)}
            </strong>{" "}
            of <strong className="text-[#1F1B17]">{totalCount}</strong> shipments
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-[#EBE2D8] bg-[#FAF6F2] hover:bg-[#F3ECE4] disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-[#8C7A78]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#EBE2D8] bg-[#FAF6F2] hover:bg-[#F3ECE4] disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Inspection Drawer */}
      <AdminShipmentDetailDrawer
        shipmentId={selectedShipmentId}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        onShipmentUpdated={handleRefresh}
      />
    </div>
  );
}
