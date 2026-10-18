"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  FolderPlus,
  Layers,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  assignProductToCollection,
  createAdminCollection,
  deleteAdminCollection,
  getAdminCollectionProducts,
  getAdminCollections,
  getAdminProducts,
  removeProductFromCollection,
  updateAdminCollection,
  type AdminCollection,
  type AdminCollectionProduct,
  type AdminProductListItem,
  type CreateCollectionPayload,
  type UpdateCollectionPayload,
} from "@/lib/api/admin";
import { ApiClientError } from "@/lib/api/client";

export default function AdminCollectionsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Search & Filters from URL
  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "all";
  const ordering = searchParams.get("ordering") || "name";

  // Data state
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<AdminCollection | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

  // Form fields
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    is_active: boolean;
  }>({
    name: "",
    slug: "",
    description: "",
    is_active: true,
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Manage Products Modal state
  const [managingCollection, setManagingCollection] = useState<AdminCollection | null>(null);
  const [collectionProducts, setCollectionProducts] = useState<AdminCollectionProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [allProducts, setAllProducts] = useState<AdminProductListItem[]>([]);
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);

  // Safe Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminCollection | null>(null);
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

  const refreshCollections = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    setRefreshTrigger((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCollections() {
      try {
        const params: Parameters<typeof getAdminCollections>[0] = {
          all: true,
          ordering,
        };
        if (search.trim()) params.search = search.trim();
        if (statusFilter === "active") params.is_active = true;
        if (statusFilter === "inactive") params.is_active = false;

        const resp = await getAdminCollections(params);
        if (active) {
          setCollections(resp.results || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (active) {
          if (err instanceof Error) {
            setError(err.message || "Failed to load collections.");
          } else {
            setError("Failed to load collections from atelier API.");
          }
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    loadCollections();
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
    setEditingCollection(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      is_active: true,
    });
    setSlugManuallyEdited(false);
    setModalErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (col: AdminCollection) => {
    setEditingCollection(col);
    setFormData({
      name: col.name,
      slug: col.slug,
      description: col.description || "",
      is_active: col.is_active,
    });
    setSlugManuallyEdited(true);
    setModalErrors({});
    setIsModalOpen(true);
  };

  // Submit collection create/edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalErrors({});

    if (!formData.name.trim()) {
      setModalErrors({ name: "Collection name is required." });
      return;
    }

    try {
      setModalSubmitting(true);
      if (editingCollection) {
        const payload: UpdateCollectionPayload = {
          name: formData.name.trim(),
          slug: formData.slug.trim() || undefined,
          description: formData.description,
          is_active: formData.is_active,
        };
        await updateAdminCollection(editingCollection.id, payload);
        setFeedback({
          type: "success",
          message: `Collection "${formData.name.trim()}" updated successfully.`,
        });
      } else {
        const payload: CreateCollectionPayload = {
          name: formData.name.trim(),
          slug: formData.slug.trim() || undefined,
          description: formData.description,
          is_active: formData.is_active,
        };
        await createAdminCollection(payload);
        setFeedback({
          type: "success",
          message: `Collection "${formData.name.trim()}" created successfully.`,
        });
      }

      setIsModalOpen(false);
      refreshCollections();
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
          setModalErrors({ general: err.message || "Failed to save collection." });
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
  const handleToggleActive = async (col: AdminCollection) => {
    try {
      const nextActive = !col.is_active;
      await updateAdminCollection(col.id, { is_active: nextActive });
      setCollections((prev) =>
        prev.map((item) => (item.id === col.id ? { ...item, is_active: nextActive } : item))
      );
      setFeedback({
        type: "success",
        message: `Collection "${col.name}" marked as ${nextActive ? "Active" : "Inactive"}.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to toggle collection status.",
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Open Manage Products Modal
  const openManageProductsModal = async (col: AdminCollection) => {
    setManagingCollection(col);
    setLoadingProducts(true);
    try {
      const [prodsResp, catalogResp] = await Promise.all([
        getAdminCollectionProducts(col.id),
        getAdminProducts({ page_size: 100 }).catch(() => ({ results: [] })),
      ]);
      setCollectionProducts(prodsResp || []);
      setAllProducts(catalogResp.results || []);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load collection products.",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  // Add Product to Collection
  const handleAddProduct = async () => {
    if (!managingCollection || !selectedProductIdToAdd) return;
    try {
      setAddingProduct(true);
      await assignProductToCollection(managingCollection.id, {
        product_id: selectedProductIdToAdd,
      });
      setSelectedProductIdToAdd("");
      const updated = await getAdminCollectionProducts(managingCollection.id);
      setCollectionProducts(updated || []);
      refreshCollections();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to assign product to collection.",
      });
    } finally {
      setAddingProduct(false);
    }
  };

  // Remove Product from Collection
  const handleRemoveProduct = async (productId: string) => {
    if (!managingCollection) return;
    try {
      await removeProductFromCollection(managingCollection.id, productId);
      setCollectionProducts((prev) => prev.filter((p) => p.product_id !== productId));
      refreshCollections();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to remove product from collection.",
      });
    }
  };

  // Confirm delete or deactivation
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteSubmitting(true);
      setDeleteError(null);
      await deleteAdminCollection(deleteTarget.id);
      setFeedback({
        type: "success",
        message: `Collection "${deleteTarget.name}" deleted successfully.`,
      });
      setDeleteTarget(null);
      refreshCollections();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setDeleteError(err.message || "Collection deletion blocked.");
      } else if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError("Failed to delete collection.");
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
      await updateAdminCollection(deleteTarget.id, { is_active: false });
      setFeedback({
        type: "success",
        message: `Collection "${deleteTarget.name}" deactivated safely. Products remain assigned.`,
      });
      setDeleteTarget(null);
      refreshCollections();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to deactivate collection.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <AdminPageHeader
        title="Collections"
        description="Merchandising groupings, seasonal curations, lookbooks, and editorial drops."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Collections" },
        ]}
        actions={
          <button
            type="button"
            id="create-collection-btn"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium shadow-[0_2px_8px_rgba(79,0,18,0.2)] transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Collection</span>
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
            id="collection-search-input"
            value={search}
            onChange={(e) => updateUrl({ search: e.target.value })}
            placeholder="Search by collection name or slug..."
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
              id="filter-col-all-btn"
              onClick={() => updateUrl({ status: "all" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-white text-[#4F0012] shadow-sm font-semibold"
                  : "text-[#8C7A78] hover:text-[#1F1B17]"
              }`}
            >
              All ({collections.length})
            </button>
            <button
              type="button"
              id="filter-col-active-btn"
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
              id="filter-col-inactive-btn"
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
            id="refresh-collections-btn"
            onClick={() => refreshCollections(true)}
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
            Failed to load collections
          </h3>
          <p className="text-xs text-[#DC2626] max-w-md mx-auto mb-4">{error}</p>
          <button
            type="button"
            onClick={() => refreshCollections()}
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
      ) : collections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EBE2D8] p-12 text-center shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)]">
          <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center mx-auto mb-3 text-[#8C7A78]">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#1F1B17] mb-1">
            No collections found
          </h3>
          <p className="text-xs text-[#8C7A78] max-w-sm mx-auto mb-4">
            {search || statusFilter !== "all"
              ? "No collections match the active filter criteria. Try resetting filters."
              : "No collections have been created yet for merchandising drops."}
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
              <span>Create Collection</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EBE2D8] shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="collections-table">
              <thead>
                <tr className="border-b border-[#EBE2D8] bg-[#FAF6F2]/75 text-[11px] font-semibold text-[#8C7A78] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-center">Associated Products</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE5] text-xs">
                {collections.map((col) => (
                  <tr
                    key={col.id}
                    className="hover:bg-[#FAF6F2]/50 transition-colors group"
                    id={`collection-row-${col.slug}`}
                  >
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-[#1F1B17]">{col.name}</p>
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-4">
                      <code className="text-[11px] font-mono px-2 py-0.5 bg-[#FAF6F2] border border-[#EBE2D8] rounded text-[#4F0012]">
                        {col.slug}
                      </code>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4">
                      <p className="text-[11px] text-[#8C7A78] line-clamp-1 max-w-sm">
                        {col.description || "—"}
                      </p>
                    </td>

                    {/* Products Count */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => openManageProductsModal(col)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#FAF6F2] hover:bg-[#F2ECE5] border border-[#EBE2D8] text-[#4F0012] transition-colors"
                        title="Manage assigned products"
                      >
                        <Package className="w-3 h-3 text-[#8C7A78]" />
                        <span>
                          {col.product_count} {col.product_count === 1 ? "product" : "products"}
                        </span>
                      </button>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                          col.is_active
                            ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                            : "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]"
                        }`}
                      >
                        {col.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Action Controls */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Manage Products Button */}
                        <button
                          type="button"
                          id={`manage-products-${col.slug}`}
                          onClick={() => openManageProductsModal(col)}
                          className="p-1.5 rounded-lg text-[#8C7A78] hover:text-[#4F0012] hover:bg-[#FAF6F2] transition-colors"
                          title="Manage products"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Active Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(col)}
                          title={col.is_active ? "Deactivate collection" : "Activate collection"}
                          className="p-1.5 rounded-lg text-[#8C7A78] hover:text-[#1F1B17] hover:bg-[#FAF6F2] transition-colors"
                        >
                          {col.is_active ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-[#10B981]" />
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          id={`edit-collection-${col.slug}`}
                          onClick={() => openEditModal(col)}
                          className="p-1.5 rounded-lg text-[#8C7A78] hover:text-[#4F0012] hover:bg-[#FAF6F2] transition-colors"
                          title="Edit collection"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          id={`delete-collection-${col.slug}`}
                          onClick={() => {
                            setDeleteTarget(col);
                            setDeleteError(null);
                          }}
                          className="p-1.5 rounded-lg text-[#8C7A78] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                          title="Delete collection"
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
      {/* Create / Edit Collection Modal */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl border border-[#EBE2D8] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-[#EBE2D8] bg-[#FAF6F2]/50">
              <h2 className="text-sm font-semibold text-[#1F1B17]">
                {editingCollection
                  ? `Edit Collection: ${editingCollection.name}`
                  : "Create New Collection"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#8C7A78] hover:text-[#1F1B17] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {modalErrors.general && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalErrors.general}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label
                  htmlFor="collection-form-name"
                  className="block text-xs font-semibold text-[#1F1B17] mb-1"
                >
                  Collection Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  id="collection-form-name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Festive Couture 2026"
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
                    htmlFor="collection-form-slug"
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
                  id="collection-form-slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="festive-couture-2026"
                  className={`w-full px-3.5 py-2 text-xs font-mono bg-[#FAF6F2] border rounded-xl text-[#1F1B17] placeholder-[#8C7A78] focus:outline-none focus:ring-2 focus:ring-[#4F0012]/15 ${
                    modalErrors.slug ? "border-[#DC2626]" : "border-[#EBE2D8] focus:border-[#4F0012]"
                  }`}
                />
                {modalErrors.slug && (
                  <p className="mt-1 text-[11px] text-[#DC2626]">{modalErrors.slug}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="collection-form-description"
                  className="block text-xs font-semibold text-[#1F1B17] mb-1"
                >
                  Description
                </label>
                <textarea
                  id="collection-form-description"
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Editorial notes, theme inspiration, or lookbook banner copy..."
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-xl text-[#1F1B17] placeholder-[#8C7A78] focus:outline-none focus:ring-2 focus:ring-[#4F0012]/15 focus:border-[#4F0012]"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-semibold text-[#1F1B17]">Active Status</p>
                  <p className="text-[11px] text-[#8C7A78]">
                    Active collections are showcased on the storefront drop menu.
                  </p>
                </div>
                <button
                  type="button"
                  id="collection-form-active-toggle"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    formData.is_active ? "bg-[#4F0012]" : "bg-[#D1D5DB]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#EBE2D8]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EBE2D8] text-xs font-medium text-[#8C7A78] hover:text-[#1F1B17] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="collection-form-submit-btn"
                  disabled={modalSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium transition-all shadow-[0_2px_8px_rgba(79,0,18,0.2)] disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editingCollection ? "Save Changes" : "Create Collection"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Manage Products Modal */}
      {/* ===================================================================== */}
      {managingCollection && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl border border-[#EBE2D8] shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-[#EBE2D8] bg-[#FAF6F2]/50 shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-[#1F1B17]">
                  Manage Products: {managingCollection.name}
                </h2>
                <p className="text-[11px] text-[#8C7A78]">
                  Assign or remove silhouettes from this merchandising collection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingCollection(null)}
                className="text-[#8C7A78] hover:text-[#1F1B17] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Assignment Bar */}
            <div className="p-4 border-b border-[#EBE2D8] bg-[#FAF6F2]/30 flex items-center gap-3 shrink-0">
              <div className="flex-1">
                <select
                  id="assign-product-select"
                  value={selectedProductIdToAdd}
                  onChange={(e) => setSelectedProductIdToAdd(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#EBE2D8] rounded-xl text-[#1F1B17] focus:outline-none focus:ring-2 focus:ring-[#4F0012]/15 focus:border-[#4F0012]"
                >
                  <option value="">Select a product to assign to this collection...</option>
                  {allProducts
                    .filter(
                      (p) => !collectionProducts.some((cp) => cp.product_id === p.id)
                    )
                    .map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.sku || "No SKU"} • {prod.status})
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="button"
                id="assign-product-btn"
                onClick={handleAddProduct}
                disabled={!selectedProductIdToAdd || addingProduct}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium transition-all disabled:opacity-40"
              >
                {addingProduct ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Assign Product</span>
              </button>
            </div>

            {/* Assigned Products List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {loadingProducts ? (
                <div className="py-8 text-center text-xs text-[#8C7A78] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#4F0012]" />
                  <span>Loading assigned products...</span>
                </div>
              ) : collectionProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8C7A78]">
                  No products are currently assigned to this collection. Select a product above to
                  add it.
                </div>
              ) : (
                <div className="divide-y divide-[#F2ECE5] border border-[#EBE2D8] rounded-xl overflow-hidden bg-white">
                  {collectionProducts.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between hover:bg-[#FAF6F2]/40 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center text-[10px] font-mono text-[#8C7A78]">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-xs text-[#1F1B17]">{item.name}</p>
                          <p className="text-[10px] font-mono text-[#8C7A78]">
                            SKU: {item.sku || "—"} • Slug: {item.slug}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                            item.status === "active"
                              ? "bg-[#ECFDF5] text-[#065F46]"
                              : "bg-[#FEF3C7] text-[#92400E]"
                          }`}
                        >
                          {item.status}
                        </span>
                        <button
                          type="button"
                          id={`remove-product-btn-${item.slug}`}
                          onClick={() => handleRemoveProduct(item.product_id)}
                          className="p-1.5 rounded-lg text-[#8C7A78] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                          title="Remove from collection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#EBE2D8] bg-[#FAF6F2]/50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setManagingCollection(null)}
                className="px-4 py-2 rounded-xl bg-white border border-[#EBE2D8] text-xs font-medium text-[#1F1B17] hover:bg-[#FAF6F2] transition-colors"
              >
                Done
              </button>
            </div>
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
                  Delete Collection: {deleteTarget.name}
                </h3>
                <p className="text-xs text-[#8C7A78]">Checking product associations...</p>
              </div>
            </div>

            {/* If has assigned products */}
            {deleteTarget.product_count > 0 ? (
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 text-xs text-[#92400E] space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
                  Deletion Blocked: Contains {deleteTarget.product_count} product(s)
                </p>
                <p>
                  To protect catalog integrity, collections with products cannot be deleted. You can
                  safely deactivate this collection instead, which preserves assignments while
                  hiding it from the storefront.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#8C7A78]">
                Are you sure you want to delete this collection? This action cannot be undone.
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

              {deleteTarget.product_count > 0 ? (
                <button
                  type="button"
                  id="deactivate-col-instead-btn"
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
                  id="confirm-delete-collection-btn"
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
