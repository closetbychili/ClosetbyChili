"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  FolderTree,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  createAdminCategory,
  deleteAdminCategory,
  deleteAdminCategoryImage,
  getAdminCategories,
  updateAdminCategory,
  uploadAdminCategoryImage,
  type AdminCategory,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";

export default function AdminCategoriesClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Search & Filters from URL
  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "all"; // all, active, inactive
  const ordering = searchParams.get("ordering") || "name";

  // Data state
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

  // Form fields
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    short_description: string;
    parent: string;
    ordering: number;
    is_active: boolean;
    is_visible_on_storefront: boolean;
    image_alt: string;
  }>({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    parent: "",
    ordering: 0,
    is_active: true,
    is_visible_on_storefront: true,
    image_alt: "",
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Card Image upload state
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageRemoving, setImageRemoving] = useState(false);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // URL update helper
  const updateUrl = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshCategories = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    setRefreshTrigger((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      try {
        const params: Parameters<typeof getAdminCategories>[0] = {
          all: true,
          ordering,
        };
        if (search.trim()) params.search = search.trim();
        if (statusFilter === "active") params.is_active = true;
        if (statusFilter === "inactive") params.is_active = false;

        const resp = await getAdminCategories(params);
        if (active) {
          setCategories(resp.results || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (active) {
          if (err instanceof Error) {
            setError(err.message || "Failed to load categories.");
          } else {
            setError("Failed to load categories from atelier API.");
          }
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    loadCategories();
    return () => {
      active = false;
    };
  }, [search, statusFilter, ordering, refreshTrigger]);

  // Slug auto-generation helper
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: !slugManuallyEdited ? slugify(val) : prev.slug,
    }));
    if (modalErrors.name) {
      setModalErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  const handleSlugChange = (val: string) => {
    setFormData((prev) => ({ ...prev, slug: val.toLowerCase() }));
    setSlugManuallyEdited(true);
    if (modalErrors.slug) {
      setModalErrors((prev) => ({ ...prev, slug: "" }));
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      short_description: "",
      parent: "",
      ordering: 0,
      is_active: true,
      is_visible_on_storefront: true,
      image_alt: "",
    });
    setCurrentImageUrl(null);
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setSlugManuallyEdited(false);
    setModalErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      short_description: cat.short_description || "",
      parent: cat.parent || "",
      ordering: cat.ordering ?? 0,
      is_active: cat.is_active,
      is_visible_on_storefront: cat.is_visible_on_storefront !== false,
      image_alt: cat.image_alt || "",
    });
    setCurrentImageUrl(cat.image_url || cat.image || null);
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setSlugManuallyEdited(true);
    setModalErrors({});
    setIsModalOpen(true);
  };

  // Image file selection handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setModalErrors((prev) => ({
        ...prev,
        file: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 10MB limit.`,
      }));
      return;
    }

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
    if (!allowed.includes(ext)) {
      setModalErrors((prev) => ({
        ...prev,
        file: `Unsupported format ${ext}. Allowed: JPG, PNG, WebP, AVIF`,
      }));
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));

    // Auto-fill alt text if blank
    if (!formData.image_alt.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
      setFormData((prev) => ({ ...prev, image_alt: baseName }));
    }
    setModalErrors((prev) => ({ ...prev, file: "" }));
  };

  // Image removal handler
  const handleRemoveImage = async () => {
    if (selectedImageFile) {
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      return;
    }

    if (editingCategory && currentImageUrl) {
      const confirmed = window.confirm(
        "Are you sure you want to remove this category's card image? This action will safely clean up the asset."
      );
      if (!confirmed) return;

      try {
        setImageRemoving(true);
        await deleteAdminCategoryImage(editingCategory.id);
        setCurrentImageUrl(null);
        setFormData((prev) => ({ ...prev, image_alt: "" }));
        setFeedback({
          type: "success",
          message: `Card image for "${editingCategory.name}" removed successfully.`,
        });
        refreshCategories();
        setTimeout(() => setFeedback(null), 4000);
      } catch (err: unknown) {
        setModalErrors((prev) => ({
          ...prev,
          general: err instanceof Error ? err.message : "Failed to remove category card image.",
        }));
      } finally {
        setImageRemoving(false);
      }
    }
  };

  // Candidate parent categories (excluding self and descendants when editing)
  const availableParents = useMemo(() => {
    if (!editingCategory) return categories;
    // Exclude self and direct children
    const childIds = new Set(editingCategory.children?.map((c) => c.id) || []);
    return categories.filter(
      (c) => c.id !== editingCategory.id && !childIds.has(c.id)
    );
  }, [categories, editingCategory]);

  // Submit category form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalErrors({});

    if (!formData.name.trim()) {
      setModalErrors({ name: "Category name is required." });
      return;
    }

    try {
      setModalSubmitting(true);
      let savedCat: AdminCategory;

      if (editingCategory) {
        const payload: UpdateCategoryPayload = {
          name: formData.name.trim(),
          slug: formData.slug.trim() || undefined,
          description: formData.description,
          short_description: formData.short_description,
          parent: formData.parent || null,
          ordering: formData.ordering,
          is_active: formData.is_active,
          is_visible_on_storefront: formData.is_visible_on_storefront,
          image_alt: formData.image_alt,
        };
        savedCat = await updateAdminCategory(editingCategory.id, payload);
      } else {
        const payload: CreateCategoryPayload = {
          name: formData.name.trim(),
          slug: formData.slug.trim() || undefined,
          description: formData.description,
          short_description: formData.short_description,
          parent: formData.parent || null,
          ordering: formData.ordering,
          is_active: formData.is_active,
          is_visible_on_storefront: formData.is_visible_on_storefront,
          image_alt: formData.image_alt,
        };
        savedCat = await createAdminCategory(payload);
      }

      // If an image was selected, upload directly to Cloudinary via backend
      if (selectedImageFile) {
        await uploadAdminCategoryImage(
          savedCat.id,
          selectedImageFile,
          formData.image_alt.trim() || undefined
        );
      }

      setFeedback({
        type: "success",
        message: editingCategory
          ? `Category "${formData.name.trim()}" updated successfully.`
          : `Category "${formData.name.trim()}" created successfully.`,
      });

      setIsModalOpen(false);
      refreshCategories();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        const details = (err.details as Record<string, string[] | string>) || {};
        const fieldErrs: Record<string, string> = {};
        Object.entries(details).forEach(([key, val]) => {
          fieldErrs[key] = Array.isArray(val) ? val.join(" ") : String(val);
        });
        if (Object.keys(fieldErrs).length > 0) {
          setModalErrors(fieldErrs);
        } else {
          setModalErrors({ general: err.message || "Failed to save category." });
        }
      } else if (err instanceof Error) {
        setModalErrors({ general: err.message });
      } else {
        setModalErrors({ general: "An unexpected error occurred." });
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  // Toggle active status directly
  const handleToggleActive = async (cat: AdminCategory) => {
    try {
      const nextActive = !cat.is_active;
      await updateAdminCategory(cat.id, { is_active: nextActive });
      setCategories((prev) =>
        prev.map((item) => (item.id === cat.id ? { ...item, is_active: nextActive } : item))
      );
      setFeedback({
        type: "success",
        message: `Category "${cat.name}" marked as ${nextActive ? "Active" : "Inactive"}.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to toggle category status.",
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Confirm delete or deactivation
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteSubmitting(true);
      setDeleteError(null);
      await deleteAdminCategory(deleteTarget.id);
      setFeedback({
        type: "success",
        message: `Category "${deleteTarget.name}" deleted successfully.`,
      });
      setDeleteTarget(null);
      refreshCategories();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setDeleteError(err.message || "Category deletion blocked.");
      } else if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError("Failed to delete category.");
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Deactivate instead option when deletion is blocked
  const handleDeactivateInstead = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteSubmitting(true);
      setDeleteError(null);
      await updateAdminCategory(deleteTarget.id, { is_active: false });
      setFeedback({
        type: "success",
        message: `Category "${deleteTarget.name}" deactivated safely. Products remain assigned.`,
      });
      setDeleteTarget(null);
      refreshCategories();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to deactivate category.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <AdminPageHeader
        title="Categories"
        description="Product taxonomy, hierarchical subcategories, and storefront classification."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Categories" },
        ]}
        actions={
          <button
            type="button"
            id="create-category-btn"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium shadow-[0_2px_8px_rgba(79,0,18,0.2)] transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        }
      />

      {/* Feedback Toast */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-2 p-4 rounded-xl text-xs font-medium animate-in fade-in transition-all ${
            feedback.type === "success"
              ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
              : "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#10B981]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#EBE2D8] p-4 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#8C7A78] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="category-search-input"
            value={search}
            onChange={(e) => updateUrl({ search: e.target.value })}
            placeholder="Search by category name or slug..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-xl text-[#1F1B17] placeholder-[#8C7A78] focus:outline-none focus:ring-2 focus:ring-[#4F0012]/15 focus:border-[#4F0012] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => updateUrl({ search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7A78] hover:text-[#1F1B17]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter tabs & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-[#FAF6F2] p-1 rounded-xl border border-[#EBE2D8]">
            <button
              type="button"
              id="filter-all-btn"
              onClick={() => updateUrl({ status: "all" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-white text-[#4F0012] shadow-sm font-semibold"
                  : "text-[#8C7A78] hover:text-[#1F1B17]"
              }`}
            >
              All ({categories.length})
            </button>
            <button
              type="button"
              id="filter-active-btn"
              onClick={() => updateUrl({ status: "active" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === "active"
                  ? "bg-white text-[#4F0012] shadow-sm font-semibold"
                  : "text-[#8C7A78] hover:text-[#1F1B17]"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              id="filter-inactive-btn"
              onClick={() => updateUrl({ status: "inactive" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === "inactive"
                  ? "bg-white text-[#4F0012] shadow-sm font-semibold"
                  : "text-[#8C7A78] hover:text-[#1F1B17]"
              }`}
            >
              Inactive
            </button>
          </div>

          <button
            type="button"
            id="refresh-categories-btn"
            onClick={() => refreshCategories(true)}
            disabled={refreshing}
            className="p-2 rounded-xl text-[#8C7A78] hover:text-[#4F0012] hover:bg-[#FAF6F2] border border-transparent hover:border-[#EBE2D8] transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#4F0012]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Table / State Container */}
      {error ? (
        <div className="bg-white rounded-2xl border border-[#FECACA] p-8 text-center shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)]">
          <div className="w-12 h-12 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center mx-auto mb-3 text-[#DC2626]">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#1F1B17] mb-1">
            Failed to load categories
          </h3>
          <p className="text-xs text-[#DC2626] max-w-md mx-auto mb-4">{error}</p>
          <button
            type="button"
            onClick={() => refreshCategories()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] overflow-hidden">
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-[#FAF6F2] rounded w-1/4 mb-6" />
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b border-[#F2ECE5] gap-4"
              >
                <div className="h-4 bg-[#FAF6F2] rounded w-1/3" />
                <div className="h-4 bg-[#FAF6F2] rounded w-1/6" />
                <div className="h-4 bg-[#FAF6F2] rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EBE2D8] p-12 text-center shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)]">
          <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center mx-auto mb-3 text-[#8C7A78]">
            <FolderTree className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#1F1B17] mb-1">
            No categories found
          </h3>
          <p className="text-xs text-[#8C7A78] max-w-sm mx-auto mb-4">
            {search || statusFilter !== "all"
              ? "No categories match the active filter criteria. Try resetting filters."
              : "No categories have been established yet in the atelier database."}
          </p>
          {search || statusFilter !== "all" ? (
            <button
              type="button"
              onClick={() => updateUrl({ search: "", status: "all" })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE5] text-[#1F1B17] border border-[#EBE2D8] text-xs font-medium transition-colors"
            >
              Reset Filters
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Category</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EBE2D8] shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="categories-table">
              <thead>
                <tr className="border-b border-[#EBE2D8] bg-[#FAF6F2]/75 text-[11px] font-semibold text-[#8C7A78] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Parent Category</th>
                  <th className="py-3.5 px-4 text-center">Order</th>
                  <th className="py-3.5 px-4 text-center">Storefront</th>
                  <th className="py-3.5 px-4 text-center">Products</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE5] text-xs">
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-[#FAF6F2]/50 transition-colors group"
                    id={`category-row-${cat.slug}`}
                  >
                    {/* Category with Card Thumbnail */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-12 rounded-t-lg rounded-b-xs overflow-hidden bg-[#FAF6F2] border border-[#EBE2D8] shrink-0 shadow-2xs">
                          {cat.image_url || cat.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={cat.image_url || cat.image}
                              alt={cat.image_alt || cat.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#8C7A78]/50">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            {cat.parent ? (
                              <span className="text-[#8C7A78] font-mono text-[10px]">↳</span>
                            ) : null}
                            <p className="font-medium text-[#1F1B17]">{cat.name}</p>
                          </div>
                          {cat.short_description ? (
                            <p className="text-[11px] text-[#4F0012] line-clamp-1 max-w-xs font-serif italic">
                              {cat.short_description}
                            </p>
                          ) : cat.description ? (
                            <p className="text-[11px] text-[#8C7A78] line-clamp-1 max-w-xs">
                              {cat.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-4">
                      <code className="text-[11px] font-mono px-2 py-0.5 bg-[#FAF6F2] border border-[#EBE2D8] rounded text-[#4F0012]">
                        {cat.slug}
                      </code>
                    </td>

                    {/* Parent */}
                    <td className="py-3.5 px-4">
                      {cat.parent_name ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF6F2] text-[#8C7A78] border border-[#EBE2D8]">
                          {cat.parent_name}
                        </span>
                      ) : (
                        <span className="text-[#8C7A78] italic text-[11px]">Primary Root</span>
                      )}
                    </td>

                    {/* Display Order */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-[#FAF6F2] border border-[#EBE2D8] rounded-md text-[#554243]">
                        #{cat.ordering ?? 0}
                      </span>
                    </td>

                    {/* Storefront Discovery Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                          cat.is_visible_on_storefront !== false
                            ? "bg-[#FCF2EB] text-[#4F0012] border border-[#F3DEC9]"
                            : "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]"
                        }`}
                      >
                        {cat.is_visible_on_storefront !== false ? "Visible" : "Catalog Only"}
                      </span>
                    </td>

                    {/* Products Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          cat.product_count > 0
                            ? "bg-[#FAF6F2] text-[#4F0012] font-semibold border border-[#EBE2D8]"
                            : "text-[#8C7A78]"
                        }`}
                      >
                        {cat.product_count} {cat.product_count === 1 ? "product" : "products"}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                          cat.is_active
                            ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                            : "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]"
                        }`}
                      >
                        {cat.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Action Controls */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Active Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(cat)}
                          title={cat.is_active ? "Deactivate category" : "Activate category"}
                          className="p-1.5 rounded-lg text-[#8C7A78] hover:text-[#1F1B17] hover:bg-[#FAF6F2] transition-colors"
                        >
                          {cat.is_active ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-[#10B981]" />
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          id={`edit-category-${cat.slug}`}
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 rounded-lg text-[#8C7A78] hover:text-[#4F0012] hover:bg-[#FAF6F2] transition-colors"
                          title="Edit category"
                          aria-label={`Edit category ${cat.name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          id={`delete-category-${cat.slug}`}
                          onClick={() => {
                            setDeleteTarget(cat);
                            setDeleteError(null);
                          }}
                          className="p-1.5 rounded-lg text-[#8C7A78] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                          title="Delete category"
                          aria-label={`Delete category ${cat.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Create / Edit Category Modal */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl border border-[#EBE2D8] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBE2D8] bg-[#FAF6F2]/60 shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-[#1F1B17]">
                  {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Category"}
                </h2>
                <p className="text-[11px] text-[#8C7A78] mt-0.5">
                  Configure taxonomy classification and storefront discovery appearance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#8C7A78] hover:text-[#1F1B17] p-1.5 rounded-lg hover:bg-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {modalErrors.general && (
                  <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalErrors.general}</span>
                  </div>
                )}

                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left Column: General Taxonomy */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#EBE2D8]">
                      <FolderTree className="w-4 h-4 text-[#4F0012]" />
                      <h3 className="text-xs font-semibold text-[#1F1B17] uppercase tracking-wider">
                        Category Information
                      </h3>
                    </div>

                    {/* Name */}
                    <div>
                      <label
                        htmlFor="category-form-name"
                        className="block text-xs font-semibold text-[#1F1B17] mb-1"
                      >
                        Category Name <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        id="category-form-name"
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="e.g. Kurtas & Tunics"
                        className={`w-full px-3.5 py-2 text-xs bg-[#FAF6F2] border rounded-xl text-[#1F1B17] placeholder-[#8C7A78] focus:outline-none focus:ring-2 focus:ring-[#4F0012]/15 ${
                          modalErrors.name ? "border-[#DC2626]" : "border-[#EBE2D8] focus:border-[#4F0012]"
                        }`}
                      />
                      {modalErrors.name && (
                        <p className="mt-1 text-[11px] text-[#DC2626]">{modalErrors.name}</p>
                      )}
                    </div>

                    {/* Slug */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="category-form-slug"
                          className="block text-xs font-semibold text-[#1F1B17]"
                        >
                          URL Slug
                        </label>
                        {!slugManuallyEdited ? (
                          <span className="text-[10px] text-[#8C7A78] bg-[#FAF6F2] px-1.5 py-0.5 rounded border border-[#EBE2D8]">
                            Auto-generating
                          </span>
                        ) : null}
                      </div>
                      <input
                        type="text"
                        id="category-form-slug"
                        value={formData.slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="kurtas-tunics"
                        className={`w-full px-3.5 py-2 text-xs font-mono bg-[#FAF6F2] border rounded-xl text-[#1F1B17] placeholder-[#8C7A78] focus:outline-none focus:ring-2 focus:ring-[#4F0012]/15 ${
                          modalErrors.slug ? "border-[#DC2626]" : "border-[#EBE2D8] focus:border-[#4F0012]"
                        }`}
                      />
                      {modalErrors.slug && (
                        <p className="mt-1 text-[11px] text-[#DC2626]">{modalErrors.slug}</p>
                      )}
                    </div>

                    {/* Parent Category */}
                    <div>
                      <label
                        htmlFor="category-form-parent"
                        className="block text-xs font-semibold text-[#1F1B17] mb-1"
                      >
                        Parent Category
                      </label>
                      <select
                        id="category-form-parent"
                        value={formData.parent}
                        onChange={(e) => setFormData((prev) => ({ ...prev, parent: e.target.value }))}
                        className="w-full px-3.5 py-2 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-xl text-[#1F1B17] focus:outline-none focus:ring-2 focus:ring-[#4F0012]/15 focus:border-[#4F0012]"
                      >
                        <option value="">None (Top-Level Primary Category)</option>
                        {availableParents.map((parent) => (
                          <option key={parent.id} value={parent.id}>
                            {parent.parent_name ? `↳ ${parent.name} (under ${parent.parent_name})` : parent.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[10px] text-[#8C7A78]">
                        Used for hierarchical breadcrumbs and category navigation.
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <label
                        htmlFor="category-form-description"
                        className="block text-xs font-semibold text-[#1F1B17] mb-1"
                      >
                        Catalog Description
                      </label>
                      <textarea
                        id="category-form-description"
                        rows={3}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Atelier taxonomy notes or customer-facing description..."
                        className="w-full px-3.5 py-2 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-xl text-[#1F1B17] placeholder-[#8C7A78] focus:outline-none focus:ring-2 focus:ring-[#4F0012]/15 focus:border-[#4F0012] resize-none"
                      />
                    </div>

                    {/* Active in Catalog Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF6F2] border border-[#EBE2D8]">
                      <div className="pr-3">
                        <p className="text-xs font-semibold text-[#1F1B17]">Active in Catalog</p>
                        <p className="text-[10px] text-[#8C7A78] leading-tight mt-0.5">
                          Enables products in this category to be active and searchable.
                        </p>
                      </div>
                      <button
                        type="button"
                        id="category-form-active-toggle"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))
                        }
                        className={`relative shrink-0 inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                          formData.is_active ? "bg-[#4F0012]" : "bg-[#D1D5DB]"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            formData.is_active ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Storefront Card Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-[#EBE2D8]">
                      <ImageIcon className="w-4 h-4 text-[#4F0012]" />
                      <h3 className="text-xs font-semibold text-[#1F1B17] uppercase tracking-wider">
                        Storefront Card Configuration
                      </h3>
                    </div>

                    {/* Card Image Upload & Preview */}
                    <div>
                      <label className="block text-xs font-semibold text-[#1F1B17] mb-1.5">
                        Category Card Image
                      </label>
                      <div className="flex items-start gap-3">
                        {/* Arched Card Image Preview */}
                        <div className="relative w-20 aspect-[3/4.2] rounded-t-xl rounded-b-xs overflow-hidden bg-[#FAF6F2] border border-[#EBE2D8] shrink-0 shadow-xs flex items-center justify-center">
                          {imagePreviewUrl || currentImageUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imagePreviewUrl || currentImageUrl || ""}
                                alt={formData.image_alt || "Category card preview"}
                                className="w-full h-full object-cover"
                              />
                              {imagePreviewUrl && (
                                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[#4F0012] text-white text-[9px] font-semibold">
                                  New
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center p-2 text-[#8C7A78]">
                              <ImageIcon className="w-5 h-5 mx-auto mb-1 text-[#8C7A78]/60" />
                              <span className="text-[9px] leading-tight block">No image</span>
                            </div>
                          )}
                        </div>

                        {/* Image Actions & Guidelines */}
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="file"
                            id="category-card-image-input"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            onChange={handleImageFileChange}
                            className="hidden"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <label
                              htmlFor="category-card-image-input"
                              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EBE2D8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors shadow-2xs"
                            >
                              <Upload className="w-3.5 h-3.5 text-[#4F0012]" />
                              <span>{imagePreviewUrl || currentImageUrl ? "Change Image" : "Upload Card Image"}</span>
                            </label>

                            {(imagePreviewUrl || currentImageUrl) && (
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                disabled={imageRemoving}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] hover:bg-[#FEE2E2] text-xs font-medium text-[#DC2626] transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{imageRemoving ? "Removing..." : "Remove"}</span>
                              </button>
                            )}
                          </div>

                          <p className="text-[10px] text-[#8C7A78] leading-tight">
                            Portrait (3:4 or 4:5), max 10MB. Stored in Cloudinary.
                          </p>
                          {modalErrors.file && (
                            <p className="text-[11px] text-[#DC2626] font-medium">{modalErrors.file}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Alt Text for Accessibility & SEO */}
                    <div>
                      <label
                        htmlFor="category-form-image-alt"
                        className="block text-xs font-semibold text-[#1F1B17] mb-1"
                      >
                        Image Alt Text (Accessibility & SEO)
                      </label>
                      <input
                        type="text"
                        id="category-form-image-alt"
                        value={formData.image_alt}
                        onChange={(e) => setFormData((prev) => ({ ...prev, image_alt: e.target.value }))}
                        placeholder="e.g. Model styled in flared printed anarkali kurti"
                        className="w-full px-3.5 py-2 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-xl text-[#1F1B17] placeholder-[#8C7A78] focus:outline-none focus:ring-2 focus:ring-[#4F0012]/15 focus:border-[#4F0012]"
                      />
                    </div>

                    {/* Short Subtitle for Storefront Cards */}
                    <div>
                      <label
                        htmlFor="category-form-short-desc"
                        className="block text-xs font-semibold text-[#1F1B17] mb-1"
                      >
                        Card Subtitle / Tagline
                      </label>
                      <input
                        type="text"
                        id="category-form-short-desc"
                        value={formData.short_description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
                        placeholder="e.g. Everyday cuts & relaxed silhouettes"
                        className="w-full px-3.5 py-2 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-xl text-[#1F1B17] placeholder-[#8C7A78] focus:outline-none focus:ring-2 focus:ring-[#4F0012]/15 focus:border-[#4F0012]"
                      />
                    </div>

                    {/* Display Order & Storefront Toggle row */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {/* Display Order */}
                      <div>
                        <label
                          htmlFor="category-form-ordering"
                          className="block text-xs font-semibold text-[#1F1B17] mb-1"
                        >
                          Display Order
                        </label>
                        <input
                          type="number"
                          id="category-form-ordering"
                          value={formData.ordering}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              ordering: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="w-full px-3.5 py-2 text-xs font-mono bg-[#FAF6F2] border border-[#EBE2D8] rounded-xl text-[#1F1B17] focus:outline-none focus:ring-2 focus:ring-[#4F0012]/15 focus:border-[#4F0012]"
                        />
                        <p className="mt-0.5 text-[9px] text-[#8C7A78]">
                          Ascending priority (0, 1, 2...)
                        </p>
                      </div>

                      {/* Storefront Discovery Visibility Toggle */}
                      <div>
                        <span className="block text-xs font-semibold text-[#1F1B17] mb-1">
                          Storefront Carousel
                        </span>
                        <div className="flex items-center justify-between h-9.5 px-3 rounded-xl bg-[#FAF6F2] border border-[#EBE2D8]">
                          <span className="text-[10px] text-[#554243] font-medium">
                            {formData.is_visible_on_storefront ? "Visible" : "Hidden"}
                          </span>
                          <button
                            type="button"
                            id="category-form-storefront-toggle"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                is_visible_on_storefront: !prev.is_visible_on_storefront,
                              }))
                            }
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                              formData.is_visible_on_storefront ? "bg-[#4F0012]" : "bg-[#D1D5DB]"
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                formData.is_visible_on_storefront ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-[#EBE2D8] bg-[#FAF6F2]/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EBE2D8] text-xs font-medium text-[#8C7A78] hover:text-[#1F1B17] hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="category-form-submit-btn"
                  disabled={modalSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium transition-all shadow-[0_2px_8px_rgba(79,0,18,0.2)] disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editingCategory ? "Save Changes" : "Create Category"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Safe Deletion Modal */}
      {/* ===================================================================== */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl border border-[#EBE2D8] shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1F1B17]">
                  Delete Category: {deleteTarget.name}
                </h3>
                <p className="text-xs text-[#8C7A78]">
                  Checking product references and taxonomy integrity...
                </p>
              </div>
            </div>

            {/* If referenced by products */}
            {deleteTarget.product_count > 0 ? (
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 text-xs text-[#92400E] space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
                  Deletion Blocked: Assigned to {deleteTarget.product_count} product(s)
                </p>
                <p>
                  To protect catalog integrity, categories with active products cannot be deleted.
                  You can safely deactivate this category instead, which preserves assignments while
                  hiding it from the public storefront.
                </p>
              </div>
            ) : deleteTarget.children && deleteTarget.children.length > 0 ? (
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 text-xs text-[#92400E] space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
                  Deletion Blocked: Has {deleteTarget.children.length} subcategory/subcategories
                </p>
                <p>
                  Please reassign or delete subcategories before deleting the primary parent
                  category.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#8C7A78]">
                Are you sure you want to delete this category? This action cannot be undone.
              </p>
            )}

            {deleteError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626]">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EBE2D8]">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-[#EBE2D8] text-xs font-medium text-[#8C7A78] hover:text-[#1F1B17] transition-colors"
              >
                Cancel
              </button>

              {deleteTarget.product_count > 0 || (deleteTarget.children && deleteTarget.children.length > 0) ? (
                <button
                  type="button"
                  id="deactivate-instead-btn"
                  onClick={handleDeactivateInstead}
                  disabled={deleteSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#FAF6F2] hover:bg-[#F2ECE5] border border-[#EBE2D8] text-xs font-medium text-[#4F0012] transition-colors"
                >
                  {deleteSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Deactivate Instead"
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  id="confirm-delete-category-btn"
                  onClick={handleDeleteConfirm}
                  disabled={deleteSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-medium transition-colors"
                >
                  {deleteSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
