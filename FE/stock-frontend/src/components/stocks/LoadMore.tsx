'use client';

import { ChevronDown, Loader2 } from 'lucide-react';

interface LoadMoreProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

export default function LoadMore({ onLoadMore, hasMore, isLoading }: LoadMoreProps) {
  if (!hasMore) return null;

  return (
    <div className="flex flex-col items-center gap-3 mt-8">
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="flex items-center gap-2 px-6 py-3 rounded-full border border-hairline-soft text-sm font-bold text-steel hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            로딩 중...
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            더 보기
          </>
        )}
      </button>
    </div>
  );
}