'use client';

import OverseasStockCard from '@/components/overseas/OverseasStockCard';
import LoadMore from '@/components/stocks/LoadMore';
import { extractOverseasInitialPricesFromCatalog, getOverseasStocks } from '@/services/overseasStockApi';
import type { OverseasStockCatalogWithPrice, OverseasStockCatalogWithPriceResponse, OverseasStockPrice } from '@/types/overseasStock';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';

interface OverseasStockCatalogInfiniteProps {
  initialData: OverseasStockCatalogWithPriceResponse;
  initialPrices?: Record<string, OverseasStockPrice>;
  exchangeCode?: string;
  country?: string;
  sector?: string;
  sort?: string;
}

const PAGE_SIZE = 20;

export default function OverseasStockCatalogInfinite({
  initialData,
  initialPrices,
  exchangeCode,
  country,
  sector,
  sort,
}: OverseasStockCatalogInfiniteProps) {
  const filterKeyStr = `${exchangeCode ?? ''}-${country ?? ''}-${sector ?? ''}-${sort ?? ''}`;
  const totalPages = initialData.totalPages;

  const [currentPage, setCurrentPage] = useState(0);
  const [loadedPages, setLoadedPages] = useState<OverseasStockCatalogWithPriceResponse[]>([initialData]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKeyStr);
  const [priceUpdates, setPriceUpdates] = useState<Record<string, OverseasStockPrice>>(initialPrices ?? {});


  if (prevFilterKey !== filterKeyStr) {
    setPrevFilterKey(filterKeyStr);
    setCurrentPage(0);
    setLoadedPages([initialData]);
    setPriceUpdates(initialPrices ?? {});
  }

  const nextPage = currentPage + 1;
  const hasNext = nextPage < totalPages;

  const allItems: OverseasStockCatalogWithPrice[] = useMemo(
    () => {
      const seen = new Set<string>();
      return loadedPages.flatMap((p) => p.content).filter((item) => {
        const key = `${item.ticker}-${item.exchangeCode}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    [loadedPages]
  );

  const lastScrollYRef = useRef<number>(0);
  const isRestoringRef = useRef<boolean>(false);
  const lastLoadedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isLoadingMore) {
      lastLoadedTimeRef.current = Date.now();
    }
  }, [isLoadingMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (isRestoringRef.current) return;

      if (window.scrollY > 0) {
        lastScrollYRef.current = window.scrollY;
      } else if (window.scrollY === 0 && lastScrollYRef.current > 100) {
        const recentlyLoaded = Date.now() - lastLoadedTimeRef.current < 1500;
        if (isLoadingMore || recentlyLoaded) {
          isRestoringRef.current = true;
          window.scrollTo(0, lastScrollYRef.current);
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 50);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore]);


  const prefetchKey = hasNext && !isLoadingMore
    ? [`overseas-prefetch`, nextPage, exchangeCode, country, sector, sort]
    : null;

  const { data: prefetchedPage } = useSWR<OverseasStockCatalogWithPriceResponse>(
    prefetchKey,
    () => getOverseasStocks({ page: nextPage, size: PAGE_SIZE, exchangeCode, country, sector, sort }),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasNext) return;

    if (prefetchedPage) {
      setLoadedPages((prev) => [...prev, prefetchedPage]);
      setCurrentPage(nextPage);
      const prefetchedPrices = extractOverseasInitialPricesFromCatalog(prefetchedPage);
      if (Object.keys(prefetchedPrices).length > 0) {
        setPriceUpdates((prev) => ({ ...prev, ...prefetchedPrices }));
      }
      return;
    }

    setIsLoadingMore(true);
    try {
      const result = await getOverseasStocks({ page: nextPage, size: PAGE_SIZE, exchangeCode, country, sector, sort });
      setLoadedPages((prev) => [...prev, result]);
      setCurrentPage(nextPage);
      const newPrices = extractOverseasInitialPricesFromCatalog(result);
      if (Object.keys(newPrices).length > 0) {
        setPriceUpdates((prev) => ({ ...prev, ...newPrices }));
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasNext, prefetchedPage, nextPage, exchangeCode, country, sector, sort]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {allItems.map((item) => {
          const key = `${item.ticker}-${item.exchangeCode}`;
          return (
            <OverseasStockCard key={key} item={item} initialPrice={priceUpdates[key]} />
          );
        })}
      </div>

      {allItems.length === 0 && (
        <div className="text-center py-20 text-steel">
          <p className="text-lg font-bold mb-2">종목을 찾을 수 없습니다</p>
          <p className="text-sm">필터를 변경하거나 검색어를 다시 입력해보세요.</p>
        </div>
      )}

      <LoadMore onLoadMore={loadMore} hasMore={hasNext} isLoading={isLoadingMore} />
    </>
  );
}