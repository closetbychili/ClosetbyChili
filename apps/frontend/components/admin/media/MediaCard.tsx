"use client";

import { useState } from "react";
import { Check, Copy, FolderTree, ShoppingBag, Sparkles } from "lucide-react";
import type { AdminMediaItem } from "@/lib/api/admin";

interface MediaCardProps {
  asset: AdminMediaItem;
  isSelected?: boolean;
  onSelect: (asset: AdminMediaItem) => void;
}

export default function MediaCard({ asset, isSelected, onSelect }: MediaCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(asset.image_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const fileSizeLabel = asset.bytes
    ? asset.bytes > 1024 * 1024
      ? `${(asset.bytes / (1024 * 1024)).toFixed(1)}MB`
      : `${(asset.bytes / 1024).toFixed(0)}KB`
    : "";

  return (
    <div
      onClick={() => onSelect(asset)}
      tabIndex={0}
      role="button"
      aria-label={`Inspect ${asset.original_filename || "media asset"}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(asset);
        }
      }}
      className={`group relative bg-white border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col ${
        isSelected
          ? "border-[#B84A62] ring-2 ring-[#B84A62]/30 shadow-md"
          : "border-[#EBE2D8] hover:border-[#B84A62] hover:shadow-md"
      }`}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-4/3 w-full bg-[#FAF8F5] overflow-hidden flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.image_url}
          alt={asset.alt_text || asset.original_filename}
          loading="lazy"
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Usage Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[85%] pointer-events-none">
          {asset.usage_type === "mixed" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 shadow-2xs backdrop-blur-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Product &amp; Cat
            </span>
          )}
          {asset.usage_type === "product" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 shadow-2xs backdrop-blur-xs flex items-center gap-1">
              <ShoppingBag className="w-2.5 h-2.5" />
              Product ({asset.products.length})
            </span>
          )}
          {asset.usage_type === "category" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 shadow-2xs backdrop-blur-xs flex items-center gap-1">
              <FolderTree className="w-2.5 h-2.5" />
              Category ({asset.categories.length})
            </span>
          )}
          {asset.usage_type === "unassigned" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 shadow-2xs backdrop-blur-xs">
              Unassigned
            </span>
          )}
        </div>

        {/* Quick Copy Button */}
        <button
          type="button"
          onClick={handleCopyUrl}
          title="Copy Image URL"
          aria-label="Copy Image URL"
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 hover:bg-white text-[#554243] hover:text-[#1F1B17] shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Card Info */}
      <div className="p-3 bg-white flex flex-col justify-between flex-1 gap-1 border-t border-[#F0EAE1]">
        <p className="text-xs font-medium text-[#1F1B17] truncate" title={asset.original_filename}>
          {asset.original_filename || "Untitled asset"}
        </p>

        <div className="flex items-center justify-between text-[11px] text-[#8C7A78]">
          <span className="truncate">
            {asset.width && asset.height ? `${asset.width}×${asset.height}` : asset.format?.toUpperCase() || "Image"}
          </span>
          {fileSizeLabel && <span>{fileSizeLabel}</span>}
        </div>
      </div>
    </div>
  );
}
