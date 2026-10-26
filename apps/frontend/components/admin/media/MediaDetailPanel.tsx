"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  FolderTree,
  Loader2,
  Lock,
  Save,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteAdminMedia,
  updateAdminMediaAltText,
  type AdminMediaItem,
} from "@/lib/api/admin";

interface MediaDetailPanelProps {
  asset: AdminMediaItem | null;
  onClose: () => void;
  onAssetUpdated: (updated: AdminMediaItem) => void;
  onAssetDeleted: (id: string) => void;
}

export default function MediaDetailPanel({
  asset,
  onClose,
  onAssetUpdated,
  onAssetDeleted,
}: MediaDetailPanelProps) {
  const [altText, setAltText] = useState(asset?.alt_text || "");
  const [isSavingAlt, setIsSavingAlt] = useState(false);
  const [altSavedFeedback, setAltSavedFeedback] = useState(false);
  const [altError, setAltError] = useState<string | null>(null);

  const [copiedUrl, setCopiedUrl] = useState(false);

  // Deletion confirmation & loading state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!asset) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(asset.image_url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSaveAltText = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAlt(true);
    setAltError(null);
    setAltSavedFeedback(false);

    try {
      const updated = await updateAdminMediaAltText(asset.id, altText);
      onAssetUpdated(updated);
      setAltSavedFeedback(true);
      setTimeout(() => setAltSavedFeedback(false), 3000);
    } catch (err: unknown) {
      setAltError(err instanceof Error ? err.message : "Failed to update alt text");
    } finally {
      setIsSavingAlt(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAdminMedia(asset.id);
      onAssetDeleted(asset.id);
      onClose();
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete media asset"
      );
      setIsDeleting(false);
    }
  };

  const formattedDate = asset.created_at
    ? new Date(asset.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown date";

  const fileSizeLabel = asset.bytes
    ? asset.bytes > 1024 * 1024
      ? `${(asset.bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(asset.bytes / 1024).toFixed(0)} KB`
    : "—";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-panel-title"
      data-lenis-prevent="true"
      className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity overscroll-contain"
    >
      <div className="w-full max-w-lg bg-white border-l border-[#EBE2D8] shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 overscroll-contain">
        {/* Panel Header */}
        <div className="px-6 py-4 border-b border-[#EBE2D8] flex items-center justify-between bg-[#FDFBF7]">
          <div>
            <h2 id="detail-panel-title" className="text-base font-serif font-semibold text-[#1F1B17]">
              Media Asset Details
            </h2>
            <p className="text-xs text-[#8C7A78] truncate max-w-xs">{asset.original_filename}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            className="p-1.5 rounded-lg text-[#8C7A78] hover:text-[#1F1B17] hover:bg-[#F2ECE4] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Image Preview */}
          <div className="relative aspect-4/3 w-full bg-[#FAF8F5] border border-[#EBE2D8] rounded-xl overflow-hidden flex items-center justify-center shadow-inner group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.image_url}
              alt={asset.alt_text || asset.original_filename}
              className="max-h-full max-w-full object-contain"
            />
            <a
              href={asset.image_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open full resolution in new tab"
              className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black text-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Quick Copy URL */}
          <div className="flex items-center gap-2 p-2.5 bg-[#FAF8F5] border border-[#EBE2D8] rounded-lg">
            <span className="text-[11px] font-mono text-[#554243] truncate flex-1 select-all">
              {asset.image_url}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="shrink-0 px-3 py-1.5 text-xs font-medium bg-white hover:bg-[#F2ECE4] text-[#1F1B17] border border-[#EBE2D8] rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#8C7A78]" />
                  <span>Copy URL</span>
                </>
              )}
            </button>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#FAF8F5] border border-[#EBE2D8] rounded-lg">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8C7A78] block mb-1">
                Dimensions
              </span>
              <span className="font-medium text-[#1F1B17]">
                {asset.width && asset.height ? `${asset.width} × ${asset.height} px` : "—"}
              </span>
            </div>
            <div className="p-3 bg-[#FAF8F5] border border-[#EBE2D8] rounded-lg">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8C7A78] block mb-1">
                Format / Size
              </span>
              <span className="font-medium text-[#1F1B17]">
                {asset.format ? asset.format.toUpperCase() : "Image"} • {fileSizeLabel}
              </span>
            </div>
            <div className="p-3 bg-[#FAF8F5] border border-[#EBE2D8] rounded-lg col-span-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8C7A78] block mb-1">
                Cloudinary Public ID
              </span>
              <span className="font-mono text-[11px] text-[#554243] break-all select-all">
                {asset.public_id || "—"}
              </span>
            </div>
            <div className="p-3 bg-[#FAF8F5] border border-[#EBE2D8] rounded-lg col-span-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8C7A78] block mb-1">
                Uploaded At
              </span>
              <span className="text-[#554243]">{formattedDate}</span>
            </div>
          </div>

          {/* Alt Text Form */}
          <form onSubmit={handleSaveAltText} className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="media-alt-input" className="text-xs font-semibold text-[#1F1B17]">
                Alternative Text (SEO &amp; Accessibility)
              </label>
              {altSavedFeedback && (
                <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved!
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                id="media-alt-input"
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Descriptive alt text for this asset..."
                className="flex-1 text-xs px-3 py-2 bg-white border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-none focus:border-[#B84A62] transition-colors"
              />
              <button
                type="submit"
                disabled={isSavingAlt}
                className="px-3.5 py-2 text-xs font-medium text-white bg-[#5A1E2D] hover:bg-[#431420] disabled:opacity-50 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isSavingAlt ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </div>
            {altError && (
              <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {altError}
              </p>
            )}
            <p className="text-[11px] text-[#8C7A78]">
              Saving synchronizes this alt text across all referencing product images and category banners.
            </p>
          </form>

          {/* Usage Relationships */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#1F1B17] uppercase tracking-wider">
              Catalog Usage References
            </h3>

            {/* If unassigned */}
            {!asset.is_used && (
              <div className="p-3.5 bg-[#FAF8F5] border border-[#EBE2D8] rounded-lg text-xs text-[#8C7A78] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#8C7A78] shrink-0" />
                <span>
                  This asset is currently <strong>unassigned</strong>. It is not referenced by any
                  product or category in the catalog.
                </span>
              </div>
            )}

            {/* Products References */}
            {asset.products && asset.products.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-[#554243] flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                  Products ({asset.products.length})
                </span>
                <div className="space-y-1">
                  {asset.products.map((p) => (
                    <Link
                      key={p.id}
                      href={`/admin/products/${p.id}`}
                      className="group p-2.5 bg-[#FAF8F5] hover:bg-[#FAF0F2] border border-[#EBE2D8] hover:border-[#EAD5D7] rounded-lg flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-[#1F1B17] truncate">{p.name}</span>
                        {p.is_primary && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                            Primary
                          </span>
                        )}
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#8C7A78] group-hover:text-[#B84A62] shrink-0 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Category References */}
            {asset.categories && asset.categories.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-[#554243] flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-amber-700" />
                  Categories ({asset.categories.length})
                </span>
                <div className="space-y-1">
                  {asset.categories.map((c) => (
                    <Link
                      key={c.id}
                      href="/admin/categories"
                      className="group p-2.5 bg-[#FAF8F5] hover:bg-[#FAF0F2] border border-[#EBE2D8] hover:border-[#EAD5D7] rounded-lg flex items-center justify-between text-xs transition-colors"
                    >
                      <span className="font-medium text-[#1F1B17] truncate">{c.name}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#8C7A78] group-hover:text-[#B84A62] shrink-0 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Protected Deletion Section */}
          <div className="pt-4 border-t border-[#EBE2D8] space-y-3">
            {asset.is_used ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Protected from Deletion</p>
                  <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                    This media asset is currently referenced by {asset.products.length} product(s)
                    and {asset.categories.length} category(ies). Remove all catalog associations
                    before deleting.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="w-full py-2.5 px-4 text-xs font-medium text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Unused Asset
                  </button>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                    <div className="flex items-start gap-2 text-red-900 text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Confirm Permanent Deletion</p>
                        <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">
                          This will permanently delete the image from Cloudinary and remove its
                          metadata record. This action cannot be undone.
                        </p>
                      </div>
                    </div>

                    {deleteError && (
                      <p className="text-[11px] text-red-700 bg-white p-2 rounded border border-red-200">
                        {deleteError}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Yes, Delete Asset"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDelete(false);
                          setDeleteError(null);
                        }}
                        disabled={isDeleting}
                        className="px-3.5 py-2 text-xs font-medium text-[#554243] hover:text-[#1F1B17] bg-white border border-[#EBE2D8] hover:bg-[#F2ECE4] rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
