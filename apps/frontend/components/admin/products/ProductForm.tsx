"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Save,
  Sparkles,
  ImageIcon,
  Tag,
  Boxes,
  Archive,
  Send,
  FileEdit,
  RefreshCw,
} from "lucide-react";
import {
  type AdminProductDetail,
  type CreateProductPayload,
  type AdminProductImage,
  type AdminProductVariant,
  type ProductReadiness,
  validateAdminProduct,
  draftAdminProduct,
} from "@/lib/api/admin";
import type { CategorySummary, CollectionSummary } from "@/lib/api/types";
import { ApiClientError } from "@/lib/api/client";
import ProductReadinessCard from "./ProductReadinessCard";
import ProductImagesTab from "./ProductImagesTab";
import ProductVariantsTab from "./ProductVariantsTab";
import ProductInventoryTab from "./ProductInventoryTab";

export interface FormCategoryOption extends CategorySummary {
  parent_name?: string | null;
  parent_slug?: string | null;
  parent?: string | null;
  is_active?: boolean;
}

export interface FormCollectionOption extends CollectionSummary {
  is_active?: boolean;
}

interface ProductFormProps {
  initialData?: AdminProductDetail | null;
  categories: FormCategoryOption[];
  collections: FormCollectionOption[];
  onSubmit: (payload: CreateProductPayload) => Promise<AdminProductDetail>;
  isEdit?: boolean;
}

type TabType = "basic" | "images" | "variants" | "inventory";

