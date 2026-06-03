import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { getTotalPages } from "@/utils/paginationUtils";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];

  if (currentPage <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push("...");
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 3) {
    pages.push(1);
    pages.push("...");
    for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push("...");
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push("...");
    pages.push(totalPages);
  }

  return pages;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  className = "",
}: PaginationProps) {
  const totalPages = getTotalPages(totalItems, pageSize);

  if (totalItems === 0 || totalPages <= 1) return null;

  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);
  const pageNumbers = getPageNumbers(safePage, totalPages);

  const btnBase =
    "inline-flex size-10 items-center justify-center rounded-xl border border-white/10 text-sm font-black transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0";

  return (
    <nav
      className={[
        "flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between",
        className,
      ].join(" ")}
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-400" aria-live="polite">
        Showing{" "}
        <span className="font-black text-white">
          {start}–{end}
        </span>{" "}
        of <span className="font-black text-white">{totalItems}</span>
      </p>

      <div className="flex items-center gap-1.5">
        {/* Prev */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className={`${btnBase} bg-white/[0.055] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.09]`}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex size-10 items-center justify-center text-slate-500"
            >
              <MoreHorizontal className="size-4" />
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === safePage ? "page" : undefined}
              className={[
                btnBase,
                p === safePage
                  ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                  : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white",
              ].join(" ")}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className={`${btnBase} bg-white/[0.055] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.09]`}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
