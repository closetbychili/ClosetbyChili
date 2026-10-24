"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  Boxes,
  Check,
  ChevronRight,
  Edit2,
  ExternalLink,
  Layers,
  Lock,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  acknowledgeInventoryAlert,
  getAdminInventoryDetail,
  getAdminInventoryMovements,
  updateInventoryThreshold,
  type AdminInventoryDetail,
  type AdminInventoryMovement,
  type StockAdjustmentResponse,
} from "@/lib/api/admin";
import AdminStockAdjustmentModal from "./AdminStockAdjustmentModal";
import AdminMovementHistoryTable from "./AdminMovementHistoryTable";

interface AdminInventoryDetailClientProps {
  variantId: string;
}

export default function AdminInventoryDetailClient({
  variantId,
}: AdminInventoryDetailClientProps) {
  // Detail State
  const [detail, setDetail] = useState<AdminInventoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Movements State
  const [movements, setMovements] = useState<AdminInventoryMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState<boolean>(true);
  const [movementsError, setMovementsError] = useState<string | null>(null);
  const [movementsCount, setMovementsCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedReason, setSelectedReason] = useState<string>("all");
  const [selectedManualFilter, setSelectedManualFilter] = useState<string>("all");

  // Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Threshold editing state
  const [isEditingThreshold, setIsEditingThreshold] = useState<boolean>(false);
  const [thresholdInput, setThresholdInput] = useState<string>("");
  const [thresholdLoading, setThresholdLoading] = useState<boolean>(false);
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  // Alert acknowledgement state
  const [ackLoading, setAckLoading] = useState<boolean>(false);

  const handleStartEditThreshold = () => {
    setThresholdInput(String(detail?.low_stock_threshold ?? 5));
    setThresholdError(null);
    setIsEditingThreshold(true);
  };

  const handleSaveThreshold = async () => {
    const val = parseInt(thresholdInput, 10);
    if (isNaN(val) || val < 0) {
      setThresholdError("Threshold must be a non-negative integer.");
      return;
    }

    try {
      setThresholdLoading(true);
      setThresholdError(null);
      const res = await updateInventoryThreshold(variantId, val);
      if (detail) {
        setDetail({
          ...detail,
          low_stock_threshold: res.low_stock_threshold,
          stock_status: res.stock_status,
          stock_status_label: res.stock_status_label,
          is_alert_acknowledged: res.is_alert_acknowledged,
        });
      }
      setIsEditingThreshold(false);
      setSuccessToast(`Low-stock threshold updated to ${res.low_stock_threshold} units.`);
    } catch (err: unknown) {
      setThresholdError(err instanceof Error ? err.message : "Failed to update threshold.");
    } finally {
      setThresholdLoading(false);
    }
  };

  const handleToggleAlertAck = async () => {
    if (!detail) return;
    const targetState = !detail.is_alert_acknowledged;
    try {
      setAckLoading(true);
      const res = await acknowledgeInventoryAlert(variantId, targetState);
      setDetail({
        ...detail,
        is_alert_acknowledged: res.is_alert_acknowledged,
        alert_acknowledged_at: res.alert_acknowledged_at,
      });
      setSuccessToast(
        targetState
          ? "Alert acknowledged. Note: inventory status remains unchanged until restocked."
          : "Alert acknowledgement removed."
      );
    } catch (err: unknown) {
      setSuccessToast(err instanceof Error ? err.message : "Failed to update alert state.");
    } finally {
      setAckLoading(false);
    }
  };

  // Fetch Inventory Detail
  const fetchDetail = useCallback(async () => {
    try {
      setDetailLoading(true);
      setDetailError(null);
      const data = await getAdminInventoryDetail(variantId);
      setDetail(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load inventory details.";
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  }, [variantId]);

  // Fetch Movements History
  const fetchMovements = useCallback(async () => {
    try {
      setMovementsLoading(true);
      setMovementsError(null);
      const isManualParam =
        selectedManualFilter === "manual"
          ? true
          : selectedManualFilter === "automated"
          ? false
          : undefined;

      const data = await getAdminInventoryMovements(variantId, {
        page: currentPage,
        page_size: 15,
        movement_type: selectedType,
        reason_code: selectedReason,
        is_manual: isManualParam,
      });

      setMovements(data.results || []);
      setMovementsCount(data.count || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load movement audit history.";
      setMovementsError(msg);
    } finally {
      setMovementsLoading(false);
    }
  }, [variantId, currentPage, selectedType, selectedReason, selectedManualFilter]);

  // Initial and reactive effects
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await getAdminInventoryDetail(variantId);
        if (active) {
          setDetail(data);
          setDetailError(null);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : "Failed to load inventory details.";
          setDetailError(msg);
        }
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [variantId]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const isManualParam =
          selectedManualFilter === "manual"
            ? true
            : selectedManualFilter === "automated"
            ? false
            : undefined;

        const data = await getAdminInventoryMovements(variantId, {
          page: currentPage,
          page_size: 15,
          movement_type: selectedType,
          reason_code: selectedReason,
          is_manual: isManualParam,
        });

        if (active) {
          setMovements(data.results || []);
          setMovementsCount(data.count || 0);
          setMovementsError(null);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : "Failed to load movement audit history.";
          setMovementsError(msg);
        }
      } finally {
        if (active) {
          setMovementsLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [variantId, currentPage, selectedType, selectedReason, selectedManualFilter]);

  // Reset pagination on filter change
  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleReasonChange = (reason: string) => {
    setSelectedReason(reason);
    setCurrentPage(1);
  };

  const handleManualFilterChange = (manual: string) => {
    setSelectedManualFilter(manual);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedType("all");
    setSelectedReason("all");
    setSelectedManualFilter("all");
    setCurrentPage(1);
  };

  // Adjustment Success Handler
  const handleAdjustmentSuccess = (result: StockAdjustmentResponse) => {
    // Authoritative update directly updates local detail and refetches movements
    if (detail) {
      setDetail({
        ...detail,
        quantity_on_hand: result.quantity_on_hand ?? detail.quantity_on_hand,
        quantity_reserved: result.quantity_reserved,
        quantity_available: result.quantity_available,
        stock_status: result.stock_status,
        stock_status_label: (result.stock_status_label || detail.stock_status_label) as
          | "In Stock"
          | "Low Stock"
          | "Out of Stock",
      });
    }

    const delta = result.change_delta ?? 0;
    const finalOnHand = result.quantity_on_hand ?? (detail ? detail.quantity_on_hand + delta : 0);

    setSuccessToast(
      result.idempotent_replay
        ? "Existing stock transaction verified (idempotent)."
        : `Stock adjusted successfully (${delta > 0 ? "+" : ""}${delta} units). Resulting on-hand: ${finalOnHand}.`
    );

    // Refresh movements ledger to immediately display the new audit row
    fetchMovements();
  };

  // Auto-clear toast after 5s
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  if (detailLoading && !detail) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-[#EBE2D8] rounded w-48 animate-pulse" />
        <div className="h-32 bg-white rounded-2xl border border-[#EBE2D8] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-white rounded-2xl border border-[#EBE2D8] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (detailError && !detail) {
    return (
      <div className="bg-white rounded-2xl border border-[#FECACA] p-8 text-center my-8 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626] mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-serif font-bold text-[#1F1B17] mb-1">
          Variant Not Found
        </h3>
        <p className="text-xs text-[#8C7A78] max-w-md mx-auto mb-4">{detailError}</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/admin/inventory"
            className="px-4 py-2 border border-[#EBE2D8] text-xs font-medium rounded-lg text-[#554243] hover:bg-[#FAF6F2]"
          >
            Back to Inventory
          </Link>
          <button
            type="button"
            onClick={fetchDetail}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium rounded-lg shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const isOutOfStock = detail.stock_status === "out_of_stock";
  const isLowStock = detail.stock_status === "low_stock";

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-[#8C7A78]" aria-label="Breadcrumb">
        <Link
          href="/admin/inventory"
          className="hover:text-[#4F0012] flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Inventory Overview</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-[#EBE2D8]" />
        <span className="text-[#1F1B17] font-medium truncate max-w-xs">
          {detail.product_name}
        </span>
        <ChevronRight className="w-3 h-3 text-[#EBE2D8]" />
        <span className="font-mono text-[#8C7A78]">{detail.sku}</span>
      </nav>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl flex items-center justify-between text-xs text-[#059669] animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0" />
            <span className="font-medium">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-[#059669] hover:underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Alert Callout Banner */}
      {(isLowStock || isOutOfStock) && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isOutOfStock
              ? "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
              : "bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]"
          }`}
          data-testid="inventory-alert-banner"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {isOutOfStock ? (
                <AlertCircle className="w-5 h-5 text-[#DC2626]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#D97706]" />
              )}
            </div>
            <div className="space-y-0.5">
              <div className="font-semibold text-sm">
                {isOutOfStock ? "Out of Stock Condition" : "Low Stock Condition"}
                {detail.is_alert_acknowledged && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-white/80 border border-current font-medium">
                    Acknowledged
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-90">
                {isOutOfStock
                  ? `There are 0 sellable units available for immediate customer purchase.${
                      detail.quantity_reserved > 0
                        ? ` Note: ${detail.quantity_reserved} units are reserved for active checkouts.`
                        : ""
                    }`
                  : `Available sellable quantity (${detail.quantity_available}) is at or below the configured threshold of ${detail.low_stock_threshold} units.`}
              </p>
              <p className="text-[10px] opacity-75">
                Acknowledging confirms administrative awareness; it never hides the stock condition.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={handleToggleAlertAck}
              disabled={ackLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-xs ${
                detail.is_alert_acknowledged
                  ? "bg-white text-[#554243] border-[#EBE2D8] hover:bg-[#FAF6F2]"
                  : isOutOfStock
                  ? "bg-[#DC2626] text-white border-[#DC2626] hover:bg-[#B91C1C]"
                  : "bg-[#D97706] text-white border-[#D97706] hover:bg-[#B45309]"
              } disabled:opacity-50 cursor-pointer`}
              data-testid="alert-ack-button"
            >
              {detail.is_alert_acknowledged ? (
                <>
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Unacknowledge</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Acknowledge Alert</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Hero Variant Header */}
      <div className="bg-white rounded-2xl border border-[#EBE2D8] p-6 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          {/* Thumbnail / Image Preview */}
          <div className="w-16 h-20 rounded-xl bg-[#FAF6F2] border border-[#EBE2D8] overflow-hidden shrink-0 flex items-center justify-center">
            {detail.thumbnail_url ? (
              <img
                src={detail.thumbnail_url}
                alt={detail.product_name}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <Boxes className="w-6 h-6 text-[#8C7A78]/60" />
            )}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#FAF6F2] text-[#4F0012] border border-[#EBE2D8]">
                SKU: {detail.sku}
              </span>

              {detail.category_name && (
                <span className="text-[11px] text-[#8C7A78] px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200">
                  {detail.category_name}
                </span>
              )}

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                  isOutOfStock
                    ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                    : isLowStock
                    ? "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                    : "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOutOfStock
                      ? "bg-[#EF4444]"
                      : isLowStock
                      ? "bg-[#F59E0B]"
                      : "bg-[#10B981]"
                  }`}
                />
                <span>{detail.stock_status_label}</span>
              </span>
            </div>

            <h1 className="text-xl font-serif font-bold text-[#1F1B17]">
              {detail.product_name}
            </h1>

            <div className="flex items-center gap-3 text-xs text-[#554243] flex-wrap pt-0.5">
              {detail.size && (
                <span>
                  Size: <strong>{detail.size}</strong>
                </span>
              )}
              {detail.color && (
                <span>
                  Color: <strong>{detail.color}</strong>
                </span>
              )}
              <span>
                Retail Price:{" "}
                <strong>
                  ₹{Number(detail.retail_price).toLocaleString("en-IN")}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Primary Header Actions */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setIsAdjustModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-semibold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Adjust Stock</span>
          </button>

          <Link
            href={`/admin/products/${detail.product_id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white hover:bg-[#FAF6F2] border border-[#EBE2D8] text-[#554243] hover:text-[#1F1B17] text-xs font-medium rounded-xl transition-colors"
            title="Edit product details"
          >
            <span>Product Editor</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#8C7A78]" />
          </Link>

          <button
            type="button"
            onClick={() => {
              fetchDetail();
              fetchMovements();
            }}
            className="p-2.5 bg-white hover:bg-[#FAF6F2] border border-[#EBE2D8] text-[#554243] hover:text-[#1F1B17] rounded-xl transition-colors"
            title="Refresh inventory metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Authoritative Stock Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* On-Hand Stock */}
        <div className="bg-white p-5 rounded-2xl border border-[#EBE2D8] shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] space-y-1">
          <div className="flex items-center justify-between text-[#8C7A78]">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Total On-Hand
            </span>
            <Layers className="w-4 h-4 text-[#4F0012]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#1F1B17]">
            {detail.quantity_on_hand.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#8C7A78]">
            Physical units in warehouse (Avail + Reserved)
          </p>
        </div>

        {/* Reserved Stock */}
        <div className="bg-white p-5 rounded-2xl border border-[#EBE2D8] shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] space-y-1">
          <div className="flex items-center justify-between text-[#8C7A78]">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Reserved Stock
            </span>
            <Lock className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#D97706]">
            {detail.quantity_reserved.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#8C7A78]">
            Protected claims for active checkouts & orders
          </p>
        </div>

        {/* Available Stock */}
        <div className="bg-white p-5 rounded-2xl border border-[#EBE2D8] shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] space-y-1">
          <div className="flex items-center justify-between text-[#8C7A78]">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Sellable Available
            </span>
            <PackageCheck className="w-4 h-4 text-[#059669]" />
          </div>
          <div
            className={`text-2xl font-bold font-mono ${
              isOutOfStock
                ? "text-[#DC2626]"
                : isLowStock
                ? "text-[#D97706]"
                : "text-[#059669]"
            }`}
          >
            {detail.quantity_available.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-[#8C7A78]">
            Units available for immediate customer purchase
          </p>
        </div>

        {/* Stock Status & Threshold */}
        <div className="bg-white p-5 rounded-2xl border border-[#EBE2D8] shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] space-y-2">
          <div className="flex items-center justify-between text-[#8C7A78]">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Classification &amp; Threshold
            </span>
            <Boxes className="w-4 h-4 text-[#6D1826]" />
          </div>
          <div className="text-base font-serif font-bold text-[#1F1B17]">
            {detail.stock_status_label}
          </div>

          {!isEditingThreshold ? (
            <div className="pt-1 flex items-center justify-between gap-2 border-t border-[#FAF6F2]">
              <span className="text-[11px] text-[#8C7A78]">
                Threshold: <strong className="text-[#1F1B17]">{detail.low_stock_threshold} units</strong>
              </span>
              <button
                type="button"
                onClick={handleStartEditThreshold}
                className="inline-flex items-center gap-1 text-[11px] text-[#4F0012] hover:underline font-medium p-1 cursor-pointer"
                data-testid="edit-threshold-button"
              >
                <Edit2 className="w-3 h-3" />
                <span>Configure</span>
              </button>
            </div>
          ) : (
            <div className="pt-1 space-y-1.5 border-t border-[#FAF6F2]">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  className="w-20 px-2 py-1 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#4F0012] text-[#1F1B17]"
                  placeholder="0"
                  data-testid="threshold-input"
                />
                <button
                  type="button"
                  onClick={handleSaveThreshold}
                  disabled={thresholdLoading}
                  className="p-1.5 bg-[#4F0012] hover:bg-[#6D1826] text-white rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                  title="Save Threshold"
                  data-testid="save-threshold-button"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingThreshold(false)}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 text-[#554243] rounded-md transition-colors cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {thresholdError && (
                <p className="text-[10px] text-[#DC2626] font-medium">{thresholdError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Movement History Audit Ledger */}
      <AdminMovementHistoryTable
        movements={movements}
        loading={movementsLoading}
        error={movementsError}
        totalCount={movementsCount}
        currentPage={currentPage}
        pageSize={15}
        selectedType={selectedType}
        selectedReason={selectedReason}
        selectedManualFilter={selectedManualFilter}
        onPageChange={setCurrentPage}
        onTypeChange={handleTypeChange}
        onReasonChange={handleReasonChange}
        onManualFilterChange={handleManualFilterChange}
        onResetFilters={handleResetFilters}
        onRetry={fetchMovements}
      />

      {/* Stock Adjustment Modal */}
      <AdminStockAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        variantId={detail.variant_id}
        sku={detail.sku}
        productName={detail.product_name}
        currentOnHand={detail.quantity_on_hand}
        currentReserved={detail.quantity_reserved}
        currentAvailable={detail.quantity_available}
        onSuccess={handleAdjustmentSuccess}
      />
    </div>
  );
}
