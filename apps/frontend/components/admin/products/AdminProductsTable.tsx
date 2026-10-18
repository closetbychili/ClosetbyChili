"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  AlertCircle,
  Edit3,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import type { AdminProductListItem } from "@/lib/api/admin";
import { formatINR } from "@/components/admin/dashboard/DashboardMetricCard";
import ProductStatusBadge from "./ProductStatusBadge";
import ProductStockBadge from "./ProductStockBadge";

interface AdminProductsTableProps {
  products: AdminProductListItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  isFiltered: boolean;
  onResetFilters: () => void;
}

export default function AdminProductsTable({
  products,
  loading,
  error,
  onRetry,
  isFiltered,
  onResetFilters,
}: AdminProductsTableProps) {
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
              <div className="h-5 bg-[#FAF6F2] rounded-full w-20" />
              <div className="h-7 bg-[#FAF6F2] rounded-lg w-14" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. No Results State (when filters/search return 0 results)
  if (products.length === 0 && isFiltered) {
    return (
      <div className="bg-white rounded-2xl border border-[#EBE2D8] p-10 text-center shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)]">
        <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center mx-auto mb-3 text-[#8C7A78]">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-base font-serif font-bold text-[#1F1B17] mb-1">
          No matching products found
        </h3>
        <p className="text-xs text-[#554243] max-w-sm mx-auto mb-5 leading-relaxed">
          No silhouettes in your catalog match the current search term or filter criteria.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF6F2] hover:bg-[#EBE2D8] text-[#1F1B17] text-xs font-medium border border-[#EBE2D8] transition-colors"
        >
          <span>Clear all filters</span>
        </button>
      </div>
    );
  }

  // 4. Empty Catalog State (no products at all in the database)
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#EBE2D8] p-12 text-center shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)]">
        <div className="w-14 h-14 rounded-2xl bg-[#FCF2EB] border border-[#F3DEC9] flex items-center justify-center mx-auto mb-4 text-[#4F0012]">
          <Package className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-serif font-bold text-[#1F1B17] mb-1.5">
          Atelier catalog is empty
        </h3>
        <p className="text-xs text-[#554243] max-w-md mx-auto mb-6 leading-relaxed">
          Your product listing is currently empty. Get started by designing your first couture silhouette, configuring size variants, and setting inventory.
        </p>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Your First Product</span>
        </Link>
      </div>
    );
  }

  // 5. Populated Table & Responsive List
  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#EBE2D8] bg-[#FAF6F2]/40 text-[11px] font-semibold text-[#8C7A78] uppercase tracking-wider">
              <th className="py-3.5 pl-5 pr-3">Product Silhouette</th>
              <th className="py-3.5 px-3">SKU</th>
              <th className="py-3.5 px-3">Category</th>
              <th className="py-3.5 px-3 text-right">Price</th>
              <th className="py-3.5 px-3">Stock Summary</th>
              <th className="py-3.5 px-3">Status</th>
              <th className="py-3.5 px-3">Updated</th>
              <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2ECE5] text-xs">
            {products.map((product) => {
              const primaryImg = product.primary_image;
              const hasMultipleVariants = product.variant_count > 1;

              return (
                <tr
                  key={product.id}
                  className="hover:bg-[#FAF6F2]/60 transition-colors group"
                >
                  {/* Thumbnail & Product Name */}
                  <td className="py-3.5 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg bg-[#FAF6F2] border border-[#EBE2D8] overflow-hidden shrink-0 flex items-center justify-center">
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
                            +{product.variant_count - 1} more variant{product.variant_count > 2 ? "s" : ""}
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

                  {/* Status */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <ProductStatusBadge status={product.status} />
                  </td>

                  {/* Last Updated */}
                  <td className="py-3.5 px-3 whitespace-nowrap text-[#554243]">
                    {formatDate(product.updated_at)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#EBE2D8] bg-white hover:bg-[#FAF6F2] hover:border-[#D6CCC2] text-[#1F1B17] text-xs font-medium transition-colors shadow-2xs"
                      title={`Edit ${product.name}`}
                      aria-label={`Edit ${product.name}`}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#4F0012]" />
                      <span>Edit</span>
                    </Link>
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

                <ProductStatusBadge status={product.status} />
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

                <div className="text-right">
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
    </div>
  );
}
