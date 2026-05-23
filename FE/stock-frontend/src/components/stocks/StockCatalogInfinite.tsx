'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { getStocks, extractInitialPricesFromCatalog, getBatchStockPrices } from '@/services/stockCatalogApi';
import { useStockPriceStreamBatch } from '@/hooks/useStockPriceStream';
import StockCatalogCard from '@/components/stocks/StockCatalogCard';
import LoadMore from '@/components/stocks/LoadMore';
import type { StockCatalogWithPrice, StockCatalogWithPriceResponse } from '@/types/stock';
import type { MappedStockPrice } from '@/lib/api';

interface StockCatalogInfiniteProps {
  initialData: StockCatalogWithPriceResponse;
  initialPrices?: Record<string, MappedStockPrice>;
  marketType?: string;
  sector?: string;
  sign?: string;
  sort?: string;
}

const PAGE_SIZE = 20;

const CLIENT_SORT_FIELDS = new Set<string>();

function sortItems(
  items: StockCatalogWithPrice[],
  prices: Record<string, MappedStockPrice>,
  sort: string | undefined,
): StockCatalogWithPrice[] {
  if (!sort) return items;

  const [field, dir] = sort.includes(',') ? sort.split(',') : [sort, 'asc'];
  const isAsc = dir === 'asc';

  if (field === 'upperLimit') {
    return [...items].sort((a, b) => {
      const va = prices[a.stockCode]?.changeRate ?? 0;
      const vb = prices[b.stockCode]?.changeRate ?? 0;
      return isAsc ? va - vb : vb - va;
    });
  }

  if (field === 'lowerLimit') {
    return [...items].sort((a, b) => {
      const va = prices[a.stockCode]?.changeRate ?? 0;
      const vb = prices[b.stockCode]?.changeRate ?? 0;
      return isAsc ? vb - va : va - vb;
    });
  }

  if (field === 'changeRate') {
    return [...items].sort((a, b) => {
      const va = prices[a.stockCode]?.changeRate ?? 0;
      const vb = prices[b.stockCode]?.changeRate ?? 0;
      return isAsc ? va - vb : vb - va;
    });
  }

  if (field === 'volume') {
    return [...items].sort((a, b) => {
      const va = prices[a.stockCode]?.volume ?? 0;
      const vb = prices[b.stockCode]?.volume ?? 0;
      return isAsc ? va - vb : vb - va;
    });
  }

  if (field === 'name') {
    return [...items].sort((a, b) => {
      const va = a.name;
      const vb = b.name;
      return isAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  if (field === 'stockCode') {
    return [...items].sort((a, b) => {
      const va = a.stockCode;
      const vb = b.stockCode;
      return isAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  return items;
}

function filterBySign(
  items: StockCatalogWithPrice[],
  prices: Record<string, MappedStockPrice>,
  sign: string | undefined,
): StockCatalogWithPrice[] {
  if (!sign) return items;
  return items.filter((item) => prices[item.stockCode]?.sign === sign);
}

export default function StockCatalogInfinite({
  initialData,
  initialPrices,
  marketType,
  sector,
  sign,
  sort,
}: StockCatalogInfiniteProps) {
  const serverSort = sort && !CLIENT_SORT_FIELDS.has(sort.split(',')[0]) ? sort : undefined;
  const filterKeyStr = `${marketType ?? ''}-${sector ?? ''}-${sign ?? ''}-${sort ?? ''}`;
  const totalPages = initialData.totalPages;

  const [currentPage, setCurrentPage] = useState(0);
  const [loadedPages, setLoadedPages] = useState<StockCatalogWithPriceResponse[]>([initialData]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKeyStr);
  const [catalogPrices, setCatalogPrices] = useState<Record<string, MappedStockPrice>>(initialPrices ?? {});
  const [fetchedPrices, setFetchedPrices] = useState<Record<string, MappedStockPrice>>({});
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const attemptedCodes = useRef<Set<string>>(new Set());


  if (prevFilterKey !== filterKeyStr) {
    setPrevFilterKey(filterKeyStr);
    setCurrentPage(0);
    setLoadedPages([initialData]);
    setCatalogPrices(initialPrices ?? {});
    setFetchedPrices({});
  }

  const nextPage = currentPage + 1;
  const hasNext = nextPage < totalPages;

  const allItems: StockCatalogWithPrice[] = useMemo(
    () => {
      const seen = new Set<string>();
      return loadedPages.flatMap((p) => p.content).filter((item) => {
        if (seen.has(item.stockCode)) return false;
        seen.add(item.stockCode);
        return true;
      });
    },
    [loadedPages]
  );

  const lastScrollYRef = useRef<number>(0);
  const isRestoringRef = useRef<boolean>(false);
  const lastLoadedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isLoadingMore && !isFetchingPrices) {
      lastLoadedTimeRef.current = Date.now();
    }
  }, [isLoadingMore, isFetchingPrices]);

  useEffect(() => {
    const handleScroll = () => {
      if (isRestoringRef.current) return;

      if (window.scrollY > 0) {
        lastScrollYRef.current = window.scrollY;
      } else if (window.scrollY === 0 && lastScrollYRef.current > 100) {
        const recentlyLoaded = Date.now() - lastLoadedTimeRef.current < 1500;
        if (isLoadingMore || isFetchingPrices || recentlyLoaded) {
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
  }, [isLoadingMore, isFetchingPrices]);

  const allStockCodes = useMemo(
    () => allItems.map((item) => item.stockCode),
    [allItems]
  );

  const combinedInitialPrices = useMemo(
    () => ({ ...catalogPrices, ...fetchedPrices }),
    [catalogPrices, fetchedPrices]
  );

  const wsPrices = useStockPriceStreamBatch(allStockCodes, combinedInitialPrices);

  useEffect(() => {
    attemptedCodes.current.clear();
  }, [filterKeyStr]);

  useEffect(() => {
    const toFetch = allStockCodes.filter(
      (code) =>
        (!catalogPrices[code] || catalogPrices[code].upperLimit === 0) &&
        !fetchedPrices[code] &&
        !attemptedCodes.current.has(code)
    );

    if (toFetch.length === 0) return;

    toFetch.forEach((c) => attemptedCodes.current.add(c));
    setIsFetchingPrices(true);

    getBatchStockPrices(toFetch).then((newPrices) => {
      if (Object.keys(newPrices).length > 0) {
        setFetchedPrices((prev) => ({ ...prev, ...newPrices }));
      }
    }).finally(() => {
      setIsFetchingPrices(false);
    });
  }, [allStockCodes, catalogPrices, fetchedPrices]);

  const mergedPrices = useMemo(
    () => ({ ...combinedInitialPrices, ...wsPrices }),
    [combinedInitialPrices, wsPrices]
  );

  const prefetchKey = hasNext && !isLoadingMore
    ? [`stocks-prefetch`, nextPage, marketType, sector, sign, serverSort]
    : null;

  const { data: prefetchedPage } = useSWR<StockCatalogWithPriceResponse>(
    prefetchKey,
    () => getStocks({ page: nextPage, size: PAGE_SIZE, marketType, sector, sort: serverSort }),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasNext) return;

    if (prefetchedPage) {
      setLoadedPages((prev) => [...prev, prefetchedPage]);
      setCurrentPage(nextPage);
      const prefetchedPrices = extractInitialPricesFromCatalog(prefetchedPage);
      if (Object.keys(prefetchedPrices).length > 0) {
        setCatalogPrices((prev) => ({ ...prev, ...prefetchedPrices }));
      }
      return;
    }

    setIsLoadingMore(true);
    try {
      const result = await getStocks({ page: nextPage, size: PAGE_SIZE, marketType, sector, sort: serverSort });
      setLoadedPages((prev) => [...prev, result]);
      setCurrentPage(nextPage);
      const newPrices = extractInitialPricesFromCatalog(result);
      if (Object.keys(newPrices).length > 0) {
        setCatalogPrices((prev) => ({ ...prev, ...newPrices }));
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasNext, prefetchedPage, nextPage, marketType, sector, serverSort]);

  const filteredItems = useMemo(() => {
    const filtered = filterBySign(allItems, mergedPrices, sign);
    return sortItems(filtered, mergedPrices, sort);
  }, [allItems, mergedPrices, sign, sort]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item) => (
          <StockCatalogCard key={item.stockCode} item={item} price={mergedPrices[item.stockCode]} />
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20 text-steel">
          <p className="text-lg font-bold mb-2">종목을 찾을 수 없습니다</p>
          <p className="text-sm">필터를 변경하거나 검색어를 다시 입력해보세요.</p>
        </div>
      )}

      <LoadMore onLoadMore={loadMore} hasMore={hasNext} isLoading={isLoadingMore || isFetchingPrices} />
    </>
  );
}