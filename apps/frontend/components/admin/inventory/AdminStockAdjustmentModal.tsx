"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  adjustInventoryStock,
  type StockAdjustmentResponse,
} from "@/lib/api/admin";

export interface AdminStockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  variantId: string;
  sku: string;
  productName: string;
  currentOnHand: number;
  currentReserved: number;
  currentAvailable: number;
  onSuccess: (updated: StockAdjustmentResponse) => void;
}

const REASON_OPTIONS = [
  { value: "received_stock", label: "Received Stock (Supplier / Warehouse)" },
  { value: "damaged_goods", label: "Damaged Goods (Showroom / Shipping)" },
  { value: "lost_or_missing", label: "Lost or Missing Stock (Discrepancy)" },
  { value: "count_correction", label: "Stock Count Correction (Audit Count)" },
  { value: "return_received", label: "Return Received (Customer Restock)" },
  { value: "other", label: "Other (Requires note)" },
];

export default function AdminStockAdjustmentModal({
  isOpen,
  onClose,
  variantId,
  sku,
  productName,
  currentOnHand,
  currentReserved,
  currentAvailable,
  onSuccess,
}: AdminStockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">("increase");
  const [quantity, setQuantity] = useState<string>("1");
  const [reasonCode, setReasonCode] = useState<string>("received_stock");
  const [note, setNote] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResetAndClose = useCallback(() => {
    setIsConfirming(false);
    setErrorMessage(null);
    onClose();
  }, [onClose]);

  // Lock background body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        handleResetAndClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isSubmitting, handleResetAndClose]);

  if (!isOpen) return null;

  const parsedQty = parseInt(quantity, 10);
  const isValidQty = !isNaN(parsedQty) && parsedQty > 0;

  const signedDelta = isValidQty
    ? adjustmentType === "increase"
      ? parsedQty
      : -parsedQty
    : 0;

  const resultingOnHand = currentOnHand + signedDelta;
  const resultingAvailable = currentAvailable + signedDelta;

  const hasNegativeOnHand = resultingOnHand < 0;
  const hasReservationConflict = resultingAvailable < 0;
  const hasErrorCondition = !isValidQty || hasNegativeOnHand || hasReservationConflict;

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isValidQty) {
      setErrorMessage("Please enter a valid positive quantity.");
      return;
    }
    if (hasNegativeOnHand) {
      setErrorMessage(
        `Cannot decrease stock by ${parsedQty}. Total on-hand stock is only ${currentOnHand}.`
      );
      return;
    }
    if (hasReservationConflict) {
      setErrorMessage(
        `Cannot decrease stock by ${parsedQty}. Only ${currentAvailable} units are available (${currentReserved} units are reserved for active orders).`
      );
      return;
    }
    if (!reasonCode) {
      setErrorMessage("Reason code is mandatory.");
      return;
    }
    if (reasonCode === "other" && !note.trim()) {
      setErrorMessage("Please provide an explanatory note when selecting 'Other'.");
      return;
    }

    setIsConfirming(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = `adj-${variantId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const result = await adjustInventoryStock(variantId, {
        adjustment_type: adjustmentType,
        quantity: parsedQty,
        reason_code: reasonCode,
        note: note.trim(),
        idempotency_key: idempotencyKey,
      });

      onSuccess(result);
      handleResetAndClose();
    } catch (err: unknown) {
      const apiErr = err as {
        error?: { message?: string; details?: Record<string, string[] | string> };
        message?: string;
      };
      const detailMsg =
        apiErr.error?.details && typeof apiErr.error.details === "object"
          ? Object.values(apiErr.error.details).flat().join(" ")
          : null;
      setErrorMessage(
        detailMsg ||
          apiErr.error?.message ||
          apiErr.message ||
          "Failed to apply stock adjustment. Please verify stock levels and try again."
      );
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-adjustment-title"
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleResetAndClose();
        }
      }}
    >
      <div
        className="bg-white rounded-2xl border border-[#EBE2D8] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] overscroll-contain"
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#EBE2D8] flex items-center justify-between bg-[#FAF6F2] shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C7A78]">
              Authoritative Stock Adjustment
            </span>
            <h2
              id="stock-adjustment-title"
              className="text-lg font-serif font-bold text-[#1F1B17]"
            >
              Adjust Inventory Stock
            </h2>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            disabled={isSubmitting}
            className="p-1.5 text-[#8C7A78] hover:text-[#1F1B17] hover:bg-[#EBE2D8]/60 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="p-6 overflow-y-auto overscroll-contain space-y-5"
          data-lenis-prevent
        >
          {/* Variant Overview Pill */}
          <div className="p-3 bg-[#FAF6F2] rounded-xl border border-[#EBE2D8] flex items-center justify-between text-xs">
            <div className="min-w-0 pr-3">
              <p className="font-serif font-semibold text-[#1F1B17] truncate">
                {productName}
              </p>
              <p className="font-mono text-[11px] text-[#8C7A78]">SKU: {sku}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-[#8C7A78] block">Current On-Hand</span>
              <span className="font-bold text-sm text-[#1F1B17]">{currentOnHand}</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start gap-2.5 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {!isConfirming ? (
            <form onSubmit={handleProceedToConfirm} className="space-y-4">
              {/* Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-[#1F1B17] mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType("increase");
                      setErrorMessage(null);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                      adjustmentType === "increase"
                        ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#059669] shadow-xs font-semibold"
                        : "bg-white border-[#EBE2D8] text-[#554243] hover:bg-[#FAF6F2]"
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>Increase Stock (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType("decrease");
                      setErrorMessage(null);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                      adjustmentType === "decrease"
                        ? "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626] shadow-xs font-semibold"
                        : "bg-white border-[#EBE2D8] text-[#554243] hover:bg-[#FAF6F2]"
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                    <span>Decrease Stock (-)</span>
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="adjustment-quantity"
                    className="text-xs font-semibold text-[#1F1B17]"
                  >
                    Quantity to {adjustmentType === "increase" ? "Add" : "Deduct"} *
                  </label>
                  <span className="text-[10px] text-[#8C7A78]">Positive units</span>
                </div>
                <input
                  id="adjustment-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#EBE2D8] rounded-xl text-sm font-mono text-[#1F1B17] focus:outline-hidden focus:border-[#4F0012] focus:ring-1 focus:ring-[#4F0012] transition-colors"
                  required
                />
              </div>

              {/* Reason Code Dropdown */}
              <div>
                <label
                  htmlFor="adjustment-reason"
                  className="block text-xs font-semibold text-[#1F1B17] mb-1.5"
                >
                  Reason Code *
                </label>
                <select
                  id="adjustment-reason"
                  value={reasonCode}
                  onChange={(e) => {
                    setReasonCode(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#EBE2D8] rounded-xl text-xs text-[#1F1B17] focus:outline-hidden focus:border-[#4F0012] focus:ring-1 focus:ring-[#4F0012] transition-colors"
                  required
                >
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Explanatory Note */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="adjustment-note"
                    className="text-xs font-semibold text-[#1F1B17]"
                  >
                    Audit Note {reasonCode === "other" && "*"}
                  </label>
                  <span className="text-[10px] text-[#8C7A78]">
                    {reasonCode === "other" ? "Mandatory for Other" : "Optional"}
                  </span>
                </div>
                <textarea
                  id="adjustment-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    reasonCode === "other"
                      ? "Describe reason for adjustment..."
                      : "Optional reference, invoice #, damage report..."
                  }
                  className="w-full px-3.5 py-2 bg-white border border-[#EBE2D8] rounded-xl text-xs text-[#1F1B17] focus:outline-hidden focus:border-[#4F0012] focus:ring-1 focus:ring-[#4F0012] transition-colors"
                />
              </div>

              {/* Stock Preview Card */}
              <div className="p-4 bg-[#FAF6F2] rounded-xl border border-[#EBE2D8] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C7A78]">Current On-Hand:</span>
                  <span className="font-mono font-medium text-[#1F1B17]">
                    {currentOnHand} units
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C7A78]">Adjustment Delta:</span>
                  <span
                    className={`font-mono font-semibold ${
                      signedDelta > 0
                        ? "text-[#059669]"
                        : signedDelta < 0
                        ? "text-[#DC2626]"
                        : "text-[#8C7A78]"
                    }`}
                  >
                    {signedDelta > 0 ? `+${signedDelta}` : signedDelta} units
                  </span>
                </div>

                <div className="pt-2 border-t border-[#EBE2D8] flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1F1B17]">
                    Projected On-Hand:
                  </span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      hasNegativeOnHand ? "text-[#DC2626]" : "text-[#1F1B17]"
                    }`}
                  >
                    {resultingOnHand} units
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#8C7A78] pt-1">
                  <span>
                    Available: {currentAvailable} →{" "}
                    <strong
                      className={
                        hasReservationConflict
                          ? "text-[#DC2626]"
                          : "text-[#1F1B17]"
                      }
                    >
                      {resultingAvailable}
                    </strong>
                  </span>
                  <span>Reserved: {currentReserved} (protected)</span>
                </div>

                {hasReservationConflict && (
                  <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-center gap-2 text-[11px] text-[#DC2626]">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>
                      Cannot reduce stock: {currentReserved} unit(s) are actively
                      reserved for pending checkout/orders.
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 text-xs font-medium text-[#554243] hover:text-[#1F1B17] hover:bg-[#FAF6F2] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={hasErrorCondition}
                  className="px-5 py-2.5 text-xs font-medium text-white bg-[#4F0012] hover:bg-[#6D1826] rounded-xl transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Review & Confirm
                </button>
              </div>
            </form>
          ) : (
            /* Confirmation Step */
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <div className="text-xs text-[#92400E] space-y-1">
                  <p className="font-semibold text-sm text-[#78350F]">
                    Confirm Stock Adjustment
                  </p>
                  <p>
                    You are about to{" "}
                    <strong className="underline">
                      {adjustmentType === "increase" ? "INCREASE" : "DECREASE"}
                    </strong>{" "}
                    inventory for SKU <span className="font-mono">{sku}</span> by{" "}
                    <strong>{parsedQty}</strong> unit(s).
                  </p>
                  <p className="pt-1">
                    On-hand stock will change from <strong>{currentOnHand}</strong>{" "}
                    to <strong>{resultingOnHand}</strong> units.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#FAF6F2] border border-[#EBE2D8] rounded-xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#8C7A78]">Reason:</span>
                  <span className="font-medium text-[#1F1B17]">
                    {REASON_OPTIONS.find((r) => r.value === reasonCode)?.label}
                  </span>
                </div>
                {note && (
                  <div className="flex justify-between">
                    <span className="text-[#8C7A78]">Note:</span>
                    <span className="font-medium text-[#1F1B17] max-w-65 text-right truncate">
                      {note}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-[#EBE2D8]">
                  <span className="text-[#8C7A78]">Authoritative Record:</span>
                  <span className="text-[#059669] font-medium">
                    Append-only audit log
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-[#554243] hover:text-[#1F1B17] hover:bg-[#FAF6F2] rounded-xl transition-colors disabled:opacity-50"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-white bg-[#4F0012] hover:bg-[#6D1826] rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Applying Adjustment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Adjust Stock</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
