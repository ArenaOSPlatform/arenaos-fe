import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function getTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;

  return items.slice(start, start + pageSize);
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

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <span>
        Showing {start}-{end} of {totalItems}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="min-w-20 text-center text-xs font-black uppercase tracking-[0.2em] text-white/45">
          {page}/{totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
