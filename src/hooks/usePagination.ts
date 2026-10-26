import { useState, useMemo, useCallback } from "react";

interface UsePaginationOptions {
  total: number;
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  totalPages: number;
  start: number;
  end: number;
  hasNext: boolean;
  hasPrev: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  /**
   * Returns page numbers to display, with ellipsis markers (-1).
   * Example: [1, -1, 4, 5, 6, -1, 10]
   */
  pageNumbers: number[];
}

export function usePagination({
  total,
  pageSize: initialPageSize = 20,
  initialPage = 1,
}: UsePaginationOptions): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(initialPageSize);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const clampedPage = useMemo(() => Math.max(1, Math.min(page, totalPages)), [page, totalPages]);

  const start = useMemo(() => (clampedPage - 1) * pageSize, [clampedPage, pageSize]);
  const end = useMemo(() => Math.min(start + pageSize, total), [start, pageSize, total]);

  const hasNext = clampedPage < totalPages;
  const hasPrev = clampedPage > 1;

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNext) setPage((p) => p + 1);
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) setPage((p) => p - 1);
  }, [hasPrev]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const totalVisible = 7;

    if (totalPages <= totalVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // Always show first page
    pages.push(1);

    let rangeStart = Math.max(2, clampedPage - 1);
    let rangeEnd = Math.min(totalPages - 1, clampedPage + 1);

    if (clampedPage <= 3) {
      rangeStart = 2;
      rangeEnd = Math.min(totalPages - 1, 5);
    }
    if (clampedPage >= totalPages - 2) {
      rangeStart = Math.max(2, totalPages - 4);
      rangeEnd = totalPages - 1;
    }

    if (rangeStart > 2) pages.push(-1); // ellipsis

    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);

    if (rangeEnd < totalPages - 1) pages.push(-1); // ellipsis

    pages.push(totalPages);

    return pages;
  }, [totalPages, clampedPage]);

  return {
    page: clampedPage,
    pageSize,
    totalPages,
    start,
    end,
    hasNext,
    hasPrev,
    goToPage,
    nextPage,
    prevPage,
    pageNumbers,
  };
}