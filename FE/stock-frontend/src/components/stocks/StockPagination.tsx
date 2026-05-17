import Link from 'next/link';

interface StockPaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}

export default function StockPagination({ currentPage, totalPages, basePath, searchParams }: StockPaginationProps) {
  if (totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set('page', String(page));
    return `${basePath}?${params.toString()}`;
  };

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) pages.push('...');
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 3) pages.push('...');
    pages.push(totalPages - 1);
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-8">
      {currentPage > 0 && (
        <Link
          href={buildUrl(currentPage - 1)}
          className="px-3 py-2 rounded-full text-sm font-bold text-steel hover:bg-surface-soft transition-colors"
        >
          이전
        </Link>
      )}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dot-${i}`} className="px-2 text-stone text-sm">...</span>
        ) : (
          <Link
            key={p}
            href={buildUrl(p)}
            className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${
              p === currentPage
                ? 'bg-ink text-white'
                : 'text-steel hover:bg-surface-soft'
            }`}
          >
            {p + 1}
          </Link>
        )
      )}
      {currentPage < totalPages - 1 && (
        <Link
          href={buildUrl(currentPage + 1)}
          className="px-3 py-2 rounded-full text-sm font-bold text-steel hover:bg-surface-soft transition-colors"
        >
          다음
        </Link>
      )}
    </nav>
  );
}