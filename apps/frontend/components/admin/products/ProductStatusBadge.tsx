"use client";

interface ProductStatusBadgeProps {
  status: "draft" | "active" | "archived" | string;
}

export default function ProductStatusBadge({ status }: ProductStatusBadgeProps) {
  const normalized = status.toLowerCase();

  switch (normalized) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>Active</span>
        </span>
      );
    case "draft":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          <span>Draft</span>
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
          <span>Archived</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FAF6F2] text-[#8C7A78] border border-[#EBE2D8]">
          <span>{status}</span>
        </span>
      );
  }
}
