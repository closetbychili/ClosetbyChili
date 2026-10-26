"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Edit2,
  Power,
  PowerOff,
  History,
  Tag,
  Calendar,
  Sparkles,
  Layers,
} from "lucide-react";
import type { AdminCoupon } from "@/lib/api/admin";

interface AdminCouponsTableProps {
  coupons: AdminCoupon[];
  onSelectCoupon: (coupon: AdminCoupon) => void;
  onEditCoupon: (coupon: AdminCoupon) => void;
  onToggleStatus: (coupon: AdminCoupon) => void;
}

export default function AdminCouponsTable({
  coupons,
  onSelectCoupon,
  onEditCoupon,
  onToggleStatus,
}: AdminCouponsTableProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatCurrency = (val: string | null | undefined, currency = "INR") => {
    if (!val) return "None";
    const num = parseFloat(val);
    if (isNaN(num)) return "None";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Ongoing (No expiry)";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const renderLifecycleBadge = (lifecycle: AdminCoupon["lifecycle_status"], isActive: boolean) => {
    if (!isActive || lifecycle === "INACTIVE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Inactive
        </span>
      );
    }
    switch (lifecycle) {
      case "CURRENTLY_VALID":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Currently Valid
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Scheduled
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
            {lifecycle}
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-stone-600 border-collapse">
          <thead className="bg-stone-50 border-b border-stone-200 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <tr>
              <th scope="col" className="px-5 py-3.5">Code & Campaign</th>
              <th scope="col" className="px-5 py-3.5">Discount</th>
              <th scope="col" className="px-5 py-3.5">Min Order</th>
              <th scope="col" className="px-5 py-3.5">Validity Window</th>
              <th scope="col" className="px-5 py-3.5">Usage & Rules</th>
              <th scope="col" className="px-5 py-3.5">Status</th>
              <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {coupons.map((coupon) => (
              <tr
                key={coupon.id}
                onClick={() => onSelectCoupon(coupon)}
                className="hover:bg-stone-50/70 transition cursor-pointer group"
              >
                {/* Code & Campaign */}
                <td className="px-5 py-4">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-stone-100 text-stone-700 group-hover:bg-stone-200 transition">
                      <Tag className="w-4 h-4 text-stone-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900 tracking-wide text-sm bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(coupon.code, e)}
                          title="Copy coupon code"
                          className="text-stone-400 hover:text-stone-700 p-1 rounded transition"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="font-medium text-stone-900 mt-1 line-clamp-1">
                        {coupon.name}
                      </div>
                      {coupon.description && (
                        <div className="text-xs text-stone-400 line-clamp-1 mt-0.5">
                          {coupon.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Discount */}
                <td className="px-5 py-4">
                  <div className="font-semibold text-stone-900">
                    {coupon.discount_type === "PERCENTAGE" ? (
                      <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {parseFloat(coupon.discount_value)}% OFF
                      </span>
                    ) : (
                      <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {formatCurrency(coupon.discount_value, coupon.currency)} OFF
                      </span>
                    )}
                  </div>
                  {coupon.discount_type === "PERCENTAGE" && coupon.max_discount_amount && (
                    <div className="text-xs text-stone-400 mt-1">
                      Max discount: {formatCurrency(coupon.max_discount_amount, coupon.currency)}
                    </div>
                  )}
                </td>

                {/* Min Order Subtotal */}
                <td className="px-5 py-4 font-medium text-stone-700">
                  {coupon.min_order_subtotal && parseFloat(coupon.min_order_subtotal) > 0 ? (
                    formatCurrency(coupon.min_order_subtotal, coupon.currency)
                  ) : (
                    <span className="text-stone-400 text-xs">No minimum</span>
                  )}
                </td>

                {/* Validity Window */}
                <td className="px-5 py-4 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-700">
                    <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>From: {formatDate(coupon.start_date)}</span>
                  </div>
                  <div className="text-stone-500 mt-0.5 pl-5">
                    Until: {formatDate(coupon.end_date)}
                  </div>
                </td>

                {/* Usage & Rules */}
                <td className="px-5 py-4 text-xs space-y-1">
                  <div>
                    <span className="text-stone-400">Usage: </span>
                    <span className="font-semibold text-stone-800">
                      {coupon.total_redemptions ?? coupon.usage_count ?? 0}
                      {coupon.usage_limit ? ` / ${coupon.usage_limit}` : " (Unlimited)"}
                    </span>
                    {coupon.remaining_capacity !== undefined && coupon.remaining_capacity !== null && (
                      <span className="ml-1 text-[11px] text-stone-500 font-normal">
                        ({coupon.remaining_capacity} left)
                      </span>
                    )}
                  </div>
                  {coupon.per_customer_limit && (
                    <div>
                      <span className="text-stone-400">Per user: </span>
                      <span className="font-medium text-stone-800">
                        {coupon.per_customer_limit} max
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                      <Layers className="w-3 h-3 text-stone-500" />
                      {coupon.target_summary || (coupon.targeting_mode === "ALL_PRODUCTS" ? "All Products" : coupon.targeting_mode)}
                    </span>
                    {coupon.is_first_order_only && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        <Sparkles className="w-3 h-3" />
                        1st Order Only
                      </span>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  {renderLifecycleBadge(coupon.lifecycle_status, coupon.is_active)}
                </td>

                {/* Actions */}
                <td className="px-5 py-4 text-right">
                  <div
                    className="flex items-center justify-end gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* View Details / History */}
                    <button
                      type="button"
                      onClick={() => onSelectCoupon(coupon)}
                      title="Inspect details and audit trail"
                      className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => onEditCoupon(coupon)}
                      title="Edit coupon"
                      className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Activate / Deactivate */}
                    <button
                      type="button"
                      onClick={() => onToggleStatus(coupon)}
                      title={coupon.is_active ? "Deactivate coupon" : "Activate coupon"}
                      className={`p-1.5 rounded-lg transition ${
                        coupon.is_active
                          ? "text-stone-500 hover:text-rose-600 hover:bg-rose-50"
                          : "text-stone-500 hover:text-emerald-600 hover:bg-emerald-50"
                      }`}
                    >
                      {coupon.is_active ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
