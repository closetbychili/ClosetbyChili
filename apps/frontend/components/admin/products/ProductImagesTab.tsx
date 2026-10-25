"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Star,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  Check,
  ImageIcon,
  X,
  Pencil,
} from "lucide-react";
import {
  uploadAdminProductImageFile,
  updateProductImage,
  deleteProductImage,
  reorderProductImages,
  type AdminProductImage,
} from "@/lib/api/admin";

interface ProductImagesTabProps {
  productId: string;
  images: AdminProductImage[];
  onImagesChange: (images: AdminProductImage[]) => void;
  disabled?: boolean;
}

interface UploadingFile {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "uploading" | "success" | "error";
  errorMessage?: string;
}

export default function ProductImagesTab({
  productId,
  images,
  onImagesChange,
  disabled = false,
}: ProductImagesTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Alt text inline editing
  const [editingAltId, setEditingAltId] = useState<string | null>(null);
  const [editingAltValue, setEditingAltValue] = useState<string>("");

  // Confirmation modal for deleting an image
  const [imageToDelete, setImageToDelete] = useState<AdminProductImage | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setErrorBanner(null);

    // Validate files
    const validExtensions = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    const newUploads: UploadingFile[] = [];

    files.forEach((file, idx) => {
      if (!validExtensions.includes(file.type)) {
        setErrorBanner(`"${file.name}" is not a supported format. Please use JPEG, PNG, WebP, AVIF, or GIF.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setErrorBanner(`"${file.name}" exceeds 5MB maximum file size.`);
        return;
      }

      newUploads.push({
        id: `${file.name}-${file.lastModified}-${idx}`,
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 10,
        status: "uploading",
      });
    });

    if (!newUploads.length) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadingFiles((prev) => [...prev, ...newUploads]);

    // Reset input so re-selecting same files triggers change
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Upload files sequentially to maintain order and avoid race conditions
    for (const item of newUploads) {
      await processUpload(item);
    }
  };

  const processUpload = async (uploadItem: UploadingFile) => {
    try {
      setUploadingFiles((prev) =>
        prev.map((u) => (u.id === uploadItem.id ? { ...u, progress: 50, status: "uploading", errorMessage: undefined } : u))
      );

      const defaultAlt = uploadItem.file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .trim();
      const isFirstImage = images.length === 0;

      const created = await uploadAdminProductImageFile(productId, uploadItem.file, {
        alt_text: defaultAlt,
        is_primary: isFirstImage,
        ordering: images.length,
      });

      // Update state to success
      setUploadingFiles((prev) =>
        prev.map((u) => (u.id === uploadItem.id ? { ...u, progress: 100, status: "success" } : u))
      );

      // Append persisted image to gallery
      onImagesChange([...images, created]);

      // Remove from upload queue after brief animation
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((u) => u.id !== uploadItem.id));
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image.";
      setUploadingFiles((prev) =>
        prev.map((u) =>
          u.id === uploadItem.id ? { ...u, status: "error", errorMessage: msg } : u
        )
      );
    }
  };

  const handleRetryUpload = (uploadItem: UploadingFile) => {
    setUploadingFiles((prev) =>
      prev.map((u) =>
        u.id === uploadItem.id ? { ...u, status: "uploading", progress: 20, errorMessage: undefined } : u
      )
    );
    processUpload(uploadItem);
  };

  const handleSetPrimary = async (targetImage: AdminProductImage) => {
    if (targetImage.is_primary || actionLoading) return;
    try {
      setActionLoading(`primary-${targetImage.id}`);
      await updateProductImage(productId, targetImage.id, { is_primary: true });

      // Update local state: target is primary, all others is_primary=false
      const updated = images.map((img) => ({
        ...img,
        is_primary: img.id === targetImage.id,
      }));
      onImagesChange(updated);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to set primary image.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (actionLoading) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newOrder = [...images];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    // Prepare payload
    const payload = newOrder.map((img, idx) => ({ id: img.id, ordering: idx }));

    try {
      setActionLoading("reorder");
      const reordered = await reorderProductImages(productId, payload);
      onImagesChange(reordered);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to reorder images.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartEditAlt = (img: AdminProductImage) => {
    setEditingAltId(img.id);
    setEditingAltValue(img.alt_text || "");
  };

  const handleSaveAlt = async (img: AdminProductImage) => {
    if (actionLoading) return;
    const trimmed = editingAltValue.trim();
    try {
      setActionLoading(`alt-${img.id}`);
      const updated = await updateProductImage(productId, img.id, { alt_text: trimmed });
      onImagesChange(
        images.map((item) => (item.id === img.id ? { ...item, alt_text: updated.alt_text } : item))
      );
      setEditingAltId(null);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to update alt text.");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!imageToDelete || actionLoading) return;
    try {
      setActionLoading(`delete-${imageToDelete.id}`);
      await deleteProductImage(productId, imageToDelete.id);
      const remaining = images.filter((img) => img.id !== imageToDelete.id);

      // If the deleted image was primary and there are remaining images, make the first one primary
      if (imageToDelete.is_primary && remaining.length > 0) {
        remaining[0] = { ...remaining[0], is_primary: true };
      }
      onImagesChange(remaining);
      setImageToDelete(null);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to delete image.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="product-images-tab">
      {/* Upload Zone */}
      <div className="bg-white rounded-2xl border border-[#EBE2D8] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F5EFEA]">
          <div>
            <h3 className="text-sm font-semibold text-[#1F1B17]">Product Gallery</h3>
            <p className="text-xs text-[#786967] mt-0.5">
              Upload high-resolution photography via Cloudinary. The primary image is displayed on catalog cards.
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="product-gallery-file-input"
              disabled={disabled}
            />
            <label
              htmlFor="product-gallery-file-input"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium cursor-pointer transition-colors shadow-sm ${
                disabled ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Images</span>
            </label>
          </div>
        </div>

        {errorBanner && (
          <div className="mt-4 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between text-xs text-[#DC2626]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="p-1 hover:bg-black/5 rounded text-[#DC2626]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Uploading progress list */}
        {uploadingFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-[11px] font-semibold text-[#8C7A78] uppercase tracking-wider">
              Upload Progress
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {uploadingFiles.map((up) => (
                <div
                  key={up.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-[#EBE2D8] bg-[#FAF6F2]"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/5 shrink-0">
                    <img
                      src={up.previewUrl}
                      alt={up.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-[#1F1B17] truncate">{up.file.name}</span>
                      <span className="text-[10px] text-[#8C7A78]">
                        {(up.file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>

                    {up.status === "uploading" && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#EBE2D8] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#4F0012] rounded-full transition-all duration-300"
                            style={{ width: `${up.progress}%` }}
                          />
                        </div>
                        <Loader2 className="w-3 h-3 text-[#4F0012] animate-spin" />
                      </div>
                    )}

                    {up.status === "success" && (
                      <div className="flex items-center gap-1 text-[11px] text-[#16A34A]">
                        <Check className="w-3 h-3" />
                        <span>Uploaded & Saved</span>
                      </div>
                    )}

                    {up.status === "error" && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#DC2626] truncate" title={up.errorMessage}>
                          {up.errorMessage || "Upload failed"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRetryUpload(up)}
                          className="text-[10px] text-[#4F0012] font-semibold underline hover:no-underline shrink-0"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gallery items */}
        {images.length === 0 && uploadingFiles.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center mx-auto mb-3 text-[#8C7A78]">
              <ImageIcon className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-[#1F1B17]">No images uploaded yet</p>
            <p className="text-[11px] text-[#8C7A78] max-w-xs mx-auto mt-1">
              Add at least one product photo before publishing. Supported formats: JPEG, PNG, WebP, AVIF, GIF (up to 5MB).
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div
                key={img.id}
                data-testid={`gallery-image-${img.id}`}
                className={`group relative rounded-xl border overflow-hidden bg-[#FAF6F2] transition-all flex flex-col ${
                  img.is_primary
                    ? "border-[#4F0012] ring-2 ring-[#4F0012]/15 shadow-sm"
                    : "border-[#EBE2D8] hover:border-[#D5C7B8]"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-3/4 w-full bg-[#FAF6F2] overflow-hidden">
                  <img
                    src={img.image_url}
                    alt={img.alt_text || "Product image"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Primary Badge */}
                  {img.is_primary && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4F0012] text-white text-[10px] font-semibold tracking-wider uppercase shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-white" />
                      Primary
                    </span>
                  )}

                  {/* Order Index Badge */}
                  <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-mono">
                    {idx + 1}
                  </span>
                </div>

                {/* Alt Text Section */}
                <div className="p-2.5 bg-[#FAF6F2] border-t border-[#EBE2D8] text-xs">
                  {editingAltId === img.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingAltValue}
                        onChange={(e) => setEditingAltValue(e.target.value)}
                        placeholder="Image description (Alt)"
                        className="flex-1 px-2 py-1 text-[11px] bg-white border border-[#D5C7B8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#4F0012]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveAlt(img)}
                        disabled={actionLoading === `alt-${img.id}`}
                        className="p-1 rounded bg-[#4F0012] text-white hover:bg-[#6D1826] transition-colors"
                        title="Save alt text"
                      >
                        {actionLoading === `alt-${img.id}` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAltId(null)}
                        className="p-1 rounded border border-[#D5C7B8] hover:bg-white text-[#786967] transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] text-[#786967] truncate italic flex-1" title={img.alt_text}>
                        {img.alt_text || "No alt text set"}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleStartEditAlt(img)}
                        className="p-1 hover:bg-black/5 rounded text-[#8C7A78] hover:text-[#1F1B17] transition-colors shrink-0"
                        title="Edit alt text"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Controls */}
                <div className="p-2.5 bg-white border-t border-[#EBE2D8] flex items-center justify-between text-xs mt-auto">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0 || !!actionLoading}
                      onClick={() => handleMove(idx, "up")}
                      className="p-1 rounded hover:bg-[#FAF6F2] text-[#8C7A78] hover:text-[#1F1B17] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Move earlier"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1 || !!actionLoading}
                      onClick={() => handleMove(idx, "down")}
                      className="p-1 rounded hover:bg-[#FAF6F2] text-[#8C7A78] hover:text-[#1F1B17] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Move later"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Set Primary & Delete */}
                  <div className="flex items-center gap-1">
                    {!img.is_primary && (
                      <button
                        type="button"
                        disabled={!!actionLoading}
                        onClick={() => handleSetPrimary(img)}
                        className="p-1 rounded hover:bg-[#FAF6F2] text-[#8C7A78] hover:text-[#D97706] transition-colors"
                        title="Make Primary Image"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!!actionLoading}
                      onClick={() => setImageToDelete(img)}
                      className="p-1 rounded hover:bg-[#FEF2F2] text-[#8C7A78] hover:text-[#DC2626] transition-colors"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {imageToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#EBE2D8] animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center mx-auto mb-3 text-[#DC2626]">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-center text-[#1F1B17]">
              Remove Gallery Image?
            </h3>
            <p className="text-xs text-[#786967] text-center mt-1.5 leading-relaxed">
              Are you sure you want to delete this image from the product gallery? This will permanently remove the asset and metadata.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setImageToDelete(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-[#D5C7B8] hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-image-btn"
                onClick={confirmDelete}
                disabled={!!actionLoading}
                className="flex-1 py-2 px-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-medium text-white transition-colors flex items-center justify-center gap-1.5"
              >
                {actionLoading?.startsWith("delete-") ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Image</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
