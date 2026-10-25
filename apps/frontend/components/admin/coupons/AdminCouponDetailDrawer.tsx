"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  History,
  Tag,
  Sparkles,
  Edit2,
  Power,
  PowerOff,
  User,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  getAdminCouponDetail,
  type AdminCouponDetail,
  type AdminCoupon,
} from "@/lib/api/admin";

interface AdminCouponDetailDrawerProps {
  isOpen: boolean;
  couponId: string | null;
  onClose: () => void;
  onEdit: (coupon: AdminCoupon) => void;
  onToggleStatus: (coupon: AdminCoupon) => void;
}

export default function AdminCouponDetailDrawer({
  isOpen,
  couponId,
  onClose,
  onEdit,
  onToggleStatus,
}: AdminCouponDetailDrawerProps) {
  const [coupon, setCoupon] = useState<AdminCouponDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !couponId) {
      return;
    }

    let isMounted = true;
    async function loadDetail() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getAdminCouponDetail(couponId!);
        if (isMounted) {
          setCoupon(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            (err as { message?: string })?.message || "Failed to load coupon details.";
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [isOpen, couponId]);

  if (!isOpen) return null;

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
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-stone-200 flex flex-col">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-stone-900 text-white rounded-xl shadow-sm">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-stone-900">
                    {coupon?.code || "Coupon Details"}
                  </span>
                  {coupon && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                        coupon.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {coupon.lifecycle_status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {coupon?.name || "Promotional Rule & Audit Timeline"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-stone-900" />
                <p className="text-sm font-medium">Loading coupon specifications...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <h4 className="font-bold">Error loading coupon</h4>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            ) : coupon ? (
              <>
                {/* Section 1: Discount Terms */}
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                    Discount Structure
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-stone-400 block">Type & Value</span>
                      <span className="font-bold text-stone-900 text-base">
                        {coupon.discount_type === "PERCENTAGE"
                          ? `${coupon.discount_value}% OFF`
                          : `${formatCurrency(coupon.discount_value, coupon.currency)} OFF`}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-stone-400 block">Max Discount Cap</span>
                      <span className="font-semibold text-stone-800">
                        {coupon.discount_type === "PERCENTAGE" && coupon.max_discount_amount
                          ? formatCurrency(coupon.max_discount_amount, coupon.currency)
                          : "No cap"}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-stone-400 block">Min Order Subtotal</span>
                      <span className="font-semibold text-stone-800">
                        {coupon.min_order_subtotal && parseFloat(coupon.min_order_subtotal) > 0
                          ? formatCurrency(coupon.min_order_subtotal, coupon.currency)
                          : "No minimum required"}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-stone-400 block">Currency</span>
                      <span className="font-semibold text-stone-800 font-mono">
                        {coupon.currency}
                      </span>
                    </div>
                  </div>

                  {coupon.description && (
                    <div className="pt-2 border-t border-stone-200 text-xs text-stone-600">
                      <span className="text-stone-400 block mb-0.5">Terms / Notes:</span>
                      {coupon.description}
                    </div>
                  )}
                </div>

                {/* Section 2: Validity & Redemptions */}
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                    Validity & Eligibility Rules
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-stone-400 block">Start Date</span>
                      <span className="font-medium text-stone-800">
                        {formatDate(coupon.start_date)}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-stone-400 block">End Date</span>
                      <span className="font-medium text-stone-800">
                        {formatDate(coupon.end_date)}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-stone-400 block">Global Limit</span>
                      <span className="font-medium text-stone-800">
                        {coupon.usage_limit ? `${coupon.usage_limit} redemptions` : "Unlimited"}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-stone-400 block">Per-Customer Limit</span>
                      <span className="font-medium text-stone-800">
                        {coupon.per_customer_limit
                          ? `${coupon.per_customer_limit} max per user`
                          : "Unlimited"}
                      </span>
                    </div>
                  </div>

                  {coupon.is_first_order_only && (
                    <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs font-semibold text-purple-700">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Restricted to First-Time Customers Only</span>
                    </div>
                  )}
                </div>

                {/* Section 3: Creation & System Info */}
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2 text-xs text-stone-600">
                  <h3 className="font-bold text-stone-500 uppercase tracking-wider mb-2">
                    System Information
                  </h3>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Created:</span>
                    <span>{formatDate(coupon.created_at)}</span>
                  </div>
                  {coupon.created_by_email && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">Created By:</span>
                      <span className="font-mono">{coupon.created_by_email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-400">Last Updated:</span>
                    <span>{formatDate(coupon.updated_at)}</span>
                  </div>
                  {coupon.updated_by_email && (
                    <div className="flex justify-between">
                      <span className="text-stone-400">Updated By:</span>
                      <span className="font-mono">{coupon.updated_by_email}</span>
                    </div>
                  )}
                </div>

                {/* Section 4: Audit Trail History */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-stone-500" />
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Immutable Audit Trail ({coupon.audit_logs?.length || 0})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {coupon.audit_logs && coupon.audit_logs.length > 0 ? (
                      coupon.audit_logs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                log.event_type === "CREATED"
                                  ? "bg-blue-100 text-blue-800"
                                  : log.event_type === "ACTIVATED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : log.event_type === "DEACTIVATED"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-stone-200 text-stone-800"
                              }`}
                            >
                              {log.event_type}
                            </span>
                            <span className="text-stone-400 text-[11px]">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          {log.notes && (
                            <p className="text-stone-700 font-medium">{log.notes}</p>
                          )}
                          {log.actor_email && (
                            <div className="text-stone-400 text-[11px] flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{log.actor_email}</span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-stone-400 italic py-2">
                        No audit log events recorded yet.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Drawer Footer Actions */}
          {coupon && (
            <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onToggleStatus(coupon);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                  coupon.is_active
                    ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                    : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                {coupon.is_active ? (
                  <>
                    <PowerOff className="w-3.5 h-3.5" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5" />
                    Activate
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(coupon);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-sm transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Parameters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
