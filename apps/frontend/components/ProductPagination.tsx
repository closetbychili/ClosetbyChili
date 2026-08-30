"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  return (
    <nav
      aria-label="Pagination Navigation"
      className="mt-14 sm:mt-16 flex items-center justify-center gap-1 sm:gap-2"
    >
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Link
          href={createPageUrl(currentPage - 1)}
          className="inline-flex items-center justify-center w-9 h-9 border border-[#111111]/15 bg-white text-ink hover:bg-ink hover:text-[#fff8f7] transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </Link>
      ) : (
        <span
          className="inline-flex items-center justify-center w-9 h-9 border border-[#111111]/8 bg-[#f5efe9]/50 text-ink/25 cursor-not-allowed"
          aria-disabled="true"
        >
          <ChevronLeft size={16} />
        </span>
      )}

      {/* Page Numbers */}
      {pages.map((pageNum) => {
        const isCurrent = pageNum === currentPage;
        return isCurrent ? (
          <span
            key={pageNum}
            aria-current="page"
            className="inline-flex items-center justify-center w-9 h-9 bg-ink text-[#fff8f7] text-xs font-semibold"
          >
            {pageNum}
          </span>
        ) : (
          <Link
            key={pageNum}
            href={createPageUrl(pageNum)}
            className="inline-flex items-center justify-center w-9 h-9 border border-[#111111]/15 bg-white text-ink text-xs font-semibold hover:border-ink transition-colors"
          >
            {pageNum}
          </Link>
        );
      })}

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link
          href={createPageUrl(currentPage + 1)}
          className="inline-flex items-center justify-center w-9 h-9 border border-[#111111]/15 bg-white text-ink hover:bg-ink hover:text-[#fff8f7] transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span
          className="inline-flex items-center justify-center w-9 h-9 border border-[#111111]/8 bg-[#f5efe9]/50 text-ink/25 cursor-not-allowed"
          aria-disabled="true"
        >
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
