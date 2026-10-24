"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Package,
  RotateCcw,
} from "lucide-react";
import type { AdminInventoryItem } from "@/lib/api/admin";

interface AdminInventoryTableProps {
  items: AdminInventoryItem[];
  loading: boolean;
  error: string | null;
  ordering: string;
  isFiltered: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
  onSort: (column: string) => void;
}

export default function AdminInventoryTable({
  items,
  loading,
  error,
  ordering,
  isFiltered,
  onRetry,
  onResetFilters,
  onSort,
}: AdminInventoryTableProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const renderSortIcon = (field: string) => {
    if (ordering === field) {
      return <ArrowUp className="w-3.5 h-3.5 text-[#6D1826]" />;
    }
    if (ordering === `-${field}`) {
      return <ArrowDown className="w-3.5 h-3.5 text-[#6D1826]" />;
    }
    return <ArrowUpDown className="w-3.5 h-3.5 text-[#8C7A78] opacity-50 group-hover:opacity-100" />;
  };

  const handleSortToggle = (field: string) => {
    if (ordering === field) {
      onSort(`-${field}`);
    } else {
      onSort(field);
    }
  };

  // Error State
  if (error && !loading && items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#FECACA] p-8 text-center my-6 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)]">
        <div className="w-12 h-12 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626] mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-serif font-bold text-[#1F1B17] mb-1">
          Failed to Load Inventory
        </h3>
        <p className="text-xs text-[#8C7A78] max-w-md mx-auto mb-4">
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#EBE2D8] shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#EBE2D8] bg-[#FAF6F2]/75 text-[11px] font-semibold text-[#8C7A78] uppercase tracking-wider select-none">
              {/* Product & Silhouette */}
              <th scope="col" className="py-3 pl-5 pr-3">
                <button
                  type="button"
                  onClick={() => handleSortToggle("product")}
                  className="group inline-flex items-center gap-1.5 hover:text-[#1F1B17] transition-colors font-semibold"
                >
                  <span>Product &amp; Silhouette</span>
                  {renderSortIcon("product")}
                </button>
              </th>

              {/* SKU */}
              <th scope="col" className="py-3 px-3">
                <button
                  type="button"
                  onClick={() => handleSortToggle("sku")}
                  className="group inline-flex items-center gap-1.5 hover:text-[#1F1B17] transition-colors font-semibold"
                >
                  <span>SKU</span>
                  {renderSortIcon("sku")}
                </button>
              </th>

              {/* Variant Attributes */}
              <th scope="col" className="py-3 px-3">
                Variant Attributes
              </th>

              {/* On-Hand Quantity */}
              <th scope="col" className="py-3 px-3 text-right">
                On-Hand
              </th>

              {/* Reserved Quantity */}
              <th scope="col" className="py-3 px-3 text-right">
                Reserved
              </th>

              {/* Available Quantity */}
              <th scope="col" className="py-3 px-3 text-right">
                <button
                  type="button"
                  onClick={() => handleSortToggle("available")}
                  className="group inline-flex items-center gap-1.5 hover:text-[#1F1B17] transition-colors font-semibold ml-auto"
                >
                  <span>Available</span>
                  {renderSortIcon("available")}
                </button>
              </th>

              {/* Stock Status */}
              <th scope="col" className="py-3 px-3 text-center">
                Stock Status
              </th>

              {/* Last Movement */}
              <th scope="col" className="py-3 px-3">
                <button
                  type="button"
                  onClick={() => handleSortToggle("last_movement")}
                  className="group inline-flex items-center gap-1.5 hover:text-[#1F1B17] transition-colors font-semibold"
                >
                  <span>Last Movement</span>
                  {renderSortIcon("last_movement")}
                </button>
              </th>

              {/* Actions */}
              <th scope="col" className="py-3 pl-3 pr-5 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#EBE2D8]/60 text-xs">
            {/* Loading Skeletons */}
            {loading &&
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  <td className="py-3.5 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#FAF6F2] shrink-0" />
                      <div className="space-y-1.5">
                        <div className="w-32 h-3.5 bg-[#FAF6F2] rounded" />
                        <div className="w-20 h-2.5 bg-[#FAF6F2] rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="w-24 h-3 bg-[#FAF6F2] rounded font-mono" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="w-20 h-3 bg-[#FAF6F2] rounded" />
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="w-10 h-3 bg-[#FAF6F2] rounded ml-auto" />
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="w-8 h-3 bg-[#FAF6F2] rounded ml-auto" />
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="w-10 h-3 bg-[#FAF6F2] rounded ml-auto" />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <div className="w-16 h-5 bg-[#FAF6F2] rounded-full mx-auto" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="w-24 h-3 bg-[#FAF6F2] rounded" />
                  </td>
                  <td className="py-3.5 pl-3 pr-5 text-right">
                    <div className="w-16 h-4 bg-[#FAF6F2] rounded ml-auto" />
                  </td>
                </tr>
              ))}

            {/* Empty State */}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center text-[#8C7A78] mx-auto mb-3">
                    <Package className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-serif font-bold text-[#1F1B17] mb-1">
                    No Inventory Items Found
                  </h4>
                  <p className="text-xs text-[#8C7A78] max-w-sm mx-auto mb-4">
                    {isFiltered
                      ? "No stock records matched your active search and filter criteria."
                      : "No variant inventory records exist yet in the atelier ledger."}
                  </p>
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={onResetFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6D1826] bg-[#6D1826]/5 hover:bg-[#6D1826]/10 border border-[#6D1826]/20 rounded-lg transition-colors font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear All Filters</span>
                    </button>
                  )}
                </td>
              </tr>
            )}

            {/* Table Rows */}
            {!loading &&
              items.map((item) => {
                const isOutOfStock = item.stock_status === "out_of_stock";
                const isLowStock = item.stock_status === "low_stock";

                return (
                  <tr
                    key={item.id || item.variant_id}
                    className="hover:bg-[#FAF6F2]/50 transition-colors group"
                  >
                    {/* Product & Silhouette */}
                    <td className="py-3.5 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg bg-[#FAF6F2] border border-[#EBE2D8] overflow-hidden shrink-0 flex items-center justify-center">
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Package className="w-4 h-4 text-[#8C7A78]" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0 max-w-xs">
                          <Link
                            href={`/admin/products/${item.product_id}/edit`}
                            className="font-medium text-[#1F1B17] truncate font-serif text-xs sm:text-sm hover:text-[#4F0012] transition-colors"
                            title={item.product_name}
                          >
                            {item.product_name}
                          </Link>
                          {item.category_name && (
                            <span className="text-[10px] text-[#8C7A78] truncate">
                              {item.category_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <Link
                        href={`/admin/inventory/${item.variant_id}`}
                        className="font-mono text-xs text-[#1F1B17] font-medium bg-[#FAF6F2] hover:bg-[#EBE2D8] px-2 py-0.5 rounded border border-[#EBE2D8] transition-colors"
                        title="View inventory detail & movement history"
                      >
                        {item.sku}
                      </Link>
                    </td>

                    {/* Variant Attributes */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.size && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#FAF6F2] text-[#554243] border border-[#EBE2D8]">
                            Size: {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#FAF6F2] text-[#554243] border border-[#EBE2D8]">
                            Color: {item.color}
                          </span>
                        )}
                        {!item.size && !item.color && (
                          <span className="text-[#8C7A78]">—</span>
                        )}
                      </div>
                    </td>

                    {/* On-Hand Quantity */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap font-medium text-[#1F1B17]">
                      {item.quantity_on_hand.toLocaleString("en-IN")}
                    </td>

                    {/* Reserved Quantity */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap font-medium">
                      {item.quantity_reserved > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                          {item.quantity_reserved}
                        </span>
                      ) : (
                        <span className="text-[#8C7A78]">0</span>
                      )}
                    </td>

                    {/* Available Quantity */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap font-semibold">
                      <span
                        className={
                          isOutOfStock
                            ? "text-[#DC2626]"
                            : isLowStock
                            ? "text-[#D97706]"
                            : "text-[#059669]"
                        }
                      >
                        {item.quantity_available.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-[#8C7A78] block font-normal">
                        Thr: {item.low_stock_threshold ?? 5}
                      </span>
                    </td>

                    {/* Stock Status */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div>
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                            <span>Out of Stock</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                            <span>In Stock</span>
                          </span>
                        )}
                        {item.is_alert_acknowledged && (isLowStock || isOutOfStock) && (
                          <span className="text-[9px] font-medium text-[#8C7A78] bg-[#FAF6F2] border border-[#EBE2D8] px-1.5 py-0.5 rounded-full block mx-auto mt-1 max-w-fit">
                            Ack&apos;d
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Last Movement */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {item.last_movement ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-[#1F1B17]">
                            {item.last_movement.movement_type_display}
                            <span className="text-[10px] text-[#8C7A78] ml-1">
                              ({item.last_movement.quantity_change > 0 ? "+" : ""}
                              {item.last_movement.quantity_change})
                            </span>
                          </span>
                          <span className="text-[10px] text-[#8C7A78]">
                            {formatDate(item.last_movement.created_at)}
                          </span>
                        </div>
                      ) : item.last_movement_at ? (
                        <span className="text-[#8C7A78]">
                          {formatDate(item.last_movement_at)}
                        </span>
                      ) : (
                        <span className="text-[#8C7A78]">No movements</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/inventory/${item.variant_id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-[#4F0012] hover:bg-[#6D1826] rounded-md transition-colors shadow-xs"
                          title="Adjust stock and view audit history"
                        >
                          <span>Adjust</span>
                        </Link>
                        <Link
                          href={`/admin/products/${item.product_id}/edit`}
                          className="inline-flex items-center gap-1 text-[11px] text-[#8C7A78] hover:text-[#4F0012] p-1 rounded hover:bg-[#FAF6F2] transition-colors"
                          title="View Product in Editor"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
