"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminProductsPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
}

export default function AdminProductsPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: AdminProductsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalCount === 0) return null;

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  // Generate visible page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#F2ECE5] text-xs text-[#8C7A78]">
      <div>
        Showing <span className="font-semibold text-[#1F1B17]">{startRecord}</span> to{" "}
        <span className="font-semibold text-[#1F1B17]">{endRecord}</span> of{" "}
        <span className="font-semibold text-[#1F1B17]">{totalCount}</span> silhouettes
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-[#EBE2D8] bg-white text-[#1F1B17] hover:bg-[#FAF6F2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((item, idx) =>
            typeof item === "number" ? (
              <button
                key={idx}
                type="button"
                onClick={() => onPageChange(item)}
                className={`min-w-8 h-8 px-2 rounded-lg text-xs font-medium transition-colors ${
                  item === page
                    ? "bg-[#4F0012] text-white border border-[#4F0012]"
                    : "bg-white border border-[#EBE2D8] text-[#1F1B17] hover:bg-[#FAF6F2]"
                }`}
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
              >
                {item}
              </button>
            ) : (
              <span key={idx} className="px-1 text-[#8C7A78] select-none">
                {item}
              </span>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-[#EBE2D8] bg-white text-[#1F1B17] hover:bg-[#FAF6F2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
