"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  CheckCircle2,
  Edit3,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  type AdminProductListItem,
  publishAdminProduct,
  archiveAdminProduct,
  draftAdminProduct,
} from "@/lib/api/admin";
import { formatINR } from "@/components/admin/dashboard/DashboardMetricCard";
import ProductStatusBadge from "./ProductStatusBadge";
import ProductStockBadge from "./ProductStockBadge";

interface AdminProductsTableProps {
  products: AdminProductListItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onRefresh?: () => void;
  isFiltered: boolean;
  onResetFilters: () => void;
}

interface ActionModalState {
  isOpen: boolean;
  type: "publish" | "archive" | "draft";
  product: AdminProductListItem | null;
  loading: boolean;
  error: string | null;
}

export default function AdminProductsTable({
  products,
  loading,
  error,
  onRetry,
  onRefresh,
  isFiltered,
  onResetFilters,
}: AdminProductsTableProps) {
  const [actionModal, setActionModal] = useState<ActionModalState>({
    isOpen: false,
    type: "publish",
    product: null,
    loading: false,
    error: null,
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (minPrice: string | null, maxPrice: string | null) => {
    if (!minPrice) return "—";
    if (!maxPrice || minPrice === maxPrice) {
      return formatINR(minPrice);
    }
    return `${formatINR(minPrice)} – ${formatINR(maxPrice)}`;
  };

  const openActionModal = (
    type: "publish" | "archive" | "draft",
    product: AdminProductListItem
  ) => {
    setActionModal({
      isOpen: true,
      type,
      product,
      loading: false,
      error: null,
    });
  };

  const closeActionModal = () => {
    setActionModal({
      isOpen: false,
      type: "publish",
      product: null,
      loading: false,
      error: null,
    });
  };

  const handleConfirmAction = async () => {
    if (!actionModal.product) return;
    setActionModal((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (actionModal.type === "publish") {
        await publishAdminProduct(actionModal.product.id);
      } else if (actionModal.type === "archive") {
        await archiveAdminProduct(actionModal.product.id);
      } else if (actionModal.type === "draft") {
        await draftAdminProduct(actionModal.product.id);
      }
      closeActionModal();
      onRefresh?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update product lifecycle status.";
      setActionModal((prev) => ({ ...prev, loading: false, error: message }));
    }
  };

  // 1. Error State
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-[#FECACA] p-8 text-center shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)]">
        <div className="w-12 h-12 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center mx-auto mb-3 text-[#DC2626]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[#1F1B17] mb-1">
          Failed to load atelier catalog
        </h3>
        <p className="text-xs text-[#DC2626] max-w-md mx-auto mb-4">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry loading</span>
        </button>
      </div>
    );
  }

  // 2. Loading State Skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] overflow-hidden">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-[#FAF6F2] rounded w-1/4 mb-6" />
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-[#F2ECE5] gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#FAF6F2]" />
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-[#FAF6F2] rounded w-36" />
                  <div className="h-2.5 bg-[#FAF6F2] rounded w-24" />
                </div>
              </div>
              <div className="h-3 bg-[#FAF6F2] rounded w-20 hidden sm:block" />
              <div className="h-3 bg-[#FAF6F2] rounded w-16 hidden md:block" />
              <div className="h-3 bg-[#FAF6F2] rounded w-16" />
              <div className="h-8 bg-[#FAF6F2] rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Zero / Empty State
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#EBE2D8] p-12 text-center shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)]">
        <div className="w-14 h-14 rounded-2xl bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center mx-auto mb-4 text-[#8C7A78]">
          <Package className="w-7 h-7" />
        </div>
        <h3 className="font-serif text-base font-semibold text-[#1F1B17] mb-1">
          {isFiltered ? "No matching products found" : "Atelier catalog is empty"}
        </h3>
        <p className="text-xs text-[#8C7A78] max-w-sm mx-auto mb-5 leading-relaxed">
          {isFiltered
            ? "No products match your current search and filter criteria. Try adjusting or clearing the filters."
            : "Your couture atelier collection is currently empty. Create your first product silhouette to begin."}
        </p>

        {isFiltered ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Clear all filters</span>
          </button>
        ) : (
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Product</span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] overflow-hidden">
      {/* Desktop / Tablet Table Layout */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#EBE2D8] bg-[#FAF6F2]/70 text-[#8C7A78] uppercase tracking-wider font-semibold text-[10px]">
              <th className="py-3.5 pl-5 pr-3">Product Silhouette</th>
              <th className="py-3.5 px-3">SKU</th>
              <th className="py-3.5 px-3">Category & Collections</th>
              <th className="py-3.5 px-3 text-right">Price Range</th>
              <th className="py-3.5 px-3">Inventory</th>
              <th className="py-3.5 px-3">Status & Readiness</th>
              <th className="py-3.5 px-3">Last Updated</th>
              <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2ECE5]">
            {products.map((product) => {
              const primaryImg = product.primary_image;
              const hasMultipleVariants = product.variant_count > 1;
              const readiness = product.readiness;

              return (
                <tr
                  key={product.id}
                  className="hover:bg-[#FAF6F2]/50 transition-colors group"
                >
                  {/* Product Silhouette & Thumbnail */}
                  <td className="py-3.5 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-lg bg-[#FAF6F2] border border-[#EBE2D8] overflow-hidden shrink-0 flex items-center justify-center">
                        {primaryImg?.image_url ? (
                          <img
                            src={primaryImg.image_url}
                            alt={primaryImg.alt_text || product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-[#8C7A78]" />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0 max-w-xs">
                        <span
                          className="font-medium text-[#1F1B17] truncate font-serif text-sm group-hover:text-[#4F0012] transition-colors"
                          title={product.name}
                        >
                          {product.name}
                        </span>
                        <span className="font-mono text-[10px] text-[#8C7A78] truncate">
                          /{product.slug}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {product.sku ? (
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-[#1F1B17] font-medium">
                          {product.sku}
                        </span>
                        {hasMultipleVariants && (
                          <span className="text-[10px] text-[#8C7A78]">
                            +{product.variant_count - 1} more variant
                            {product.variant_count > 2 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#8C7A78]">—</span>
                    )}
                  </td>

                  {/* Category & Collection tags */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium text-[#1F1B17]">
                        {product.category?.name || "Uncategorized"}
                      </span>
                      {product.collections.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-[#6D1826]" />
                          <span className="text-[10px] text-[#6D1826] truncate max-w-28">
                            {product.collections.map((c) => c.name).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-3 text-right whitespace-nowrap font-medium text-[#1F1B17]">
                    {formatPrice(product.min_price, product.max_price)}
                  </td>

                  {/* Stock Summary */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <ProductStockBadge stockSummary={product.stock_summary} />
                  </td>

                  {/* Status & Server-Authoritative Readiness */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <ProductStatusBadge status={product.status} />
                      {product.status === "draft" && readiness && (
                        readiness.is_ready ? (
                          <span
                            data-testid="badge-ready-to-publish"
                            className="inline-flex items-center gap-1 text-[10px] text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full font-medium"
                          >
                            <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                            Ready to Publish
                          </span>
                        ) : (
                          <span
                            data-testid="badge-readiness-issues"
                            className="inline-flex items-center gap-1 text-[10px] text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full font-medium"
                          >
                            <AlertTriangle className="w-3 h-3 text-[#D97706]" />
                            {readiness.total_errors} issue{readiness.total_errors === 1 ? "" : "s"}
                          </span>
                        )
                      )}
                    </div>
                  </td>

                  {/* Last Updated */}
                  <td className="py-3.5 px-3 whitespace-nowrap text-[#554243]">
                    {formatDate(product.updated_at)}
                  </td>

                  {/* Quick Actions */}
                  <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      {/* Publish action for drafts that are ready */}
                      {product.status === "draft" && readiness?.is_ready && (
                        <button
                          type="button"
                          data-testid="quick-publish-btn"
                          onClick={() => openActionModal("publish", product)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors shadow-2xs"
                          title={`Publish ${product.name}`}
                        >
                          <Send className="w-3 h-3" />
                          <span>Publish</span>
                        </button>
                      )}

                      {/* Archive action for active products */}
                      {product.status === "active" && (
                        <button
                          type="button"
                          data-testid="quick-archive-btn"
                          onClick={() => openActionModal("archive", product)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#FECACA] hover:bg-[#FEF2F2] text-[#DC2626] text-xs font-medium transition-colors shadow-2xs"
                          title={`Archive ${product.name}`}
                        >
                          <Archive className="w-3 h-3" />
                          <span>Archive</span>
                        </button>
                      )}

                      {/* Restore to Draft for archived products */}
                      {product.status === "archived" && (
                        <button
                          type="button"
                          data-testid="quick-draft-btn"
                          onClick={() => openActionModal("draft", product)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EBE2D8] hover:bg-[#FAF6F2] text-[#1F1B17] text-xs font-medium transition-colors shadow-2xs"
                          title={`Restore ${product.name} to Draft`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Draft</span>
                        </button>
                      )}

                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        data-testid="edit-product-btn"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#EBE2D8] bg-white hover:bg-[#FAF6F2] hover:border-[#D6CCC2] text-[#1F1B17] text-xs font-medium transition-colors shadow-2xs"
                        title={`Edit ${product.name}`}
                        aria-label={`Edit ${product.name}`}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#4F0012]" />
                        <span>Edit</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile & Tablet Card Layout */}
      <div className="lg:hidden divide-y divide-[#F2ECE5]">
        {products.map((product) => {
          const primaryImg = product.primary_image;
          const hasMultipleVariants = product.variant_count > 1;
          const readiness = product.readiness;

          return (
            <div key={product.id} className="p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="relative w-14 h-14 rounded-lg bg-[#FAF6F2] border border-[#EBE2D8] overflow-hidden shrink-0 flex items-center justify-center">
                    {primaryImg?.image_url ? (
                      <img
                        src={primaryImg.image_url}
                        alt={primaryImg.alt_text || product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-[#8C7A78]" />
                    )}
                  </div>

                  <div className="flex flex-col">
                    <h3 className="font-serif font-semibold text-sm text-[#1F1B17] leading-tight">
                      {product.name}
                    </h3>
                    <span className="font-mono text-[10px] text-[#8C7A78] mt-0.5">
                      {product.sku || product.slug}
                      {hasMultipleVariants && ` (+${product.variant_count - 1} more)`}
                    </span>
                    <span className="text-xs text-[#554243] mt-1 font-medium">
                      {product.category?.name || "Uncategorized"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <ProductStatusBadge status={product.status} />
                  {product.status === "draft" && readiness && (
                    readiness.is_ready ? (
                      <span className="text-[10px] text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full font-medium">
                        Ready
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full font-medium">
                        {readiness.total_errors} issue{readiness.total_errors === 1 ? "" : "s"}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#F2ECE5]/60 text-xs">
                <div>
                  <span className="text-[#8C7A78] text-[11px] block">Price</span>
                  <span className="font-semibold text-[#1F1B17]">
                    {formatPrice(product.min_price, product.max_price)}
                  </span>
                </div>

                <div>
                  <span className="text-[#8C7A78] text-[11px] block mb-0.5">Inventory</span>
                  <ProductStockBadge stockSummary={product.stock_summary} />
                </div>

                <div className="flex items-center gap-1.5 text-right">
                  {product.status === "draft" && readiness?.is_ready && (
                    <button
                      type="button"
                      onClick={() => openActionModal("publish", product)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium"
                    >
                      <Send className="w-3 h-3" />
                      <span>Publish</span>
                    </button>
                  )}

                  {product.status === "active" && (
                    <button
                      type="button"
                      onClick={() => openActionModal("archive", product)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#FECACA] text-[#DC2626] text-xs font-medium"
                    >
                      <Archive className="w-3 h-3" />
                      <span>Archive</span>
                    </button>
                  )}

                  {product.status === "archived" && (
                    <button
                      type="button"
                      onClick={() => openActionModal("draft", product)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EBE2D8] text-[#1F1B17] text-xs font-medium"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Draft</span>
                    </button>
                  )}

                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#EBE2D8] bg-[#FAF6F2] hover:bg-[#EBE2D8] text-[#1F1B17] text-xs font-medium transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#4F0012]" />
                    <span>Edit</span>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {actionModal.isOpen && actionModal.product && (
        <div
          role="dialog"
          aria-modal="true"
          data-lenis-prevent="true"
          data-testid="lifecycle-confirm-modal"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EBE2D8] space-y-4 overscroll-contain">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1F1B17]">
                {actionModal.type === "publish"
                  ? "Publish Product"
                  : actionModal.type === "archive"
                  ? "Archive Product"
                  : "Restore to Draft"}
              </h3>
              <button
                type="button"
                onClick={closeActionModal}
                disabled={actionModal.loading}
                className="p-1 rounded-lg text-[#8C7A78] hover:text-[#1F1B17] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#554243] leading-relaxed">
              {actionModal.type === "publish" && (
                <>
                  Are you sure you want to publish <strong>&ldquo;{actionModal.product.name}&rdquo;</strong>?
                  It will immediately become active and visible for customers to purchase on the public catalog.
                </>
              )}
              {actionModal.type === "archive" && (
                <>
                  Are you sure you want to archive <strong>&ldquo;{actionModal.product.name}&rdquo;</strong>?
                  Archived products are hidden from all public store listings and search results.
                </>
              )}
              {actionModal.type === "draft" && (
                <>
                  Move <strong>&ldquo;{actionModal.product.name}&rdquo;</strong> back to draft?
                  It will remain hidden from the public storefront while under review.
                </>
              )}
            </p>

            {actionModal.error && (
              <div
                role="alert"
                className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626] flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{actionModal.error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={actionModal.loading}
                onClick={closeActionModal}
                className="px-4 py-2 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                data-testid="modal-confirm-btn"
                disabled={actionModal.loading}
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                  actionModal.type === "publish"
                    ? "bg-[#059669] hover:bg-[#047857]"
                    : actionModal.type === "archive"
                    ? "bg-[#DC2626] hover:bg-[#B91C1C]"
                    : "bg-[#4F0012] hover:bg-[#6D1826]"
                }`}
              >
                {actionModal.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {actionModal.loading
                    ? "Processing..."
                    : actionModal.type === "publish"
                    ? "Confirm Publish"
                    : actionModal.type === "archive"
                    ? "Confirm Archive"
                    : "Confirm Restore"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
