"use client";

import React from "react";
import { AlertTriangle, Power, PowerOff, Loader2 } from "lucide-react";
import type { AdminCoupon } from "@/lib/api/admin";

interface AdminCouponToggleModalProps {
  isOpen: boolean;
  coupon: AdminCoupon | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function AdminCouponToggleModal({
  isOpen,
  coupon,
  isLoading,
  onClose,
  onConfirm,
}: AdminCouponToggleModalProps) {
  if (!isOpen || !coupon) return null;

  const isDeactivating = coupon.is_active;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-lenis-prevent="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden p-6 space-y-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-3 rounded-xl shrink-0 ${
              isDeactivating
                ? "bg-rose-100 text-rose-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isDeactivating ? (
              <PowerOff className="w-6 h-6" />
            ) : (
              <Power className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900">
              {isDeactivating ? "Deactivate Coupon" : "Activate Coupon"}
            </h3>
            <p className="text-sm text-stone-600">
              Are you sure you want to {isDeactivating ? "deactivate" : "activate"}{" "}
              <span className="font-mono font-bold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded">
                {coupon.code}
              </span>
              ?
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-stone-50 rounded-xl text-xs text-stone-600 border border-stone-200 leading-relaxed">
          {isDeactivating ? (
            <div className="flex items-start gap-2 text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>
                Deactivating will immediately render this coupon invalid and prevent future
                redemptions. Historical orders that previously redeemed this code remain
                unaltered.
              </span>
            </div>
          ) : (
            <span>
              Activating will resume promotional eligibility for this coupon during its valid
              time window.
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition disabled:opacity-60 ${
              isDeactivating
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{isDeactivating ? "Confirm Deactivation" : "Confirm Activation"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
