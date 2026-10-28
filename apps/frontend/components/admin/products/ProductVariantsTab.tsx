"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Tag,
  X,
  Loader2,
} from "lucide-react";
import {
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  type AdminProductVariant,
  type CreateVariantPayload,
} from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";

const STANDARD_SIZES = [
  { value: "XS", label: "XS (Bust 32″)" },
  { value: "S", label: "S (Bust 34″)" },
  { value: "M", label: "M (Bust 36″)" },
  { value: "L", label: "L (Bust 38″)" },
  { value: "XL", label: "XL (Bust 40″)" },
  { value: "XXL", label: "XXL (Bust 42″)" },
  { value: "3XL", label: "3XL (Bust 44″)" },
  { value: "Free Size", label: "Free Size / One Size" },
];

const COMMON_COLOR_SHADES = [
  "Red",
  "Maroon",
  "Navy Blue",
  "Emerald Green",
  "Black",
  "Blush Pink",
  "Mustard Yellow",
  "Ivory White",
];


interface ProductVariantsTabProps {
  productId: string;
  variants: AdminProductVariant[];
  onVariantsChange: (variants: AdminProductVariant[]) => void;
  disabled?: boolean;
}

export default function ProductVariantsTab({
  productId,
  variants,
  onVariantsChange,
  disabled = false,
}: ProductVariantsTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<AdminProductVariant | null>(null);

  // Form states
  const [sku, setSku] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Status & errors
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalBanner, setGeneralBanner] = useState<string | null>(null);

  // Deletion modal
  const [variantToDelete, setVariantToDelete] = useState<AdminProductVariant | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateModal = () => {
    setEditingVariant(null);
    setSku("");
    setSize("");
    setColor("");
    setRetailPrice("");
    setSalePrice("");
    setInitialStock("0");
    setIsActive(true);
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (v: AdminProductVariant) => {
    setEditingVariant(v);
    setSku(v.sku);
    setSize(v.size || "");
    setColor(v.color || "");
    setRetailPrice(v.retail_price);
    setSalePrice(v.sale_price || "");
    setInitialStock("");
    setIsActive(v.is_active);
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingVariant(null);
    setFormError(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    const trimmedSku = sku.trim().toUpperCase();
    if (!trimmedSku) {
      errors.sku = "SKU identifier is required.";
    }

    const numRetail = parseFloat(retailPrice);
    if (isNaN(numRetail) || numRetail < 0) {
      errors.retail_price = "Retail price must be a non-negative number.";
    }

    let numSale: number | null = null;
    if (salePrice.trim() !== "") {
      numSale = parseFloat(salePrice);
      if (isNaN(numSale) || numSale < 0) {
        errors.sale_price = "Sale price must be a non-negative number.";
      } else if (!isNaN(numRetail) && numSale >= numRetail) {
        errors.sale_price = "Sale price must be strictly lower than regular retail price.";
      }
    }

    // Check duplicate SKU in current product
    const duplicateSku = variants.find(
      (v) => v.sku.toUpperCase() === trimmedSku && v.id !== editingVariant?.id
    );
    if (duplicateSku) {
      errors.sku = "A variant with this SKU already exists on this product.";
    }

    // Check duplicate (size, color)
    const duplicateCombo = variants.find(
      (v) =>
        (v.size || "").toLowerCase() === size.trim().toLowerCase() &&
        (v.color || "").toLowerCase() === color.trim().toLowerCase() &&
        v.id !== editingVariant?.id
    );
    if (duplicateCombo) {
      errors.size = "A variant with this Size & Color combination already exists.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      if (editingVariant) {
        // Update existing variant
        const updated = await updateProductVariant(productId, editingVariant.id, {
          sku: trimmedSku,
          size: size.trim(),
          color: color.trim(),
          retail_price: retailPrice,
          sale_price: salePrice.trim() === "" ? null : salePrice,
          is_active: isActive,
        });

        // Preserve existing inventory data from old variant state if present
        const merged: AdminProductVariant = {
          ...updated,
          inventory: editingVariant.inventory,
        };

        onVariantsChange(variants.map((v) => (v.id === editingVariant.id ? merged : v)));
        closeModal();
      } else {
        // Create new variant
        const payload: CreateVariantPayload = {
          sku: trimmedSku,
          size: size.trim(),
          color: color.trim(),
          retail_price: retailPrice,
          sale_price: salePrice.trim() === "" ? null : salePrice,
          is_active: isActive,
          initial_stock: initialStock.trim() !== "" ? parseInt(initialStock, 10) : 0,
        };

        const created = await createProductVariant(productId, payload);
        onVariantsChange([...variants, created]);
        closeModal();
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.details) {
        const details = err.details as Record<string, unknown>;
        const mapped: Record<string, string> = {};
        Object.entries(details).forEach(([key, val]) => {
          mapped[key] = Array.isArray(val) ? val.join(" ") : String(val);
        });
        setFieldErrors(mapped);
        setFormError("Please fix the validation errors below.");
      } else {
        setFormError(err instanceof Error ? err.message : "Failed to save variant.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (v: AdminProductVariant) => {
    try {
      const updated = await updateProductVariant(productId, v.id, {
        is_active: !v.is_active,
      });
      onVariantsChange(
        variants.map((item) =>
          item.id === v.id ? { ...updated, inventory: item.inventory } : item
        )
      );
    } catch (err: unknown) {
      setGeneralBanner(err instanceof Error ? err.message : "Failed to toggle variant status.");
    }
  };

  const confirmDelete = async () => {
    if (!variantToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteProductVariant(productId, variantToDelete.id);
      if (res.deactivated) {
        // Variant was deactivated because historical orders exist
        onVariantsChange(
          variants.map((v) =>
            v.id === variantToDelete.id ? { ...v, is_active: false } : v
          )
        );
        setGeneralBanner(
          `Variant ${variantToDelete.sku} was deactivated instead of deleted because historical orders reference it.`
        );
      } else {
        // Completely removed
        onVariantsChange(variants.filter((v) => v.id !== variantToDelete.id));
      }
      setVariantToDelete(null);
    } catch (err: unknown) {
      setGeneralBanner(err instanceof Error ? err.message : "Failed to delete variant.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="product-variants-tab">
      <div className="bg-white rounded-2xl border border-[#EBE2D8] p-6 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F5EFEA]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#1F1B17]">Options & Pricing</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#FAF6F2] text-[#8C7A78] border border-[#EBE2D8]">
                Currency: INR (₹)
              </span>
            </div>
            <p className="text-xs text-[#786967] mt-0.5">
              Configure purchasable sizes, colors, retail pricing, and promotional sale prices.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Variant</span>
          </button>
        </div>

        {generalBanner && (
          <div className="mt-4 p-3 rounded-xl bg-[#FFFBF5] border border-[#FDE68A] flex items-center justify-between text-xs text-[#92400E]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#D97706]" />
              <span>{generalBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setGeneralBanner(null)}
              className="p-1 hover:bg-black/5 rounded text-[#92400E]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Variants Table */}
        {variants.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center mx-auto mb-3 text-[#8C7A78]">
              <Tag className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-[#1F1B17]">No variants defined yet</p>
            <p className="text-[11px] text-[#8C7A78] max-w-xs mx-auto mt-1">
              At least one active variant with a SKU and retail price is required before publishing.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Variant</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#EBE2D8] text-[11px] font-semibold text-[#8C7A78] uppercase tracking-wider bg-[#FAF6F2]/50">
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Attributes</th>
                  <th className="py-2.5 px-3">Regular Price</th>
                  <th className="py-2.5 px-3">Sale Price</th>
                  <th className="py-2.5 px-3">Effective Price</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFEA]">
                {variants.map((v) => {
                  const retailNum = parseFloat(v.retail_price) || 0;
                  const saleNum = v.sale_price ? parseFloat(v.sale_price) : null;
                  const discountPct =
                    saleNum !== null && retailNum > 0
                      ? Math.round(((retailNum - saleNum) / retailNum) * 100)
                      : null;
                  const effectivePrice = saleNum !== null ? saleNum : retailNum;

                  return (
                    <tr
                      key={v.id}
                      data-testid={`variant-row-${v.id}`}
                      className={`hover:bg-[#FAF6F2]/40 transition-colors ${
                        !v.is_active ? "opacity-60 bg-[#FAF6F2]/20" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-medium text-[#1F1B17]">
                        {v.sku}
                      </td>
                      <td className="py-3 px-3 text-[#554243]">
                        <span className="inline-flex items-center gap-1.5">
                          {v.size && (
                            <span className="px-2 py-0.5 rounded bg-[#FAF6F2] border border-[#EBE2D8] text-[10px] font-medium text-[#1F1B17]">
                              {v.size}
                            </span>
                          )}
                          {v.color && (
                            <span className="px-2 py-0.5 rounded bg-[#FAF6F2] border border-[#EBE2D8] text-[10px] text-[#554243]">
                              {v.color}
                            </span>
                          )}
                          {!v.size && !v.color && (
                            <span className="text-[11px] text-[#8C7A78] italic">Standard</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#1F1B17]">
                        ₹{parseFloat(v.retail_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3">
                        {v.sale_price ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#059669] font-medium">
                              ₹{parseFloat(v.sale_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            {discountPct && discountPct > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full bg-[#ECFDF5] text-[#059669] text-[10px] font-bold">
                                -{discountPct}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#8C7A78] text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#1F1B17]">
                        ₹{effectivePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(v)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide transition-colors ${
                            v.is_active
                              ? "bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0]"
                              : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                          }`}
                        >
                          {v.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(v)}
                            className="p-1 rounded hover:bg-[#FAF6F2] text-[#8C7A78] hover:text-[#1F1B17] transition-colors"
                            title="Edit variant"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setVariantToDelete(v)}
                            className="p-1 rounded hover:bg-[#FEF2F2] text-[#8C7A78] hover:text-[#DC2626] transition-colors"
                            title="Remove or deactivate variant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Variant Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overscroll-contain"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EBE2D8] animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-3 border-b border-[#F5EFEA]">
              <h3 className="text-sm font-semibold text-[#1F1B17]">
                {editingVariant ? `Edit Variant: ${editingVariant.sku}` : "Add New Variant"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded text-[#8C7A78] hover:text-[#1F1B17] hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#DC2626]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* SKU */}
              <div>
                <label
                  htmlFor="variant-sku-input"
                  className="block text-xs font-semibold text-[#1F1B17] mb-1"
                >
                  SKU Identifier <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="variant-sku-input"
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g. SILK-KURTI-M-RED"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono uppercase bg-[#FAF6F2]/30 focus:outline-none focus:ring-1 transition-all ${
                    fieldErrors.sku
                      ? "border-[#DC2626] focus:ring-[#DC2626]"
                      : "border-[#D5C7B8] focus:border-[#4F0012] focus:ring-[#4F0012]"
                  }`}
                />
                {fieldErrors.sku && (
                  <p className="text-[11px] text-[#DC2626] mt-1">{fieldErrors.sku}</p>
                )}
              </div>

              {/* Attributes: Size and Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="variant-size-select"
                      className="block text-xs font-semibold text-[#1F1B17]"
                    >
                      Size Option
                    </label>
                    <span className="text-[10px] text-[#8C7A78]">Standard Indian Fit</span>
                  </div>

                  {/* Standard Size Dropdown */}
                  <select
                    id="variant-size-select"
                    value={
                      STANDARD_SIZES.some((s) => s.value.toUpperCase() === size.trim().toUpperCase())
                        ? size.trim().toUpperCase()
                        : size
                        ? "CUSTOM"
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "CUSTOM") {
                        if (STANDARD_SIZES.some((s) => s.value.toUpperCase() === size.trim().toUpperCase())) {
                          setSize("");
                        }
                      } else {
                        setSize(val);
                      }
                      if (fieldErrors.size) {
                        setFieldErrors((prev) => ({ ...prev, size: "" }));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] text-xs bg-white text-[#1F1B17] focus:outline-none focus:border-[#4F0012] focus:ring-1 focus:ring-[#4F0012]"
                  >
                    <option value="">-- Select Standard Size --</option>
                    {STANDARD_SIZES.map((sz) => (
                      <option key={sz.value} value={sz.value}>
                        {sz.label}
                      </option>
                    ))}
                    <option value="CUSTOM">Custom Size (Free Size, Semi-Stitched, etc.)</option>
                  </select>

                  {/* Standard Size Option Pills */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {STANDARD_SIZES.map((sz) => {
                      const isSelected = size.trim().toUpperCase() === sz.value.toUpperCase();
                      return (
                        <button
                          key={sz.value}
                          type="button"
                          onClick={() => {
                            setSize(sz.value);
                            if (fieldErrors.size) {
                              setFieldErrors((prev) => ({ ...prev, size: "" }));
                            }
                          }}
                          className={"px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-all " + (
                            isSelected
                              ? "bg-[#4F0012] text-white border-[#4F0012] shadow-xs"
                              : "bg-white text-[#554243] border-[#D5C7B8] hover:border-[#4F0012] hover:bg-[#FAF6F2]"
                          )}
                        >
                          {sz.value}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom or Manual Input */}
                  <div className="mt-1.5">
                    <input
                      id="variant-size-input"
                      type="text"
                      value={size}
                      onChange={(e) => {
                        setSize(e.target.value);
                        if (fieldErrors.size) {
                          setFieldErrors((prev) => ({ ...prev, size: "" }));
                        }
                      }}
                      placeholder="Or enter custom size (e.g. S, M, L, Semi-Stitched)..."
                      className="w-full px-3 py-1.5 rounded-xl border border-[#D5C7B8] text-xs bg-[#FAF6F2]/30 focus:outline-none focus:border-[#4F0012] focus:ring-1 focus:ring-[#4F0012]"
                    />
                  </div>

                  {fieldErrors.size && (
                    <p className="text-[11px] text-[#DC2626] mt-1">{fieldErrors.size}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="variant-color-input"
                      className="block text-xs font-semibold text-[#1F1B17]"
                    >
                      Color Shade
                    </label>
                    <span className="text-[10px] text-[#8C7A78]">Fabric Hue</span>
                  </div>

                  <input
                    id="variant-color-input"
                    type="text"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      if (fieldErrors.color) {
                        setFieldErrors((prev) => ({ ...prev, color: "" }));
                      }
                    }}
                    placeholder="e.g. Crimson Red"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] text-xs bg-[#FAF6F2]/30 focus:outline-none focus:border-[#4F0012] focus:ring-1 focus:ring-[#4F0012]"
                  />

                  {/* Common Color Pills */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {COMMON_COLOR_SHADES.map((c) => {
                      const isSelected = color.trim().toLowerCase() === c.toLowerCase();
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setColor(c);
                            if (fieldErrors.color) {
                              setFieldErrors((prev) => ({ ...prev, color: "" }));
                            }
                          }}
                          className={"px-1.5 py-0.5 text-[10px] font-medium rounded-md border transition-all " + (
                            isSelected
                              ? "bg-[#4F0012] text-white border-[#4F0012]"
                              : "bg-white text-[#554243] border-[#EBE2D8] hover:border-[#4F0012] hover:bg-[#FAF6F2]"
                          )}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>

                  {fieldErrors.color && (
                    <p className="text-[11px] text-[#DC2626] mt-1">{fieldErrors.color}</p>
                  )}
                </div>
              </div>

              {/* Prices: Regular Retail and Promotional Sale */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="variant-retail-price-input"
                    className="block text-xs font-semibold text-[#1F1B17] mb-1"
                  >
                    Regular Price (₹) <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-[#8C7A78] font-mono">₹</span>
                    <input
                      id="variant-retail-price-input"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(e.target.value)}
                      placeholder="1499.00"
                      className={`w-full pl-7 pr-3 py-2 rounded-xl border text-xs bg-[#FAF6F2]/30 focus:outline-none focus:ring-1 transition-all ${
                        fieldErrors.retail_price
                          ? "border-[#DC2626] focus:ring-[#DC2626]"
                          : "border-[#D5C7B8] focus:border-[#4F0012] focus:ring-[#4F0012]"
                      }`}
                    />
                  </div>
                  {fieldErrors.retail_price && (
                    <p className="text-[11px] text-[#DC2626] mt-1">{fieldErrors.retail_price}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="variant-sale-price-input"
                    className="block text-xs font-semibold text-[#1F1B17] mb-1"
                  >
                    Sale Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-[#8C7A78] font-mono">₹</span>
                    <input
                      id="variant-sale-price-input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="Optional"
                      className={`w-full pl-7 pr-3 py-2 rounded-xl border text-xs bg-[#FAF6F2]/30 focus:outline-none focus:ring-1 transition-all ${
                        fieldErrors.sale_price
                          ? "border-[#DC2626] focus:ring-[#DC2626]"
                          : "border-[#D5C7B8] focus:border-[#4F0012] focus:ring-[#4F0012]"
                      }`}
                    />
                  </div>
                  {fieldErrors.sale_price && (
                    <p className="text-[11px] text-[#DC2626] mt-1">{fieldErrors.sale_price}</p>
                  )}
                </div>
              </div>

              {/* Initial stock for new variant */}
              {!editingVariant && (
                <div>
                  <label
                    htmlFor="variant-initial-stock-input"
                    className="block text-xs font-semibold text-[#1F1B17] mb-1"
                  >
                    Initial Stock Quantity
                  </label>
                  <input
                    id="variant-initial-stock-input"
                    type="number"
                    min="0"
                    step="1"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] text-xs bg-[#FAF6F2]/30 focus:outline-none focus:border-[#4F0012] focus:ring-1 focus:ring-[#4F0012]"
                  />
                  <p className="text-[10px] text-[#8C7A78] mt-1">
                    Creates an initial inventory ledger movement upon variant creation.
                  </p>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="variant-active-toggle"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D5C7B8] text-[#4F0012] focus:ring-[#4F0012]"
                />
                <label
                  htmlFor="variant-active-toggle"
                  className="text-xs font-medium text-[#1F1B17] cursor-pointer"
                >
                  Variant is active and available for customer orders
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F5EFEA]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingVariant ? "Update Variant" : "Create Variant"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Confirmation Modal */}
      {variantToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overscroll-contain"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#EBE2D8] animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center mx-auto mb-3 text-[#DC2626]">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-center text-[#1F1B17]">
              Remove Variant ({variantToDelete.sku})?
            </h3>
            <p className="text-xs text-[#786967] text-center mt-1.5 leading-relaxed">
              If this variant has previous customer orders or ledger history, it will be safely deactivated to protect audit trails. Otherwise, it will be deleted permanently.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setVariantToDelete(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2 px-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-medium text-white transition-colors flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Removal</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
