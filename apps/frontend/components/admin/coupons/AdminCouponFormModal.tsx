"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, Tag } from "lucide-react";
import type {
  AdminCoupon,
  AdminCreateCouponPayload,
  AdminUpdateCouponPayload,
  AdminCouponDiscountType,
  AdminCouponTargetingMode,
  AdminCouponTargetItem,
} from "@/lib/api/admin";
import { getAdminCouponDetail } from "@/lib/api/admin";
import AdminCouponTargetingSelector from "./AdminCouponTargetingSelector";

interface AdminCouponFormModalProps {
  isOpen: boolean;
  couponToEdit?: AdminCoupon | null;
  onClose: () => void;
  onSubmit: (
    payload: AdminCreateCouponPayload | AdminUpdateCouponPayload,
    isEdit: boolean
  ) => Promise<void>;
}

// Helper to convert ISO date string to datetime-local input value
function toLocalDatetime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function getDefaultStartDate(): string {
  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
}

function AdminCouponFormInner({
  couponToEdit,
  onClose,
  onSubmit,
}: {
  couponToEdit?: AdminCoupon | null;
  onClose: () => void;
  onSubmit: (
    payload: AdminCreateCouponPayload | AdminUpdateCouponPayload,
    isEdit: boolean
  ) => Promise<void>;
}) {
  const isEdit = Boolean(couponToEdit);

  // Form states initialized directly from props
  const [code, setCode] = useState(couponToEdit?.code || "");
  const [name, setName] = useState(couponToEdit?.name || "");
  const [description, setDescription] = useState(couponToEdit?.description || "");
  const [discountType, setDiscountType] = useState<AdminCouponDiscountType>(
    couponToEdit?.discount_type || "PERCENTAGE"
  );
  const [discountValue, setDiscountValue] = useState(couponToEdit?.discount_value || "");
  const [currency, setCurrency] = useState(couponToEdit?.currency || "INR");
  const [minOrderSubtotal, setMinOrderSubtotal] = useState(
    couponToEdit?.min_order_subtotal || ""
  );
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(
    couponToEdit?.max_discount_amount || ""
  );
  const [startDate, setStartDate] = useState(
    couponToEdit ? toLocalDatetime(couponToEdit.start_date) : getDefaultStartDate()
  );
  const [endDate, setEndDate] = useState(
    couponToEdit ? toLocalDatetime(couponToEdit.end_date) : ""
  );
  const [isActive, setIsActive] = useState(couponToEdit ? couponToEdit.is_active : true);
  const [usageLimit, setUsageLimit] = useState(
    couponToEdit?.usage_limit ? String(couponToEdit.usage_limit) : ""
  );
  const [perCustomerLimit, setPerCustomerLimit] = useState(
    couponToEdit?.per_customer_limit ? String(couponToEdit.per_customer_limit) : ""
  );
  const [isFirstOrderOnly, setIsFirstOrderOnly] = useState(
    couponToEdit ? couponToEdit.is_first_order_only : false
  );

  // Targeting states
  const [targetingMode, setTargetingMode] = useState<AdminCouponTargetingMode>(
    couponToEdit?.targeting_mode || "ALL_PRODUCTS"
  );
  const [selectedProducts, setSelectedProducts] = useState<AdminCouponTargetItem[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<AdminCouponTargetItem[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<AdminCouponTargetItem[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(Boolean(couponToEdit?.id));

  // Edit-mode hydration of targets
  useEffect(() => {
    if (!couponToEdit?.id) return;
    let cancelled = false;
    getAdminCouponDetail(couponToEdit.id)
      .then((detail) => {
        if (!cancelled) {
          if (detail.targeting_mode) setTargetingMode(detail.targeting_mode);
          if (detail.applicable_products) setSelectedProducts(detail.applicable_products);
          if (detail.applicable_categories) setSelectedCategories(detail.applicable_categories);
          if (detail.applicable_collections) setSelectedCollections(detail.applicable_collections);
        }
      })
      .catch((err) => {
        console.error("Failed to load coupon targeting details", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [couponToEdit?.id]);

  // Submission & error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFieldErrors({});
    setGeneralError(null);

    // Client-side quick checks
    const errors: Record<string, string> = {};
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      errors.code = "Coupon code is required.";
    }
    if (!name.trim()) {
      errors.name = "Campaign name is required.";
    }
    if (!discountValue || parseFloat(discountValue) <= 0) {
      errors.discount_value = "Discount value must be greater than zero.";
    } else if (discountType === "PERCENTAGE" && parseFloat(discountValue) > 100) {
      errors.discount_value = "Percentage discount cannot exceed 100%.";
    }
    if (!startDate) {
      errors.start_date = "Start date is required.";
    }
    if (startDate && endDate) {
      const s = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      if (end <= s) {
        errors.end_date = "End date must be later than start date.";
      }
    }

    // Targeting client validation
    if (targetingMode === "SPECIFIC_PRODUCTS" && selectedProducts.length === 0) {
      errors.targeting = "At least one product must be selected for Specific Products targeting.";
    } else if (targetingMode === "SPECIFIC_CATEGORIES" && selectedCategories.length === 0) {
      errors.targeting = "At least one category must be selected for Specific Categories targeting.";
    } else if (targetingMode === "SPECIFIC_COLLECTIONS" && selectedCollections.length === 0) {
      errors.targeting = "At least one collection must be selected for Specific Collections targeting.";
    } else if (
      targetingMode === "PRODUCTS_AND_CATEGORIES" &&
      selectedProducts.length === 0 &&
      selectedCategories.length === 0
    ) {
      errors.targeting = "At least one product or category must be selected.";
    } else if (
      targetingMode === "PRODUCTS_AND_COLLECTIONS" &&
      selectedProducts.length === 0 &&
      selectedCollections.length === 0
    ) {
      errors.targeting = "At least one product or collection must be selected.";
    } else if (
      targetingMode === "CATEGORIES_AND_COLLECTIONS" &&
      selectedCategories.length === 0 &&
      selectedCollections.length === 0
    ) {
      errors.targeting = "At least one category or collection must be selected.";
    } else if (
      targetingMode === "MIXED" &&
      selectedProducts.length === 0 &&
      selectedCategories.length === 0 &&
      selectedCollections.length === 0
    ) {
      errors.targeting = "At least one target (product, category, or collection) must be selected.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: AdminCreateCouponPayload = {
        code: normalizedCode,
        name: name.trim(),
        description: description.trim(),
        discount_type: discountType,
        discount_value: discountValue,
        currency: currency.trim().toUpperCase() || "INR",
        targeting_mode: targetingMode,
        product_ids: selectedProducts.map((p) => p.id),
        category_ids: selectedCategories.map((c) => c.id),
        collection_ids: selectedCollections.map((col) => col.id),
        min_order_subtotal: minOrderSubtotal ? minOrderSubtotal : null,
        max_discount_amount:
          discountType === "PERCENTAGE" && maxDiscountAmount ? maxDiscountAmount : null,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        is_active: isActive,
        usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
        per_customer_limit: perCustomerLimit ? parseInt(perCustomerLimit, 10) : null,
        is_first_order_only: isFirstOrderOnly,
      };

      await onSubmit(payload, isEdit);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as {
        status?: number;
        message?: string;
        details?: Record<string, string | string[]>;
      };

      if (errorObj?.details && typeof errorObj.details === "object") {
        const backendFieldErrors: Record<string, string> = {};
        Object.entries(errorObj.details).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            backendFieldErrors[key] = val[0] || "Invalid value";
          } else if (typeof val === "string") {
            backendFieldErrors[key] = val;
          }
        });
        setFieldErrors(backendFieldErrors);
      } else {
        setGeneralError(
          errorObj?.message || "Failed to save coupon. Please check your inputs and try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-stone-900 text-white rounded-lg">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">
              {isEdit ? `Edit Coupon: ${couponToEdit?.code}` : "Create New Promotional Coupon"}
            </h2>
            <p className="text-xs text-stone-500">
              {isEdit
                ? "Update promo parameters, discount caps, or scheduled validity."
                : "Configure discount rule, eligibility conditions, and redemption limits."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/60 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Body (Scrollable) */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 overscroll-contain">
        {/* General Error Banner */}
        {generalError && (
          <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{generalError}</div>
          </div>
        )}

        {/* Row 1: Code and Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Coupon Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/\s+/g, ""));
                if (fieldErrors.code) setFieldErrors({ ...fieldErrors, code: "" });
              }}
              placeholder="e.g. SUMMER25"
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2 text-sm font-mono font-bold uppercase rounded-lg border focus:outline-none focus:ring-2 transition ${
                fieldErrors.code
                  ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30"
                  : "border-stone-300 focus:ring-stone-900"
              }`}
            />
            {fieldErrors.code && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.code}</p>
            )}
            <p className="text-[11px] text-stone-400 mt-1">
              Letters, numbers, hyphens, and underscores only.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Campaign Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" });
              }}
              placeholder="e.g. Summer Atelier Launch 2026"
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition ${
                fieldErrors.name
                  ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30"
                  : "border-stone-300 focus:ring-stone-900"
              }`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.name}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
            Description / Terms (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 25% off handloom jackets and pret collections. Valid for orders over ₹2,000."
            disabled={isSubmitting}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 transition resize-none"
          />
        </div>

        {/* Row 2: Discount Type and Value */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Discount Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={discountType}
              onChange={(e) =>
                setDiscountType(e.target.value as AdminCouponDiscountType)
              }
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-stone-900"
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              {discountType === "PERCENTAGE" ? "Percentage (%)" : "Fixed Amount (₹)"}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={discountType === "PERCENTAGE" ? "100" : undefined}
              value={discountValue}
              onChange={(e) => {
                setDiscountValue(e.target.value);
                if (fieldErrors.discount_value) {
                  setFieldErrors({ ...fieldErrors, discount_value: "" });
                }
              }}
              placeholder={discountType === "PERCENTAGE" ? "e.g. 20.00" : "e.g. 500.00"}
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition ${
                fieldErrors.discount_value
                  ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30"
                  : "border-stone-300 focus:ring-stone-900"
              }`}
            />
            {fieldErrors.discount_value && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                {fieldErrors.discount_value}
              </p>
            )}
          </div>

          {discountType === "PERCENTAGE" ? (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Max Discount Cap (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                placeholder="e.g. 1500.00"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
              <p className="text-[11px] text-stone-400 mt-1">Leave blank for no upper cap.</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Currency Code
              </label>
              <input
                type="text"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 text-sm font-mono font-bold uppercase rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
          )}
        </div>

        {/* Row 3: Minimum Order Subtotal & Limits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Min Order Subtotal (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minOrderSubtotal}
              onChange={(e) => setMinOrderSubtotal(e.target.value)}
              placeholder="e.g. 2000.00"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
            <p className="text-[11px] text-stone-400 mt-1">Leave blank for no minimum.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Total Redemptions Cap
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="e.g. 500"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
            <p className="text-[11px] text-stone-400 mt-1">Blank = unlimited overall.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Per-Customer Limit
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={perCustomerLimit}
              onChange={(e) => setPerCustomerLimit(e.target.value)}
              placeholder="e.g. 1"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
            />
            <p className="text-[11px] text-stone-400 mt-1">Blank = unlimited per user.</p>
          </div>
        </div>

        {/* Row 4: Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Start Date & Time (UTC) <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (fieldErrors.start_date) {
                  setFieldErrors({ ...fieldErrors, start_date: "" });
                }
              }}
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition ${
                fieldErrors.start_date
                  ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30"
                  : "border-stone-300 focus:ring-stone-900"
              }`}
            />
            {fieldErrors.start_date && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                {fieldErrors.start_date}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              End Date & Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (fieldErrors.end_date) setFieldErrors({ ...fieldErrors, end_date: "" });
              }}
              disabled={isSubmitting}
              className={`w-full px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition ${
                fieldErrors.end_date
                  ? "border-rose-400 focus:ring-rose-200 bg-rose-50/30"
                  : "border-stone-300 focus:ring-stone-900"
              }`}
            />
            {fieldErrors.end_date && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.end_date}</p>
            )}
            <p className="text-[11px] text-stone-400 mt-1">Leave blank for ongoing validity.</p>
          </div>
        </div>

        {/* Row 4.5: Targeting Rules & Catalog Multi-select */}
        <AdminCouponTargetingSelector
          mode={targetingMode}
          onModeChange={(newMode) => {
            setTargetingMode(newMode);
            if (fieldErrors.targeting) {
              setFieldErrors((prev) => ({ ...prev, targeting: "" }));
            }
          }}
          selectedProducts={selectedProducts}
          onProductsChange={setSelectedProducts}
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          selectedCollections={selectedCollections}
          onCollectionsChange={setSelectedCollections}
          error={
            fieldErrors.targeting ||
            fieldErrors.targeting_mode ||
            fieldErrors.product_ids ||
            fieldErrors.category_ids ||
            fieldErrors.collection_ids ||
            null
          }
          isLoadingDetail={isLoadingDetail}
        />

        {/* Row 5: Flags (First Order Only & Active) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isFirstOrderOnly}
              onChange={(e) => setIsFirstOrderOnly(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 text-stone-900 rounded border-stone-300 focus:ring-stone-900"
            />
            <div>
              <span className="text-xs font-bold text-stone-800">
                First-Time Buyers Only
              </span>
              <p className="text-[11px] text-stone-400">
                Restrict promo redemption to accounts with 0 completed orders.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 text-stone-900 rounded border-stone-300 focus:ring-stone-900"
            />
            <div>
              <span className="text-xs font-bold text-stone-800">Active Immediately</span>
              <p className="text-[11px] text-stone-400">
                Uncheck to save as draft / inactive.
              </p>
            </div>
          </label>
        </div>
      </form>

      {/* Modal Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 bg-stone-50">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEdit ? "Update Coupon" : "Create Coupon"}</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function AdminCouponFormModal({
  isOpen,
  couponToEdit,
  onClose,
  onSubmit,
}: AdminCouponFormModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-lenis-prevent="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain"
    >
      <AdminCouponFormInner
        key={couponToEdit?.id ?? "create-new-coupon"}
        couponToEdit={couponToEdit}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </div>
  );
}
