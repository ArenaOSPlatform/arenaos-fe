const PAGE_CLAMP_MIN = 1;

export function getTotalPages(totalItems: number, pageSize: number) {
  return Math.max(PAGE_CLAMP_MIN, Math.ceil(totalItems / pageSize));
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;

  return items.slice(start, start + pageSize);
}
