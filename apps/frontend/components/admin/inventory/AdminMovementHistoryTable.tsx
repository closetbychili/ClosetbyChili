"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Filter,
  History,
  Info,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import type { AdminInventoryMovement } from "@/lib/api/admin";

export interface AdminMovementHistoryTableProps {
  movements: AdminInventoryMovement[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  selectedType: string;
  selectedReason: string;
  selectedManualFilter: string;
  onPageChange: (newPage: number) => void;
  onTypeChange: (type: string) => void;
  onReasonChange: (reason: string) => void;
  onManualFilterChange: (manual: string) => void;
  onResetFilters: () => void;
  onRetry: () => void;
}

const MOVEMENT_TYPES = [
  { value: "all", label: "All Movement Types" },
  { value: "manual_adjustment", label: "Manual Adjustment" },
  { value: "stock_received", label: "Stock Received" },
  { value: "order_reserved", label: "Order Reserved" },
  { value: "order_fulfilled", label: "Order Fulfilled" },
  { value: "reservation_released", label: "Reservation Released" },
  { value: "return_received", label: "Return Received" },
  { value: "damaged", label: "Damaged / Discarded" },
];

const REASON_CODES = [
  { value: "all", label: "All Reason Codes" },
  { value: "received_stock", label: "Received Stock" },
  { value: "damaged_goods", label: "Damaged Goods" },
  { value: "lost_or_missing", label: "Lost or Missing" },
  { value: "count_correction", label: "Stock Count Correction" },
  { value: "return_received", label: "Return Received" },
  { value: "other", label: "Other" },
];

export default function AdminMovementHistoryTable({
  movements,
  loading,
  error,
  totalCount,
  currentPage,
  pageSize,
  selectedType,
  selectedReason,
  selectedManualFilter,
  onPageChange,
  onTypeChange,
  onReasonChange,
  onManualFilterChange,
  onResetFilters,
  onRetry,
}: AdminMovementHistoryTableProps) {
  const [showFilters, setShowFilters] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const isFiltered =
    selectedType !== "all" ||
    selectedReason !== "all" ||
    selectedManualFilter !== "all";

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] overflow-hidden">
      {/* Table Header / Action Bar */}
      <div className="p-5 border-b border-[#EBE2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF6F2]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#4F0012]/5 border border-[#4F0012]/15 flex items-center justify-center text-[#4F0012]">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-[#1F1B17]">
              Inventory Movement Audit History
            </h3>
            <p className="text-[11px] text-[#8C7A78]">
              Authoritative, immutable transaction ledger ({totalCount} total events)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isFiltered || showFilters
                ? "bg-[#4F0012] text-white border-[#4F0012]"
                : "bg-white text-[#554243] border-[#EBE2D8] hover:bg-[#FAF6F2]"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Movements</span>
            {isFiltered && (
              <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
            )}
          </button>

          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-[#8C7A78] hover:text-[#1F1B17] hover:bg-white border border-transparent hover:border-[#EBE2D8] transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Filter Bar */}
      {showFilters && (
        <div className="p-4 bg-white border-b border-[#EBE2D8] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
          {/* Movement Type Filter */}
          <div>
            <label className="block text-[11px] font-medium text-[#8C7A78] mb-1">
              Movement Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-xs text-[#1F1B17] focus:outline-hidden focus:border-[#4F0012]"
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason Code Filter */}
          <div>
            <label className="block text-[11px] font-medium text-[#8C7A78] mb-1">
              Reason Code
            </label>
            <select
              value={selectedReason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-xs text-[#1F1B17] focus:outline-hidden focus:border-[#4F0012]"
            >
              {REASON_CODES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Source Type Filter */}
          <div>
            <label className="block text-[11px] font-medium text-[#8C7A78] mb-1">
              Source Origin
            </label>
            <select
              value={selectedManualFilter}
              onChange={(e) => onManualFilterChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-xs text-[#1F1B17] focus:outline-hidden focus:border-[#4F0012]"
            >
              <option value="all">All Origins (Manual + System)</option>
              <option value="manual">Manual Adjustments Only</option>
              <option value="automated">System Automated Only</option>
            </select>
          </div>
        </div>
      )}

      {/* Immutable Notice Banner */}
      <div className="px-5 py-2.5 bg-[#FAF6F2]/80 border-b border-[#EBE2D8] flex items-center gap-2 text-[11px] text-[#8C7A78]">
        <Info className="w-3.5 h-3.5 text-[#6D1826] shrink-0" />
        <span>
          Inventory audit records cannot be edited or deleted. Discrepancy
          corrections must be recorded as new movements.
        </span>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#EBE2D8] bg-[#FAF6F2]/40 text-[#8C7A78] font-medium uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-3">Movement Type</th>
              <th className="py-3 px-3">Reason / Details</th>
              <th className="py-3 px-3 text-right">Quantity Delta</th>
              <th className="py-3 px-3 text-right">Resulting Stock</th>
              <th className="py-3 px-3">Actor / Origin</th>
              <th className="py-3 px-4">Reference & Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBE2D8]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3 px-4">
                    <div className="h-4 bg-[#EBE2D8] rounded w-28" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-4 bg-[#EBE2D8] rounded w-24" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-4 bg-[#EBE2D8] rounded w-20" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="h-4 bg-[#EBE2D8] rounded w-12 ml-auto" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="h-4 bg-[#EBE2D8] rounded w-12 ml-auto" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-4 bg-[#EBE2D8] rounded w-24" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-4 bg-[#EBE2D8] rounded w-32" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-[#DC2626]">
                  <p className="font-medium mb-2">{error}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="px-3 py-1 bg-[#4F0012] text-white text-xs rounded-md"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-center text-xs text-[#8C7A78]"
                >
                  <Clock className="w-6 h-6 mx-auto mb-2 text-[#8C7A78]/50" />
                  <p className="font-medium text-[#1F1B17]">
                    No inventory movements recorded
                  </p>
                  <p className="text-[11px] text-[#8C7A78] mt-0.5">
                    {isFiltered
                      ? "Try adjusting your filter criteria."
                      : "Stock adjustments, sales, and fulfillment will appear here."}
                  </p>
                </td>
              </tr>
            ) : (
              movements.map((mov) => {
                const isPositive = mov.quantity_change > 0;
                const isNegative = mov.quantity_change < 0;
                const isManual =
                  mov.is_manual ??
                  mov.movement_type === "manual_adjustment";

                return (
                  <tr
                    key={mov.id}
                    className="hover:bg-[#FAF6F2]/50 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap text-[#554243] font-mono text-[11px]">
                      {formatDate(mov.created_at)}
                    </td>

                    {/* Movement Type Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            isManual
                              ? "bg-[#FAF6F2] text-[#4F0012] border-[#EBE2D8]"
                              : mov.movement_type === "stock_received"
                              ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                              : mov.movement_type === "order_fulfilled"
                              ? "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]"
                              : "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]"
                          }`}
                        >
                          {mov.movement_type_display || mov.movement_type}
                        </span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-3 whitespace-nowrap text-[#1F1B17] font-medium">
                      {mov.reason_display || mov.reason_code ? (
                        <span className="capitalize">
                          {mov.reason_display || mov.reason_code?.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-[#8C7A78] italic">—</span>
                      )}
                    </td>

                    {/* Quantity Delta */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          isPositive
                            ? "text-[#059669]"
                            : isNegative
                            ? "text-[#DC2626]"
                            : "text-[#8C7A78]"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : isNegative ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : null}
                        {isPositive ? `+${mov.quantity_change}` : mov.quantity_change}
                      </span>
                    </td>

                    {/* Resulting Stock */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-[#1F1B17] font-medium">
                      {mov.resulting_quantity !== null &&
                      mov.resulting_quantity !== undefined ? (
                        `${mov.resulting_quantity} units`
                      ) : (
                        <span className="text-[#8C7A78]">—</span>
                      )}
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-3 whitespace-nowrap text-[11px]">
                      {mov.actor_email ? (
                        <div className="flex items-center gap-1 text-[#1F1B17]">
                          <UserCheck className="w-3 h-3 text-[#4F0012]" />
                          <span className="truncate max-w-35" title={mov.actor_email}>
                            {mov.actor_email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#8C7A78]">System (Automated)</span>
                      )}
                    </td>

                    {/* Reference / Notes */}
                    <td className="py-3 px-4 text-[#554243] text-[11px] max-w-xs">
                      <div className="truncate" title={mov.note || mov.reference}>
                        {mov.note || mov.reference || "—"}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-3.5 border-t border-[#EBE2D8] flex items-center justify-between text-xs bg-[#FAF6F2]">
        <div className="text-[#8C7A78] text-[11px]">
          Showing Page <strong className="text-[#1F1B17]">{currentPage}</strong> of{" "}
          <strong className="text-[#1F1B17]">{totalPages}</strong> ({totalCount}{" "}
          movements)
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-3 py-1.5 rounded-lg border border-[#EBE2D8] bg-white text-[#554243] hover:text-[#1F1B17] hover:bg-[#FAF6F2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-3 py-1.5 rounded-lg border border-[#EBE2D8] bg-white text-[#554243] hover:text-[#1F1B17] hover:bg-[#FAF6F2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