export default function ProductForm({
  initialData,
  categories,
  collections,
  onSubmit,
  isEdit = false,
}: ProductFormProps) {
  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("basic");

  // Form fields
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(initialData?.slug));
  const [description, setDescription] = useState(initialData?.description || "");
  const [categoryId, setCategoryId] = useState<string>(
    initialData?.category_id || initialData?.category?.id || ""
  );
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(
    initialData?.collection_ids || initialData?.collections?.map((c) => c.id) || []
  );
  const [status, setStatus] = useState<"draft" | "active" | "archived">(
    initialData?.status || "draft"
  );
  const [isActive, setIsActive] = useState<boolean>(
    initialData?.is_active !== undefined ? initialData.is_active : true
  );

  // Images & Variants state for edit mode
  const [images, setImages] = useState<AdminProductImage[]>(initialData?.images || []);
  const [variants, setVariants] = useState<AdminProductVariant[]>(initialData?.variants || []);
  const [serverReadiness, setServerReadiness] = useState<ProductReadiness | null>(
    initialData?.readiness || null
  );
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Real-time computed publication readiness
  const currentReadiness = useMemo(() => {
    const hasTitle = Boolean(name.trim());
    const hasCategory = Boolean(categoryId);
    const activeVars = variants.filter((v) => v.is_active);
    const hasActiveVariants = activeVars.length > 0;
    const hasPrices = activeVars.some((v) => {
      const p = parseFloat(v.retail_price);
      return !isNaN(p) && p > 0;
    });
    const hasImages = images.length > 0;
    const isComplete = hasTitle && hasCategory && hasActiveVariants && hasPrices && hasImages;

    const issues: string[] = [];
    if (!hasTitle) issues.push("Product title provided");
    if (!hasCategory) issues.push("Category taxonomy assigned");
    if (!hasActiveVariants) issues.push("At least one active variant defined");
    if (!hasPrices) issues.push("Variant retail pricing configured");
    if (!hasImages) issues.push("At least one product gallery image");

    return {
      is_ready: isComplete,
      is_ready_for_publish: isComplete,
      can_publish: isComplete,
      has_title: hasTitle,
      has_name: hasTitle,
      has_category: hasCategory,
      has_active_variants: hasActiveVariants,
      has_variants: hasActiveVariants,
      has_prices: hasPrices,
      has_price: hasPrices,
      has_images: hasImages,
      issues,
      missing_requirements: issues,
    };
  }, [name, categoryId, variants, images]);

  // Submission & error states
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Archive modal
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    if (!initialData) return Boolean(name || slug || description || categoryId || selectedCollectionIds.length > 0);
    const initialCategory = initialData.category_id || initialData.category?.id || "";
    const initialCols = initialData.collection_ids || initialData.collections?.map((c) => c.id) || [];
    const sameCols =
      selectedCollectionIds.length === initialCols.length &&
      selectedCollectionIds.every((id) => initialCols.includes(id));

    return (
      name !== initialData.name ||
      slug !== initialData.slug ||
      description !== (initialData.description || "") ||
      categoryId !== initialCategory ||
      !sameCols ||
      status !== initialData.status ||
      isActive !== initialData.is_active
    );
  }, [name, slug, description, categoryId, selectedCollectionIds, status, isActive, initialData]);

  // Slug auto-suggestion
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (fieldErrors.name) {
      setFieldErrors((prev) => ({ ...prev, name: "" }));
    }
    if (!isEdit && !slugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlug(val.toLowerCase());
    setSlugManuallyEdited(true);
    if (fieldErrors.slug) {
      setFieldErrors((prev) => ({ ...prev, slug: "" }));
    }
  };

  const toggleCollection = (colId: string) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleStockUpdate = (
    variantId: string,
    quantityAvailable: number,
    quantityReserved: number,
    stockStatus: "in_stock" | "low_stock" | "out_of_stock"
  ) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              inventory: {
                quantity_available: quantityAvailable,
                quantity_reserved: quantityReserved,
                stock_status: stockStatus,
                threshold: 5,
              },
            }
          : v
      )
    );
  };

  const executeSave = async (overrideStatus?: "draft" | "active" | "archived") => {
    setGeneralError(null);
    setSuccessMessage(null);

    const targetStatus = overrideStatus || status;

    // Client-side validations
    const errors: Record<string, string> = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = "Product silhouette name is required.";
    }

    if (slug.trim()) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug.trim())) {
        errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens (e.g., silk-kurti).";
      }
    }

    // When publishing / activating, validate storefront minimums
    if (targetStatus === "active") {
      if (!categoryId) {
        errors.category = "A category is required to publish this product on the storefront.";
      }
      if (isEdit && variants.filter((v) => v.is_active).length === 0) {
        errors.variants = "At least one active purchasable variant is required before publication.";
      }
      if (isEdit && images.length === 0) {
        errors.images = "At least one gallery image is required before publishing.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.variants || errors.images) {
        setGeneralError("Please satisfy all storefront readiness requirements before publishing.");
      }
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    const payload: CreateProductPayload = {
      name: trimmedName,
      slug: slug.trim() || undefined,
      description: description.trim(),
      category_id: categoryId || null,
      collection_ids: selectedCollectionIds,
      status: targetStatus,
      is_active: isActive,
    };

    try {
      const result = await onSubmit(payload);
      if (overrideStatus) {
        setStatus(overrideStatus);
      }
      if (result.readiness) {
        setServerReadiness(result.readiness);
      }
      if (result.images) {
        setImages(result.images);
      }
      if (result.variants) {
        setVariants(result.variants);
      }

      setSuccessMessage(
        isEdit
          ? `Changes to "${result.name}" saved successfully as ${result.status.toUpperCase()}.`
          : `Product "${result.name}" created successfully as ${result.status.toUpperCase()}.`
      );
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.details) {
        const details = err.details as Record<string, unknown>;
        const mappedErrors: Record<string, string> = {};

        Object.entries(details).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            mappedErrors[key] = val.join(" ");
          } else if (typeof val === "string") {
            mappedErrors[key] = val;
          }
        });

        // Store structured validation payload if provided by backend validator
        if (details.validation && typeof details.validation === "object") {
          setServerReadiness(details.validation as ProductReadiness);
        }

        setFieldErrors(mappedErrors);
        setGeneralError(err.message || "Please resolve the validation errors below.");
      } else if (err instanceof Error) {
        setGeneralError(err.message || "An unexpected error occurred while saving.");
      } else {
        setGeneralError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSave();
  };

  const handleValidateProduct = async () => {
    if (!initialData?.id) return;
    setIsValidating(true);
    setGeneralError(null);
    setSuccessMessage(null);
    try {
      const res = await validateAdminProduct(initialData.id);
      setServerReadiness(res);
      if (res.is_ready) {
        setSuccessMessage("Product passed all publication validation checks and is ready to publish!");
      } else {
        const count = res.summary?.total_errors ?? res.errors?.length ?? 0;
        setGeneralError(`Product has ${count} blocking validation issue(s). Resolve them before publishing.`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setGeneralError(err.message);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleRestoreToDraft = async () => {
    if (initialData?.id) {
      setSubmitting(true);
      setGeneralError(null);
      setSuccessMessage(null);
      try {
        const res = await draftAdminProduct(initialData.id);
        setStatus("draft");
        setIsActive(true);
        if (res.product.readiness) {
          setServerReadiness(res.product.readiness);
        }
        setSuccessMessage(`Product restored to Draft successfully.`);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setGeneralError(err.message);
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      executeSave("draft");
    }
  };

  const handlePublish = () => {
    executeSave("active");
  };

  const handleSaveDraft = () => {
    executeSave("draft");
  };

  const handleConfirmArchive = () => {
    setShowArchiveModal(false);
    executeSave("archived");
  };

  const totalAvailableStock = variants.reduce(
    (sum, v) => sum + (v.inventory?.quantity_available ?? 0),
    0
  );

  return (
    <div className="max-w-5xl space-y-6">
      {/* Top Action Bar / Header */}
      <div className="bg-white rounded-2xl border border-[#EBE2D8] p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 rounded-xl border border-[#EBE2D8] hover:bg-[#FAF6F2] text-[#8C7A78] hover:text-[#1F1B17] transition-colors"
            title="Return to products"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#1F1B17]">
                {name || (isEdit ? "Untitled Product" : "New Silhouette")}
              </h2>
              {/* Publication Status Badge */}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  status === "active"
                    ? "bg-[#DCFCE7] text-[#15803D]"
                    : status === "archived"
                    ? "bg-[#F3F4F6] text-[#4B5563]"
                    : "bg-[#FEF3C7] text-[#B45309]"
                }`}
              >
                {status}
              </span>

              {/* Unsaved Changes Indicator */}
              {isDirty && (
                <span
                  data-testid="unsaved-changes-indicator"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D97706] bg-[#FFFBF5] px-2 py-0.5 rounded-full border border-[#FDE68A]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" />
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8C7A78]">
              {isEdit && initialData?.id ? `ID: ${initialData.id}` : "Configure product details"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Validate Product */}
          {isEdit && (
            <button
              type="button"
              disabled={submitting || isValidating}
              onClick={handleValidateProduct}
              data-testid="form-validate-product-btn"
              className="px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isValidating ? "animate-spin text-[#4F0012]" : "text-[#786967]"}`}
              />
              <span>{isValidating ? "Validating..." : "Validate"}</span>
            </button>
          )}

          {/* Restore to Draft for Archived Products */}
          {isEdit && status === "archived" && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleRestoreToDraft}
              data-testid="form-restore-draft-btn"
              className="px-3 py-2 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors disabled:opacity-50"
            >
              Restore to Draft
            </button>
          )}

          {/* Save Draft */}
          {status !== "draft" && status !== "archived" && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSaveDraft}
              className="px-3 py-2 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
          )}

          {/* Archive Button */}
          {isEdit && status !== "archived" && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowArchiveModal(true)}
              className="px-3 py-2 rounded-xl border border-[#FECACA] hover:bg-[#FEF2F2] text-xs font-medium text-[#DC2626] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>
          )}

          {/* Publish / Activate */}
          {status !== "active" && (
            <button
              type="button"
              disabled={submitting}
              onClick={handlePublish}
              data-testid="form-publish-product-btn"
              className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Product</span>
            </button>
          )}

          {/* Primary Save Changes in Edit Mode */}
          {isEdit && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => executeSave()}
              className="px-5 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Storefront Publication Readiness Card */}
      {isEdit && (
        <ProductReadinessCard
          readiness={serverReadiness || currentReadiness}
          status={status}
          onPublishClick={handlePublish}
          onValidateClick={handleValidateProduct}
          onNavigateSection={(section, field) => {
            setActiveTab(section);
            if (field) {
              setTimeout(() => {
                const el =
                  document.getElementById(`field-${field}`) ||
                  document.querySelector(`[name="${field}"]`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  (el as HTMLElement).focus?.();
                }
              }, 100);
            }
          }}
          isValidating={isValidating}
        />
      )}

      {/* General Error Banner */}
      {generalError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-3 text-xs text-[#DC2626]"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Notice</span>
            <span>{generalError}</span>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div
          role="status"
          className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-start gap-3 text-xs text-[#059669]"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#EBE2D8] space-x-1 sm:space-x-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("basic")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "basic"
              ? "border-[#4F0012] text-[#4F0012]"
              : "border-transparent text-[#786967] hover:text-[#1F1B17]"
          }`}
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>Basic Information</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("images")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "images"
              ? "border-[#4F0012] text-[#4F0012]"
              : "border-transparent text-[#786967] hover:text-[#1F1B17]"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Images & Gallery</span>
          {isEdit ? (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#FAF6F2] border border-[#EBE2D8]">
              {images.length}
            </span>
          ) : (
            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-full bg-[#FAF6F2] text-[#8C7A78] border border-[#EBE2D8]">
              Step 2
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("variants")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "variants"
              ? "border-[#4F0012] text-[#4F0012]"
              : "border-transparent text-[#786967] hover:text-[#1F1B17]"
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Options & Pricing</span>
          {isEdit ? (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#FAF6F2] border border-[#EBE2D8]">
              {variants.length}
            </span>
          ) : (
            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-full bg-[#FAF6F2] text-[#8C7A78] border border-[#EBE2D8]">
              Step 2
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "inventory"
              ? "border-[#4F0012] text-[#4F0012]"
              : "border-transparent text-[#786967] hover:text-[#1F1B17]"
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Inventory & Stock</span>
          {isEdit ? (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                totalAvailableStock === 0
                  ? "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]"
                  : "bg-[#FAF6F2] border-[#EBE2D8] text-[#1F1B17]"
              }`}
            >
              {totalAvailableStock}
            </span>
          ) : (
            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-full bg-[#FAF6F2] text-[#8C7A78] border border-[#EBE2D8]">
              Step 2
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: BASIC INFORMATION */}
      {activeTab === "basic" && (
        <form onSubmit={handleFormSubmit} noValidate className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="border-b border-[#F2ECE5] pb-3">
              <h2 className="text-base font-serif font-bold text-[#1F1B17]">Silhouette Overview</h2>
              <p className="text-xs text-[#554243] mt-0.5">
                Core product naming, public URL handle, and editorial garment description.
              </p>
            </div>

            {/* Product Name */}
            <div>
              <label htmlFor="product-name" className="block text-xs font-semibold text-[#1F1B17] mb-1.5">
                Product Name <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="product-name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={submitting}
                placeholder="e.g., Sunflower Block Print Kurti"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#1F1B17] placeholder-[#8C7A78] focus:outline-none focus:ring-1 transition-colors ${
                  fieldErrors.name
                    ? "border-[#DC2626] bg-[#FEF2F2]/30 focus:ring-[#DC2626]"
                    : "border-[#EBE2D8] bg-[#FAF6F2]/40 focus:ring-[#4F0012] focus:border-[#4F0012]"
                }`}
              />
              {fieldErrors.name && (
                <p id="name-error" role="alert" className="text-[11px] text-[#DC2626] mt-1.5 font-medium">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="product-slug" className="block text-xs font-semibold text-[#1F1B17] mb-1.5">
                URL Slug Handle
              </label>
              <div className="flex items-center rounded-xl border border-[#EBE2D8] bg-[#FAF6F2]/40 overflow-hidden focus-within:ring-1 focus-within:ring-[#4F0012] focus-within:border-[#4F0012]">
                <span className="px-3 text-xs text-[#8C7A78] select-none border-r border-[#EBE2D8] bg-[#F5ECE3]/50 py-2.5">
                  /products/
                </span>
                <input
                  id="product-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  disabled={submitting}
                  placeholder="sunflower-block-print-kurti"
                  aria-invalid={Boolean(fieldErrors.slug)}
                  aria-describedby={fieldErrors.slug ? "slug-error" : undefined}
                  className="flex-1 px-3 py-2.5 text-xs text-[#1F1B17] placeholder-[#8C7A78] bg-transparent focus:outline-none"
                />
              </div>
              {fieldErrors.slug ? (
                <p id="slug-error" role="alert" className="text-[11px] text-[#DC2626] mt-1.5 font-medium">
                  {fieldErrors.slug}
                </p>
              ) : (
                <p className="text-[11px] text-[#8C7A78] mt-1">
                  Storefront URL address. Suggested from title, or manually customized.
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="product-description" className="block text-xs font-semibold text-[#1F1B17] mb-1.5">
                Garment Description & Fabric Details
              </label>
              <textarea
                id="product-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                placeholder="Describe the fabric weave, embroidery details, fit profile, and styling guidance..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBE2D8] bg-[#FAF6F2]/40 text-xs text-[#1F1B17] placeholder-[#8C7A78] focus:outline-none focus:ring-1 focus:ring-[#4F0012] focus:border-[#4F0012] transition-colors"
              />
              {fieldErrors.description && (
                <p role="alert" className="text-[11px] text-[#DC2626] mt-1 font-medium">
                  {fieldErrors.description}
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Taxonomy & Merchandising */}
          <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="border-b border-[#F2ECE5] pb-3">
              <h2 className="text-base font-serif font-bold text-[#1F1B17]">Taxonomy & Merchandising</h2>
              <p className="text-xs text-[#554243] mt-0.5">
                Categorize the silhouette hierarchy and curate placement in seasonal lookbooks.
              </p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="product-category" className="block text-xs font-semibold text-[#1F1B17] mb-1.5">
                Category
              </label>
              <select
                id="product-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={submitting}
                className="w-full sm:w-80 px-3 py-2.5 rounded-xl border border-[#EBE2D8] bg-white text-xs text-[#1F1B17] focus:outline-none focus:ring-1 focus:ring-[#4F0012] focus:border-[#4F0012] transition-colors cursor-pointer"
              >
                <option value="">None (Uncategorized)</option>
                {initialData?.category &&
                  !categories.some((c) => c.id === initialData.category?.id) && (
                    <option value={initialData.category.id}>
                      {initialData.category.name} (Current)
                    </option>
                  )}
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.parent_name || cat.parent_slug || cat.parent ? `↳ ${cat.name}` : cat.name}
                    {cat.is_active === false ? " (Inactive)" : ""}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <p role="alert" className="text-[11px] text-[#DC2626] mt-1 font-medium">
                  {fieldErrors.category}
                </p>
              )}
            </div>

            {/* Collections Multi-Select */}
            <div>
              <label className="block text-xs font-semibold text-[#1F1B17] mb-1.5">
                Merchandising Collections
              </label>
              <p className="text-[11px] text-[#8C7A78] mb-2.5">
                Select one or more editorial drops to feature this silhouette:
              </p>
              {collections.length === 0 && (!initialData?.collections || initialData.collections.length === 0) ? (
                <p className="text-xs text-[#8C7A78] italic">No active collections found in atelier.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {/* Preserved initial collections if missing from list */}
                  {initialData?.collections
                    ?.filter((c) => !collections.some((col) => col.id === c.id))
                    .map((col) => {
                      const isSelected = selectedCollectionIds.includes(col.id);
                      return (
                        <button
                          key={col.id}
                          type="button"
                          id={`collection-chip-${col.slug || col.id}`}
                          onClick={() => toggleCollection(col.id)}
                          disabled={submitting}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                            isSelected
                              ? "bg-[#FCF2EB] text-[#4F0012] border-[#F3DEC9] shadow-2xs"
                              : "bg-white text-[#554243] border-[#EBE2D8] hover:bg-[#FAF6F2]"
                          }`}
                        >
                          <Sparkles
                            className={`w-3 h-3 ${isSelected ? "text-[#4F0012]" : "text-[#8C7A78]"}`}
                          />
                          <span>{col.name} (Current)</span>
                          {isSelected && <Check className="w-3 h-3 text-[#4F0012]" />}
                        </button>
                      );
                    })}
                  {collections.map((col) => {
                    const isSelected = selectedCollectionIds.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        type="button"
                        id={`collection-chip-${col.slug || col.id}`}
                        onClick={() => toggleCollection(col.id)}
                        disabled={submitting}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                          isSelected
                            ? "bg-[#FCF2EB] text-[#4F0012] border-[#F3DEC9] shadow-2xs"
                            : "bg-white text-[#554243] border-[#EBE2D8] hover:bg-[#FAF6F2]"
                        }`}
                      >
                        <Sparkles
                          className={`w-3 h-3 ${isSelected ? "text-[#4F0012]" : "text-[#8C7A78]"}`}
                        />
                        <span>
                          {col.name}
                          {col.is_active === false ? " (Inactive)" : ""}
                        </span>
                        {isSelected && <Check className="w-3 h-3 text-[#4F0012]" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {fieldErrors.collections && (
                <p role="alert" className="text-[11px] text-[#DC2626] mt-1 font-medium">
                  {fieldErrors.collections}
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Publication & Visibility */}
          <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-sm space-y-5">
            <div className="border-b border-[#F2ECE5] pb-3">
              <h2 className="text-base font-serif font-bold text-[#1F1B17]">Publication & Lifecycle Status</h2>
              <p className="text-xs text-[#554243] mt-0.5">
                Control visibility in the storefront catalog. Drafts and archived products remain hidden from public shoppers.
              </p>
            </div>

            {/* Publication Status Radios */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-[#1F1B17] mb-2">Publication Status</legend>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#EBE2D8] hover:bg-[#FAF6F2]/50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="product-status"
                  value="draft"
                  checked={status === "draft"}
                  onChange={() => setStatus("draft")}
                  disabled={submitting}
                  className="mt-0.5 text-[#4F0012] focus:ring-[#4F0012]"
                />
                <div>
                  <span className="text-xs font-semibold text-[#1F1B17] block">
                    Draft (Default)
                  </span>
                  <span className="text-[11px] text-[#554243] leading-relaxed">
                    Work-in-progress silhouette. Completely hidden from public storefront catalog and search.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#EBE2D8] hover:bg-[#FAF6F2]/50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="product-status"
                  value="active"
                  checked={status === "active"}
                  onChange={() => setStatus("active")}
                  disabled={submitting}
                  className="mt-0.5 text-[#4F0012] focus:ring-[#4F0012]"
                />
                <div>
                  <span className="text-xs font-semibold text-[#1F1B17] block">
                    Active / Published
                  </span>
                  <span className="text-[11px] text-[#554243] leading-relaxed">
                    Live in public storefront catalog, collections, search results, and purchasable by customers.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-[#EBE2D8] hover:bg-[#FAF6F2]/50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="product-status"
                  value="archived"
                  checked={status === "archived"}
                  onChange={() => setStatus("archived")}
                  disabled={submitting}
                  className="mt-0.5 text-[#4F0012] focus:ring-[#4F0012]"
                />
                <div>
                  <span className="text-xs font-semibold text-[#1F1B17] block">
                    Archived
                  </span>
                  <span className="text-[11px] text-[#554243] leading-relaxed">
                    Retired product. Kept in historical records and previous order items, but hidden from public listing.
                  </span>
                </div>
              </label>
            </fieldset>

            {/* Soft-Delete Active Switch */}
            <div className="pt-2 border-t border-[#F2ECE5]">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={submitting}
                  className="rounded text-[#4F0012] focus:ring-[#4F0012]"
                />
                <span className="text-xs font-medium text-[#1F1B17]">
                  Active Record (Leave checked unless performing an administrative soft-delete)
                </span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3">
            <div className="flex items-center gap-2">
              <Link
                href="/admin/products"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#EBE2D8] bg-white hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {!isEdit && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => executeSave("draft")}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#D5C7B8] bg-white hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save as Draft</span>
                </button>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isEdit ? "Saving changes..." : "Creating silhouette..."}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isEdit ? "Save Product Changes" : "Create Product"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: IMAGES & GALLERY */}
      {activeTab === "images" && (
        isEdit && initialData?.id ? (
          <ProductImagesTab
            productId={initialData.id}
            images={images}
            onImagesChange={(newImgs) => setImages(newImgs)}
            disabled={submitting}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-[#EBE2D8] p-8 text-center max-w-lg mx-auto shadow-sm my-4">
            <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center mx-auto mb-3 text-[#4F0012]">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#1F1B17]">
              Save Product Silhouette to Upload Gallery
            </h3>
            <p className="text-xs text-[#786967] mt-1.5 leading-relaxed">
              Product photography and primary image designation attach to a persisted product silhouette. Click below to save your basic details as a draft and unlock multi-image uploads.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={() => executeSave("draft")}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving draft...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft & Open Gallery</span>
                </>
              )}
            </button>
          </div>
        )
      )}

      {/* TAB 3: VARIANTS & PRICING */}
      {activeTab === "variants" && (
        isEdit && initialData?.id ? (
          <ProductVariantsTab
            productId={initialData.id}
            variants={variants}
            onVariantsChange={(newVariants) => setVariants(newVariants)}
            disabled={submitting}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-[#EBE2D8] p-8 text-center max-w-lg mx-auto shadow-sm my-4">
            <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center mx-auto mb-3 text-[#4F0012]">
              <Tag className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#1F1B17]">
              Save Silhouette to Configure Variants & Pricing
            </h3>
            <p className="text-xs text-[#786967] mt-1.5 leading-relaxed">
              SKUs, size and color options, and commercial pricing (₹) attach to a persisted product record. Save your draft now to configure purchasable options.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={() => executeSave("draft")}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving draft...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft & Configure Variants</span>
                </>
              )}
            </button>
          </div>
        )
      )}

      {/* TAB 4: INVENTORY & STOCK */}
      {activeTab === "inventory" && (
        isEdit && initialData?.id ? (
          <ProductInventoryTab
            productId={initialData.id}
            variants={variants}
            onVariantStockUpdated={handleStockUpdate}
            disabled={submitting}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-[#EBE2D8] p-8 text-center max-w-lg mx-auto shadow-sm my-4">
            <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center mx-auto mb-3 text-[#4F0012]">
              <Boxes className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#1F1B17]">
              Save Silhouette to Manage Inventory
            </h3>
            <p className="text-xs text-[#786967] mt-1.5 leading-relaxed">
              Warehouse stock quantities and auditable movements are ledger-backed per variant. Save your draft first, configure variants, and record stock adjustments.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={() => executeSave("draft")}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving draft...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft & Manage Stock</span>
                </>
              )}
            </button>
          </div>
        )
      )}

      {/* Archive Product Confirmation Modal */}
      {showArchiveModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#EBE2D8] animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center mx-auto mb-3 text-[#DC2626]">
              <Archive className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-center text-[#1F1B17]">
              Archive Silhouette?
            </h3>
            <p className="text-xs text-[#786967] text-center mt-1.5 leading-relaxed">
              Archiving will immediately hide this product and all its variants from the public storefront and search. Previous orders and inventory logs remain preserved.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={submitting}
                className="flex-1 py-2 px-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-medium text-white transition-colors flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <span>Confirm Archive</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
