'use client';

import { resolveSectorDisplay } from '@/lib/sectorMap';
import { searchStocks } from '@/services/stockCatalogApi';
import type { StockCatalogItem } from '@/types/stock';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';

const fetcher = async (query: string): Promise<StockCatalogItem[]> => {
  const res = await searchStocks({ query, size: 8 });
  return res.content;
};

export default function StockSearchBar({ inline }: { inline?: boolean } = {}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: results, isLoading } = useSWR(
    debouncedQuery.trim().length >= 1 ? `stock-search-${debouncedQuery}` : null,
    () => fetcher(debouncedQuery),
    { dedupingInterval: 500 }
  );

  const showDropdown = isFocused && (results?.length ?? 0) > 0;

  const handleSelect = useCallback(
    (code: string) => {
      setIsFocused(false);
      setQuery('');
      setDebouncedQuery('');
      router.push(`/stock/${code}`);
    },
    [router]
  );

  if (inline) {
    return (
      <div ref={containerRef} className="relative flex-1 min-w-0 flex items-center gap-2">
        <Search className="w-4 h-4 text-steel flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="종목명 또는 코드 검색"
          className="bg-transparent border-none outline-none text-sm w-full placeholder:text-steel"
        />
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-hairline-soft rounded-xl shadow-lg z-50 max-h-60 overflow-auto">
            {isLoading && (
              <div className="px-4 py-3 text-sm text-steel">검색 중...</div>
            )}
            {results?.map((item) => (
              <button
                key={item.stockCode}
                type="button"
                onClick={() => handleSelect(item.stockCode)}
                className="w-full text-left px-4 py-2.5 hover:bg-surface-soft transition-colors text-sm"
              >
                <span className="font-bold">{item.name}</span>
                <span className="text-steel ml-2">({item.stockCode})</span>
                {item.sector && (
                  <span className="text-stone ml-2 text-xs">{resolveSectorDisplay(item.sector)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 bg-surface-soft px-4 py-2.5 rounded-full">
        <Search className="w-4 h-4 text-steel flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="종목명 또는 코드 검색"
          className="bg-transparent border-none outline-none text-sm w-full placeholder:text-steel"
        />
      </div>
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-hairline-soft rounded-xl shadow-lg z-50 max-h-60 overflow-auto">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-steel">검색 중...</div>
          )}
          {results?.map((item) => (
            <button
              key={item.stockCode}
              type="button"
              onClick={() => handleSelect(item.stockCode)}
              className="w-full text-left px-4 py-2.5 hover:bg-surface-soft transition-colors text-sm"
            >
              <span className="font-bold">{item.name}</span>
              <span className="text-steel ml-2">({item.stockCode})</span>
              {item.sector && (
                <span className="text-stone ml-2 text-xs">{resolveSectorDisplay(item.sector)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}