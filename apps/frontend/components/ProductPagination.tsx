"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface ProductPaginationProps {
  totalCount: number;
  pageSize: number;
  currentPage: number;
}

export default function ProductPagination({
  totalCount,
  pageSize,
  currentPage,
}: ProductPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (pageNumber === 1) {
      params.delete("page");
    } else {
      params.set("page", String(pageNumber));
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const currentCount = Math.min(totalCount, currentPage * pageSize);
  const progressPercent = Math.min(100, Math.round((currentCount / totalCount) * 100));

  return (
    <nav
      aria-label="Pagination Navigation"
      className="flex flex-col items-center justify-center gap-4 pt-12 pb-6 w-full"
    >
      {/* Editorial Progress Bar Indicator */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
          Showing {currentCount} of {totalCount} Silhouettes
        </span>
        <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Page Controls */}
      <div className="flex items-center gap-1 font-label-ui text-label-ui mt-2">
        {/* Previous Button */}
        {currentPage > 1 ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="w-9 h-9 bg-surface text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center border border-outline-variant/40"
            aria-label="Previous page"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </Link>
        ) : (
          <span
            className="w-9 h-9 bg-surface text-on-surface/30 flex items-center justify-center border border-outline-variant/20 cursor-not-allowed"
            aria-disabled="true"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </span>
        )}

        {/* Page Numbers */}
        {pages.map((pageNum) => {
          const isCurrent = pageNum === currentPage;
          return isCurrent ? (
            <span
              key={pageNum}
              aria-current="page"
              className="w-9 h-9 bg-primary text-on-primary font-bold shadow-sm flex items-center justify-center"
            >
              {pageNum}
            </span>
          ) : (
            <Link
              key={pageNum}
              href={createPageUrl(pageNum)}
              className="w-9 h-9 bg-surface text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center border border-outline-variant/40"
            >
              {pageNum}
            </Link>
          );
        })}

        {/* Next Button */}
        {currentPage < totalPages ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            className="w-9 h-9 bg-surface text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center border border-outline-variant/40"
            aria-label="Next page"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        ) : (
          <span
            className="w-9 h-9 bg-surface text-on-surface/30 flex items-center justify-center border border-outline-variant/20 cursor-not-allowed"
            aria-disabled="true"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </span>
        )}
      </div>
    </nav>
  );
}
