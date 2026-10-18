"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { uploadAdminMedia, type MediaUploadResponse } from "@/lib/api/admin";

interface UploadFileItem {
  id: string;
  file: File;
  altText: string;
  status: "queued" | "uploading" | "success" | "error";
  progress: number;
  errorMessage?: string;
  result?: MediaUploadResponse;
}

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];

export default function MediaUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: MediaUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [items, setItems] = useState<UploadFileItem[]>([]);
  const [isUploadingAll, setIsUploadingAll] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: UploadFileItem[] = [];

    Array.from(files).forEach((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

      let errorMsg: string | undefined;
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errorMsg = `Unsupported format (${ext}). Allowed: JPEG, PNG, WebP, AVIF, GIF`;
      } else if (file.size > MAX_FILE_SIZE) {
        errorMsg = `Exceeds 5MB size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`;
      }

      newItems.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        altText: baseName,
        status: errorMsg ? "error" : "queued",
        progress: 0,
        errorMessage: errorMsg,
      });
    });

    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemAlt = (id: string, altText: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, altText } : item))
    );
  };

  const uploadSingleItem = async (item: UploadFileItem): Promise<boolean> => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: "uploading", progress: 40, errorMessage: undefined } : i
      )
    );

    try {
      const res = await uploadAdminMedia(item.file, item.altText);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "success", progress: 100, result: res }
            : i
        )
      );
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "error", progress: 0, errorMessage: msg }
            : i
        )
      );
      return false;
    }
  };

  const handleUploadAll = async () => {
    const queuedItems = items.filter((i) => i.status === "queued" || i.status === "error");
    if (queuedItems.length === 0) return;

    setIsUploadingAll(true);
    let anySuccess = false;

    for (const item of queuedItems) {
      // Skip items with permanent validation errors (extension or size)
      if (item.errorMessage && (item.errorMessage.includes("limit") || item.errorMessage.includes("Unsupported"))) {
        continue;
      }
      const success = await uploadSingleItem(item);
      if (success) anySuccess = true;
    }

    setIsUploadingAll(false);
    if (anySuccess) {
      onUploadComplete();
    }
  };

  const handleRetryItem = async (item: UploadFileItem) => {
    const success = await uploadSingleItem(item);
    if (success) {
      onUploadComplete();
    }
  };

  const completedCount = items.filter((i) => i.status === "success").length;
  const errorCount = items.filter((i) => i.status === "error").length;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl bg-white border border-[#EBE2D8] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EBE2D8] flex items-center justify-between bg-[#FDFBF7]">
          <div>
            <h2 id="upload-modal-title" className="text-lg font-serif font-semibold text-[#1F1B17]">
              Upload Media Assets
            </h2>
            <p className="text-xs text-[#8C7A78] mt-0.5">
              Upload high-resolution photography to Cloudinary and catalog storage (max 5MB each).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload modal"
            className="p-1.5 rounded-lg text-[#8C7A78] hover:text-[#1F1B17] hover:bg-[#F2ECE4] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? "border-[#B84A62] bg-[#FAF2F3]"
                : "border-[#EAD5D7] bg-[#FDFBF7] hover:border-[#B84A62] hover:bg-[#FAF4F5]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-[#FAF0F2] text-[#B84A62] flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-[#1F1B17]">
              Drag &amp; drop images here, or <span className="text-[#B84A62] underline">browse</span>
            </p>
            <p className="text-xs text-[#8C7A78] mt-1.5">
              Supports JPEG, PNG, WebP, AVIF, GIF up to 5MB. Multiple selection enabled.
            </p>
          </div>

          {/* Selected Files Queue */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#8C7A78] font-medium px-1">
                <span>Selected Assets ({items.length})</span>
                {completedCount > 0 && (
                  <span className="text-emerald-700 font-semibold">
                    {completedCount} uploaded successfully
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#FAF8F5] border border-[#EBE2D8] rounded-lg flex items-center gap-3 transition-all"
                  >
                    <div className="w-10 h-10 rounded bg-[#EDE5DB] flex items-center justify-center shrink-0 text-[#8C7A78]">
                      <FileImage className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-[#1F1B17] truncate">
                          {item.file.name}
                        </p>
                        <span className="text-[10px] text-[#8C7A78] shrink-0">
                          {(item.file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>

                      {/* Alt text edit */}
                      <input
                        type="text"
                        value={item.altText}
                        onChange={(e) => updateItemAlt(item.id, e.target.value)}
                        placeholder="Alt text..."
                        disabled={item.status === "uploading" || item.status === "success"}
                        className="mt-1 w-full text-[11px] px-2 py-0.5 rounded border border-[#EBE2D8] bg-white text-[#1F1B17] focus:outline-none focus:border-[#B84A62]"
                      />

                      {/* Error message */}
                      {item.errorMessage && (
                        <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.errorMessage}</span>
                        </p>
                      )}

                      {/* Upload progress */}
                      {item.status === "uploading" && (
                        <div className="w-full bg-[#EBE2D8] h-1 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-[#B84A62] h-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Status & Actions */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {item.status === "success" && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                      {item.status === "uploading" && (
                        <Loader2 className="w-4 h-4 text-[#B84A62] animate-spin" />
                      )}
                      {item.status === "error" && (
                        <button
                          type="button"
                          onClick={() => handleRetryItem(item)}
                          disabled={isUploadingAll}
                          title="Retry upload"
                          className="p-1 rounded text-[#B84A62] hover:bg-[#FAF0F2] transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      {item.status !== "uploading" && item.status !== "success" && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          title="Remove from queue"
                          className="p-1 rounded text-[#8C7A78] hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#EBE2D8] bg-[#FDFBF7] flex items-center justify-between">
          <div className="text-xs text-[#8C7A78]">
            {items.length > 0 && (
              <span>
                {completedCount} / {items.length} uploaded
                {errorCount > 0 && <span className="text-red-600 ml-1.5">({errorCount} failed)</span>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploadingAll}
              className="px-4 py-2 text-xs font-medium text-[#554243] hover:text-[#1F1B17] hover:bg-[#F2ECE4] rounded-lg transition-colors"
            >
              {completedCount === items.length && items.length > 0 ? "Done" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleUploadAll}
              disabled={
                isUploadingAll ||
                items.length === 0 ||
                items.every((i) => i.status === "success")
              }
              className="px-5 py-2 text-xs font-medium text-white bg-[#5A1E2D] hover:bg-[#431420] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {isUploadingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Upload All ({items.filter((i) => i.status === "queued" || i.status === "error").length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
