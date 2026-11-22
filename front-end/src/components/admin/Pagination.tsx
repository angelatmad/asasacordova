interface PaginationProps {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

// Controls page changes using page numbers supplied by Laravel's paginator.
export function Pagination({
  page,
  lastPage,
  total,
  perPage,
  onPageChange,
}: PaginationProps) {
  // Nothing to click when all records fit on one page.
  if (lastPage <= 1 && total <= perPage) return null;

  // Convert the current page into friendly "showing x-y of total" numbers.
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);
  const pages: number[] = [];

  // Show the first, last, and nearby pages so the list stays short.
  for (let current = 1; current <= lastPage; current += 1) {
    if (
      current === 1 ||
      current === lastPage ||
      Math.abs(current - page) <= 1
    ) {
      pages.push(current);
    }
  }

  return (
    <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-[#7A585B]">
        Showing <span className="font-semibold text-[#58111A]">{start}-{end}</span> of{" "}
        <span className="font-semibold text-[#58111A]">{total}</span>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {/* Disable Previous/Next at the ends to avoid invalid page numbers. */}
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-full border border-[#EBD5D3] bg-white px-3.5 py-2 text-xs font-semibold text-[#58111A] transition hover:border-[#800020] hover:bg-[#FFF0F2] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {/* aria-current marks the active page for styling and screen readers. */}
        {pages.map((current, index) => (
          <span key={current} className="flex items-center gap-1.5">
            {/* "..." means some page numbers were skipped. */}
            {index > 0 && current - pages[index - 1] > 1 && (
              <span className="px-1 text-xs text-[#7A585B]">...</span>
            )}
            <button
              type="button"
              onClick={() => onPageChange(current)}
              aria-current={current === page ? "page" : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
                current === page
                  ? "bg-[#800020] text-white shadow-md"
                  : "border border-[#EBD5D3] bg-white text-[#58111A] hover:border-[#800020] hover:bg-[#FFF0F2]"
              }`}
            >
              {current}
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          className="rounded-full border border-[#EBD5D3] bg-white px-3.5 py-2 text-xs font-semibold text-[#58111A] transition hover:border-[#800020] hover:bg-[#FFF0F2] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
