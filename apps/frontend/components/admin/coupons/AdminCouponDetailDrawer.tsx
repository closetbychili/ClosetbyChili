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
  Layers,
  Package,
  FolderTree,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import {
  getAdminCouponDetail,
  getAdminCouponRedemptions,
  type AdminCouponDetail,
  type AdminCoupon,
  type AdminCouponRedemption,
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

  // Redemption history state
  const [redemptions, setRedemptions] = useState<AdminCouponRedemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);
  const [redemptionsFilter, setRedemptionsFilter] = useState<string>("ALL");
  const [redemptionsTotal, setRedemptionsTotal] = useState(0);

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

  useEffect(() => {
    if (!isOpen || !couponId) {
      return;
    }

    let isMounted = true;
    async function loadRedemptions() {
      try {
        setRedemptionsLoading(true);
        const res = await getAdminCouponRedemptions(couponId!, {
          state: redemptionsFilter !== "ALL" ? redemptionsFilter : undefined,
          page_size: 20,
        });
        if (isMounted) {
          setRedemptions(res.results || []);
          setRedemptionsTotal(res.count ?? (res.results ? res.results.length : 0));
        }
      } catch {
        if (isMounted) {
          setRedemptions([]);
        }
      } finally {
        if (isMounted) {
          setRedemptionsLoading(false);
        }
      }
    }

    loadRedemptions();
    return () => {
      isMounted = false;
    };
  }, [isOpen, couponId, redemptionsFilter]);

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
    <div
      role="dialog"
      aria-modal="true"
      data-lenis-prevent="true"
      className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain"
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-stone-200 flex flex-col overscroll-contain">
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
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

                {/* Section 2: Usage Limits & Capacity */}
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                      Usage & Capacity
                    </h3>
                    <span className="text-[11px] font-semibold text-stone-700 bg-stone-200/80 px-2 py-0.5 rounded">
                      {coupon.total_redemptions ?? coupon.usage_count ?? 0} Finalized
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                      <span className="text-[11px] text-stone-400 block font-medium">Finalized Redemptions</span>
                      <span className="text-base font-bold text-stone-900">
                        {coupon.total_redemptions ?? coupon.usage_count ?? 0}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                      <span className="text-[11px] text-stone-400 block font-medium">Remaining Capacity</span>
                      <span className="text-base font-bold text-emerald-700">
                        {coupon.remaining_capacity !== null && coupon.remaining_capacity !== undefined
                          ? coupon.remaining_capacity
                          : "Unlimited"}
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
                  </div>

                  {coupon.is_first_order_only && (
                    <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs font-semibold text-purple-700">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Restricted to First-Time Customers Only</span>
                    </div>
                  )}
                </div>

                {/* Section 2.5: Catalog Targeting & Scope */}
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-stone-500" />
                      Catalog Targeting & Scope
                    </h3>
                    <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-200/80 text-stone-800">
                      {coupon.targeting_mode}
                    </span>
                  </div>

                  {coupon.targeting_mode === "ALL_PRODUCTS" ? (
                    <p className="text-xs text-stone-600 bg-white p-2.5 rounded-lg border border-stone-200">
                      Storewide coupon: qualifies all published catalog products meeting subtotal and date conditions.
                    </p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {coupon.applicable_products && coupon.applicable_products.length > 0 && (
                        <div>
                          <span className="text-stone-400 font-medium block mb-1">
                            Products ({coupon.applicable_products.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {coupon.applicable_products.map((p) => (
                              <span
                                key={p.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-900 text-white rounded text-[11px]"
                              >
                                <Package className="w-3 h-3 text-stone-400" />
                                {p.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {coupon.applicable_categories && coupon.applicable_categories.length > 0 && (
                        <div>
                          <span className="text-stone-400 font-medium block mb-1">
                            Categories ({coupon.applicable_categories.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {coupon.applicable_categories.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-900 text-white rounded text-[11px]"
                              >
                                <FolderTree className="w-3 h-3 text-indigo-300" />
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {coupon.applicable_collections && coupon.applicable_collections.length > 0 && (
                        <div>
                          <span className="text-stone-400 font-medium block mb-1">
                            Collections ({coupon.applicable_collections.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {coupon.applicable_collections.map((col) => (
                              <span
                                key={col.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-800 text-white rounded text-[11px]"
                              >
                                <Sparkles className="w-3 h-3 text-amber-300" />
                                {col.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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

                {/* Section 4: Durable Redemption History */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-stone-500" />
                      <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Redemption History ({redemptionsTotal})
                      </h3>
                    </div>
                    {/* Filter tabs */}
                    <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[11px]">
                      {(["ALL", "REDEEMED", "RESERVED", "RELEASED"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setRedemptionsFilter(mode)}
                          className={`px-2 py-0.5 rounded font-medium transition ${
                            redemptionsFilter === mode
                              ? "bg-white text-stone-900 shadow-xs"
                              : "text-stone-500 hover:text-stone-800"
                          }`}
                        >
                          {mode === "ALL" ? "All" : mode === "REDEEMED" ? "Finalized" : mode === "RESERVED" ? "Reserved" : "Released"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {redemptionsLoading ? (
                    <div className="flex items-center justify-center py-6 text-stone-400 text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading redemptions...</span>
                    </div>
                  ) : redemptions.length > 0 ? (
                    <div className="space-y-2">
                      {redemptions.map((red) => (
                        <div
                          key={red.id}
                          className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 ${
                                red.state === "REDEEMED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : red.state === "RESERVED"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-stone-200 text-stone-700"
                              }`}
                            >
                              {red.state === "REDEEMED" && <CheckCircle2 className="w-3 h-3" />}
                              {red.state === "RESERVED" && <Clock className="w-3 h-3" />}
                              {red.state === "RELEASED" && <RotateCcw className="w-3 h-3" />}
                              {red.state === "REDEEMED" ? "Finalized" : red.state === "RESERVED" ? "Reserved (In Checkout)" : "Released"}
                            </span>
                            <span className="font-semibold text-stone-900 font-mono">
                              {formatCurrency(red.discount_amount, red.currency)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-stone-600 text-[11px]">
                            <span>
                              Order:{" "}
                              <strong className="text-stone-800 font-mono">
                                {red.order_number || "None / In Progress"}
                              </strong>
                            </span>
                            <span className="text-stone-400">
                              {formatDate(red.finalized_at || red.reserved_at)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-200/60">
                            <span>Customer: <strong className="text-stone-700">{red.customer_email_masked || red.customer_display}</strong></span>
                            {red.release_reason && (
                              <span className="text-rose-600 italic">Reason: {red.release_reason}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 italic py-2 text-center bg-stone-50 rounded-lg border border-stone-200/60">
                      No redemptions found under this filter.
                    </p>
                  )}
                </div>

                {/* Section 5: Audit Trail History */}
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
