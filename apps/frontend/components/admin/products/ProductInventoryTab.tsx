"use client";

import { useState } from "react";
import {
  Boxes,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import {
  adjustVariantStock,
  type AdminProductVariant,
  type StockAdjustmentPayload,
} from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";

interface ProductInventoryTabProps {
  productId: string;
  variants: AdminProductVariant[];
  onVariantStockUpdated: (
    variantId: string,
    quantityAvailable: number,
    quantityReserved: number,
    stockStatus: "in_stock" | "low_stock" | "out_of_stock"
  ) => void;
  disabled?: boolean;
}

export default function ProductInventoryTab({
  variants,
  onVariantStockUpdated,
  disabled = false,
}: ProductInventoryTabProps) {
  const [adjustingVariant, setAdjustingVariant] = useState<AdminProductVariant | null>(null);

  // Form states
  const [adjustmentType, setAdjustmentType] = useState<"set" | "delta">("set");
  const [quantity, setQuantity] = useState<string>("0");
  const [reason, setReason] = useState<string>("manual_adjustment");
  const [reference, setReference] = useState<string>("");

  // Confirmation if making out-of-stock
  const [showSoldOutConfirm, setShowSoldOutConfirm] = useState(false);

  // Status & errors
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);

  const openAdjustmentModal = (v: AdminProductVariant) => {
    setAdjustingVariant(v);
    setAdjustmentType("set");
    setQuantity(String(v.inventory?.quantity_available ?? 0));
    setReason("manual_adjustment");
    setReference("");
    setShowSoldOutConfirm(false);
    setModalError(null);
  };

  const closeAdjustmentModal = () => {
    setAdjustingVariant(null);
    setShowSoldOutConfirm(false);
    setModalError(null);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingVariant) return;
    setModalError(null);

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty)) {
      setModalError("Quantity must be a valid integer.");
      return;
    }

    const currentAvailable = adjustingVariant.inventory?.quantity_available ?? 0;
    const finalProjectedQty = adjustmentType === "set" ? numQty : currentAvailable + numQty;

    if (finalProjectedQty < 0) {
      setModalError(
        `Adjustment would result in negative available inventory (${finalProjectedQty}). Available stock cannot drop below zero.`
      );
      return;
    }

    // Require confirmation if setting to 0 (making variant unavailable)
    if (finalProjectedQty === 0 && currentAvailable > 0 && !showSoldOutConfirm) {
      setShowSoldOutConfirm(true);
      return;
    }

    setSubmitting(true);

    try {
      const payload: StockAdjustmentPayload = {
        adjustment_type: adjustmentType,
        quantity: numQty,
        reason,
        reference: reference.trim() || undefined,
      };

      const res = await adjustVariantStock(adjustingVariant.id, payload);

      onVariantStockUpdated(
        adjustingVariant.id,
        res.quantity_available,
        res.quantity_reserved,
        res.stock_status
      );

      setGeneralSuccess(
        `Stock for ${adjustingVariant.sku} updated to ${res.quantity_available} units (${res.stock_status.replace(/_/g, " ")}).`
      );
      closeAdjustmentModal();
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.details?.quantity) {
        setModalError(String(err.details.quantity));
      } else {
        setModalError(err instanceof Error ? err.message : "Failed to adjust stock.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="product-inventory-tab">
      <div className="bg-white rounded-2xl border border-[#EBE2D8] p-6 shadow-sm">
        {/* Header */}
        <div className="pb-4 border-b border-[#F5EFEA]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#1F1B17]">Inventory & Availability</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#FAF6F2] text-[#8C7A78] border border-[#EBE2D8]">
              Low-Stock Threshold: 5 units
            </span>
          </div>
          <p className="text-xs text-[#786967] mt-0.5 leading-relaxed">
            Manage live warehouse availability through auditable ledger movements. Setting available stock to zero safely marks a variant as sold out.
          </p>
        </div>

        {generalSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-between text-xs text-[#059669]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{generalSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setGeneralSuccess(null)}
              className="p-1 hover:bg-black/5 rounded text-[#059669]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Variants Inventory Table */}
        {variants.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center mx-auto mb-3 text-[#8C7A78]">
              <Boxes className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-[#1F1B17]">No variants to track</p>
            <p className="text-[11px] text-[#8C7A78] max-w-xs mx-auto mt-1">
              Add variants under the Options & Pricing tab to manage stock quantities.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EBE2D8] text-[11px] font-semibold text-[#8C7A78] uppercase tracking-wider bg-[#FAF6F2]/50">
                  <th className="py-2.5 px-3">Variant / SKU</th>
                  <th className="py-2.5 px-3">Available</th>
                  <th className="py-2.5 px-3">Reserved</th>
                  <th className="py-2.5 px-3 text-center">Stock Status</th>
                  <th className="py-2.5 px-3 text-right">Adjustment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFEA]">
                {variants.map((v) => {
                  const available = v.inventory?.quantity_available ?? 0;
                  const reserved = v.inventory?.quantity_reserved ?? 0;
                  const status =
                    v.inventory?.stock_status ??
                    (available <= 0 ? "out_of_stock" : available <= 5 ? "low_stock" : "in_stock");

                  return (
                    <tr
                      key={v.id}
                      data-testid={`inventory-row-${v.id}`}
                      className="hover:bg-[#FAF6F2]/40 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-mono font-medium text-[#1F1B17]">{v.sku}</div>
                        <div className="text-[11px] text-[#786967]">
                          {[v.size, v.color].filter(Boolean).join(" / ") || "Standard"}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#1F1B17]">
                        <span className={available === 0 ? "text-[#DC2626]" : ""}>
                          {available} units
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[#786967]">
                        {reserved > 0 ? (
                          <span className="font-medium text-[#D97706]">{reserved} reserved</span>
                        ) : (
                          "0"
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {status === "in_stock" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                            In Stock
                          </span>
                        )}
                        {status === "low_stock" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3C7] text-[#B45309]">
                            Low Stock (≤5)
                          </span>
                        )}
                        {status === "out_of_stock" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEE2E2] text-[#DC2626]">
                            Out of Stock
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => openAdjustmentModal(v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors shadow-2xs"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-[#8C7A78]" />
                          <span>Adjust Stock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explicit Stock Adjustment Modal */}
      {adjustingVariant && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EBE2D8] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#F5EFEA]">
              <div>
                <h3 className="text-sm font-semibold text-[#1F1B17]">
                  Adjust Stock: {adjustingVariant.sku}
                </h3>
                <p className="text-[11px] text-[#8C7A78]">
                  Current Available: {adjustingVariant.inventory?.quantity_available ?? 0} units
                </p>
              </div>
              <button
                type="button"
                onClick={closeAdjustmentModal}
                className="p-1 rounded text-[#8C7A78] hover:text-[#1F1B17] hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#DC2626]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Sold-out confirmation warning */}
            {showSoldOutConfirm && (
              <div className="mt-4 p-3 rounded-xl bg-[#FFFBF5] border border-[#FDE68A] text-xs text-[#92400E]">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span>Variant Will Become Unavailable</span>
                </div>
                <p className="mt-1 text-[11px] text-[#78350F] leading-relaxed">
                  This adjustment will reduce available inventory to 0. The variant will show as Out of Stock on the storefront and cannot be added to customer bags.
                </p>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-4">
              {/* Adjustment Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#1F1B17] mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType("set");
                      setShowSoldOutConfirm(false);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                      adjustmentType === "set"
                        ? "border-[#4F0012] bg-[#FAF6F2] text-[#4F0012] ring-1 ring-[#4F0012]"
                        : "border-[#D5C7B8] text-[#786967] hover:bg-[#FAF6F2]"
                    }`}
                  >
                    Set Absolute Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType("delta");
                      setShowSoldOutConfirm(false);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                      adjustmentType === "delta"
                        ? "border-[#4F0012] bg-[#FAF6F2] text-[#4F0012] ring-1 ring-[#4F0012]"
                        : "border-[#D5C7B8] text-[#786967] hover:bg-[#FAF6F2]"
                    }`}
                  >
                    Delta (+ / -)
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label
                  htmlFor="stock-adjust-qty-input"
                  className="block text-xs font-semibold text-[#1F1B17] mb-1"
                >
                  {adjustmentType === "set" ? "New Available Quantity" : "Quantity Change (+ / -)"}
                </label>
                <input
                  id="stock-adjust-qty-input"
                  type="number"
                  step="1"
                  min={adjustmentType === "set" ? 0 : undefined}
                  required
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setShowSoldOutConfirm(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] text-xs bg-[#FAF6F2]/30 focus:outline-none focus:border-[#4F0012] focus:ring-1 focus:ring-[#4F0012]"
                />
              </div>

              {/* Reason Dropdown */}
              <div>
                <label
                  htmlFor="stock-adjust-reason-select"
                  className="block text-xs font-semibold text-[#1F1B17] mb-1"
                >
                  Auditable Reason <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  id="stock-adjust-reason-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] text-xs bg-[#FAF6F2]/30 focus:outline-none focus:border-[#4F0012] focus:ring-1 focus:ring-[#4F0012]"
                >
                  <option value="manual_adjustment">Manual Administrative Adjustment</option>
                  <option value="stock_received">Stock Received from Atelier / Supplier</option>
                  <option value="count_correction">Physical Cycle Count Correction</option>
                  <option value="damaged_inventory">Damaged / Defective Stock Removed</option>
                  <option value="return_restock">Customer Return Restocked</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label
                  htmlFor="stock-adjust-ref-input"
                  className="block text-xs font-semibold text-[#1F1B17] mb-1"
                >
                  Audit Reference / PO / Note
                </label>
                <input
                  id="stock-adjust-ref-input"
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. PO-2026-081, Audit-Batch-4"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] text-xs bg-[#FAF6F2]/30 focus:outline-none focus:border-[#4F0012] focus:ring-1 focus:ring-[#4F0012]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F5EFEA]">
                <button
                  type="button"
                  onClick={closeAdjustmentModal}
                  className="px-4 py-2 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm ${
                    showSoldOutConfirm
                      ? "bg-[#D97706] hover:bg-[#B45309]"
                      : "bg-[#4F0012] hover:bg-[#6D1826]"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording Movement...</span>
                    </>
                  ) : showSoldOutConfirm ? (
                    <span>Confirm Sold Out</span>
                  ) : (
                    <span>Apply Adjustment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
