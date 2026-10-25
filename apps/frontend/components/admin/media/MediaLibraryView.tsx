"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import MediaCard from "./MediaCard";
import MediaDetailPanel from "./MediaDetailPanel";
import MediaUploadModal from "./MediaUploadModal";
import {
  fetchAdminMedia,
  type AdminMediaItem,
  type AdminMediaListResponse,
} from "@/lib/api/admin";

export default function MediaLibraryView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state
  const search = searchParams.get("search") || "";
  const usageType = (searchParams.get("usage_type") || "all") as
    | "all"
    | "product"
    | "category"
    | "unassigned";
  const ordering = searchParams.get("ordering") || "-created_at";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(12, parseInt(searchParams.get("page_size") || "24", 10));

  // Local state
  const [searchInput, setSearchInput] = useState(search);
  const [prevSearch, setPrevSearch] = useState(search);
  if (prevSearch !== search) {
    setPrevSearch(search);
    setSearchInput(search);
  }

  const [data, setData] = useState<AdminMediaListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected item for detail inspection
  const [selectedAsset, setSelectedAsset] = useState<AdminMediaItem | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Update URL helper
  const updateUrl = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === undefined || val === "" || (key === "page" && val === 1)) {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      });

      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [pathname, router, searchParams]
  );

  // Load media items
  const loadMedia = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const response = await fetchAdminMedia({
          search: search || undefined,
          usage_type: usageType,
          ordering: ordering as "-created_at" | "created_at" | "original_filename" | "-original_filename",
          page,
          page_size: pageSize,
        });
        setData(response);

        // Keep selected asset in sync if updated
        if (selectedAsset) {
          const matching = response.results.find((item) => item.id === selectedAsset.id);
          if (matching) {
            setSelectedAsset(matching);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load media assets");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, usageType, ordering, page, pageSize, selectedAsset]
  );

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        const response = await fetchAdminMedia({
          search: search || undefined,
          usage_type: usageType,
          ordering: ordering as "-created_at" | "created_at" | "original_filename" | "-original_filename",
          page,
          page_size: pageSize,
        });
        if (active) {
          setData(response);
          setError(null);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load media assets");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [search, usageType, ordering, page, pageSize]);

  // Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ search: searchInput.trim(), page: 1 });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    updateUrl({ search: "", page: 1 });
  };

  const handleUsageTypeChange = (type: "all" | "product" | "category" | "unassigned") => {
    updateUrl({ usage_type: type === "all" ? null : type, page: 1 });
  };

  const handleOrderingChange = (newOrdering: string) => {
    updateUrl({ ordering: newOrdering, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage });
  };

  const handlePageSizeChange = (newSize: number) => {
    updateUrl({ page_size: newSize, page: 1 });
  };

  // Asset mutations callback
  const handleAssetUpdated = (updated: AdminMediaItem) => {
    setSelectedAsset(updated);
    setData((prev) =>
      prev
        ? {
            ...prev,
            results: prev.results.map((i) => (i.id === updated.id ? updated : i)),
          }
        : prev
    );
  };

  const handleAssetDeleted = (deletedId: string) => {
    setSelectedAsset(null);
    setData((prev) =>
      prev
        ? {
            ...prev,
            count: Math.max(0, prev.count - 1),
            results: prev.results.filter((i) => i.id !== deletedId),
          }
        : prev
    );
    loadMedia(true);
  };

  const totalCount = data?.count ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const results = data?.results ?? [];

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="Media Library"
        description="Centralized catalog media storage, Cloudinary CDN delivery, usage tracking, and asset lifecycle."
        breadcrumbs={[{ label: "Media" }]}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadMedia(true)}
              disabled={refreshing || loading}
              className="p-2 text-xs font-medium text-[#554243] hover:text-[#1F1B17] bg-white border border-[#EBE2D8] hover:bg-[#F2ECE4] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Refresh media library"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#5A1E2D] hover:bg-[#431420] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Images
            </button>
          </div>
        }
      />

      {/* Toolbar: Search, Filter Tabs & Sorting */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-[#EBE2D8] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A78]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by alt text, filename, or Cloudinary ID..."
              className="w-full text-xs pl-9 pr-8 py-2 bg-[#FAF8F5] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-none focus:border-[#B84A62] focus:bg-white transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#8C7A78] hover:text-[#1F1B17]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#8C7A78] flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort:
            </span>
            <select
              value={ordering}
              onChange={(e) => handleOrderingChange(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-[#FAF8F5] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-none focus:border-[#B84A62]"
            >
              <option value="-created_at">Newest First</option>
              <option value="created_at">Oldest First</option>
              <option value="original_filename">Filename (A-Z)</option>
              <option value="-original_filename">Filename (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Usage Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F0EAE1]">
          <span className="text-xs text-[#8C7A78] font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter Usage:
          </span>
          <button
            type="button"
            onClick={() => handleUsageTypeChange("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              usageType === "all"
                ? "bg-[#5A1E2D] text-white shadow-2xs"
                : "bg-[#FAF8F5] text-[#554243] hover:bg-[#F2ECE4] border border-[#EBE2D8]"
            }`}
          >
            All Media
          </button>
          <button
            type="button"
            onClick={() => handleUsageTypeChange("product")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              usageType === "product"
                ? "bg-emerald-800 text-white shadow-2xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => handleUsageTypeChange("category")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              usageType === "category"
                ? "bg-amber-800 text-white shadow-2xs"
                : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            Categories
          </button>
          <button
            type="button"
            onClick={() => handleUsageTypeChange("unassigned")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              usageType === "unassigned"
                ? "bg-slate-800 text-white shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            Unassigned (Safe to Delete)
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-[#EBE2D8] rounded-xl overflow-hidden animate-pulse flex flex-col"
            >
              <div className="aspect-4/3 w-full bg-[#EDE5DB]" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-[#EDE5DB] rounded w-3/4" />
                <div className="h-2 bg-[#EDE5DB] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="text-sm font-semibold text-red-900">Failed to load media assets</h3>
          <p className="text-xs text-red-800 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => loadMedia()}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 bg-white border border-[#EBE2D8] rounded-xl text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-[#FAF0F2] text-[#B84A62] flex items-center justify-center mx-auto">
            <ImageIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-serif font-semibold text-[#1F1B17]">
              No media assets found
            </h3>
            <p className="text-xs text-[#8C7A78] max-w-sm mx-auto mt-1">
              {search || usageType !== "all"
                ? "No assets match your search or filter criteria. Try adjusting your query or resetting filters."
                : "Your media library is empty. Upload photography to Cloudinary to begin curating lookbooks."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {(search || usageType !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  updateUrl({ search: "", usage_type: null, page: 1 });
                }}
                className="px-4 py-2 text-xs font-medium text-[#554243] hover:text-[#1F1B17] bg-[#FAF8F5] border border-[#EBE2D8] hover:bg-[#F2ECE4] rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#5A1E2D] hover:bg-[#431420] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Assets
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Media Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.map((asset) => (
              <MediaCard
                key={asset.id}
                asset={asset}
                isSelected={selectedAsset?.id === asset.id}
                onSelect={(item) => setSelectedAsset(item)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white border border-[#EBE2D8] rounded-xl text-xs text-[#554243] shadow-2xs">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong>{(page - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(page * pageSize, totalCount)}</strong> of{" "}
                <strong>{totalCount}</strong> assets
              </span>
              <span className="text-[#8C7A78]">•</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
                className="text-xs px-2 py-1 bg-[#FAF8F5] border border-[#EBE2D8] rounded-md text-[#1F1B17]"
              >
                <option value={12}>12 per page</option>
                <option value={24}>24 per page</option>
                <option value={48}>48 per page</option>
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-2.5 py-1.5 rounded-lg border border-[#EBE2D8] bg-[#FAF8F5] hover:bg-[#F2ECE4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - page) <= 1
                    )
                    .map((p, idx, arr) => (
                      <span key={p} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-[#8C7A78]">…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePageChange(p)}
                          className={`min-w-7 h-7 rounded-md font-medium text-xs transition-colors ${
                            page === p
                              ? "bg-[#5A1E2D] text-white"
                              : "hover:bg-[#F2ECE4] text-[#554243]"
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-[#EBE2D8] bg-[#FAF8F5] hover:bg-[#F2ECE4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side Preview & Inspection Panel */}
      <MediaDetailPanel
        key={selectedAsset?.id || "empty"}
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onAssetUpdated={handleAssetUpdated}
        onAssetDeleted={handleAssetDeleted}
      />

      {/* Upload Modal */}
      <MediaUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={() => {
          loadMedia(true);
        }}
      />
    </div>
  );
}
