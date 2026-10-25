"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminOrdersPaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function AdminOrdersPagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: AdminOrdersPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalCount <= pageSize) {
    return (
      <div className="mt-4 flex items-center justify-between text-xs text-[#8C7A78] px-1">
        <span>
          Showing all <strong className="text-[#1F1B17] font-semibold">{totalCount}</strong>{" "}
          order{totalCount === 1 ? "" : "s"}
        </span>
      </div>
    );
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Generate pagination window
  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    if (currentPage > 3) {
      pages.push("...");
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) {
      pages.push("...");
    }
    pages.push(totalPages);
  }

  return (
    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8C7A78] px-1">
      <div>
        Showing <strong className="text-[#1F1B17] font-semibold">{startItem}</strong> to{" "}
        <strong className="text-[#1F1B17] font-semibold">{endItem}</strong> of{" "}
        <strong className="text-[#1F1B17] font-semibold">{totalCount}</strong> orders
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#EBE2D8] bg-white text-[#1F1B17] hover:bg-[#FAF6F2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="w-8 h-8 inline-flex items-center justify-center text-[#8C7A78]"
              >
                …
              </span>
            );
          }

          const pageNum = p as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-current={isActive ? "page" : undefined}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[#4F0012] text-white border border-[#4F0012]"
                  : "bg-white border border-[#EBE2D8] text-[#1F1B17] hover:bg-[#FAF6F2]"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#EBE2D8] bg-white text-[#1F1B17] hover:bg-[#FAF6F2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
