'use client';

import { useState, useCallback, useMemo, useReducer, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { getStocks, getBatchPrices } from '@/services/stockCatalogApi';
import { BatchPriceProvider } from '@/context/BatchPriceContext';
import StockCatalogCard from '@/components/stocks/StockCatalogCard';
import LoadMore from '@/components/stocks/LoadMore';
import type { StockCatalogItem, StockCatalogResponse } from '@/types/stock';
import type { MappedStockPrice } from '@/lib/api';
import type { OverseasStockPrice } from '@/types/overseasStock';

interface StockCatalogInfiniteProps {
  initialData: StockCatalogResponse;
  initialPrices?: Record<string, MappedStockPrice>;
  marketType?: string;
  sector?: string;
  sign?: string;
  sort?: string;
}

const PAGE_SIZE = 20;

type PriceAction =
  | { type: 'reset'; prices: Record<string, MappedStockPrice> }
  | { type: 'merge'; prices: Record<string, MappedStockPrice> };

function priceReducer(state: Record<string, MappedStockPrice>, action: PriceAction): Record<string, MappedStockPrice> {
  switch (action.type) {
    case 'reset':
      return action.prices;
    case 'merge':
      return { ...state, ...action.prices };
  }
}

const CLIENT_SORT_FIELDS = new Set(['upperLimit', 'lowerLimit']);

function sortItems(
  items: StockCatalogItem[],
  prices: Record<string, MappedStockPrice>,
  sort: string | undefined,
): StockCatalogItem[] {
  if (!sort) return items;

  const [field, dir] = sort.includes(',') ? sort.split(',') : [sort, 'asc'];
  const isAsc = dir === 'asc';

  if (CLIENT_SORT_FIELDS.has(field)) {
    return [...items].sort((a, b) => {
      const pa = prices[a.stockCode];
      const pb = prices[b.stockCode];
      const va = pa ? (pa as unknown as Record<string, number>)[field] ?? 0 : 0;
      const vb = pb ? (pb as unknown as Record<string, number>)[field] ?? 0 : 0;
      return isAsc ? va - vb : vb - va;
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
  items: StockCatalogItem[],
  prices: Record<string, MappedStockPrice>,
  sign: string | undefined,
): StockCatalogItem[] {
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

  const [accumulatedPrices, dispatch] = useReducer(priceReducer, initialPrices ?? {});
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedPages, setLoadedPages] = useState<StockCatalogResponse[]>([initialData]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKeyStr);

  if (prevFilterKey !== filterKeyStr) {
    setPrevFilterKey(filterKeyStr);
    setCurrentPage(0);
    setLoadedPages([initialData]);
    dispatch({ type: 'reset', prices: initialPrices ?? {} });
  }

  const nextPage = currentPage + 1;
  const hasNext = nextPage < totalPages;

  const prefetchKey = hasNext && !isLoadingMore
    ? [`stocks-prefetch`, nextPage, marketType, sector, sign, serverSort]
    : null;

  const { data: prefetchedPage } = useSWR<StockCatalogResponse>(
    prefetchKey,
    () => getStocks({ page: nextPage, size: PAGE_SIZE, marketType, sector, sort: serverSort }),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const prefetchedCodes = useMemo(
    () => (prefetchedPage ? prefetchedPage.content.map((item) => item.stockCode) : []),
    [prefetchedPage]
  );

  const prefetchPricesSWRKey = useMemo(() => {
    if (prefetchedCodes.length === 0) return null;
    return ['batch-prices-prefetch', prefetchedCodes.slice().sort().join(',')];
  }, [prefetchedCodes]);

  const { data: prefetchPrices } = useSWR<Record<string, MappedStockPrice>>(
    prefetchPricesSWRKey,
    () => getBatchPrices(prefetchedCodes),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasNext) return;

    if (prefetchedPage) {
      setLoadedPages((prev) => [...prev, prefetchedPage]);
      setCurrentPage(nextPage);
      if (prefetchPrices) {
        dispatch({ type: 'merge', prices: prefetchPrices });
      }
      return;
    }

    setIsLoadingMore(true);
    try {
      const result = await getStocks({ page: nextPage, size: PAGE_SIZE, marketType, sector, sort: serverSort });
      setLoadedPages((prev) => [...prev, result]);
      setCurrentPage(nextPage);
      const codes = result.content.map((item) => item.stockCode);
      if (codes.length > 0) {
        const prices = await getBatchPrices(codes);
        dispatch({ type: 'merge', prices });
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasNext, prefetchedPage, prefetchPrices, nextPage, marketType, sector, serverSort]);

  const allItems: StockCatalogItem[] = useMemo(
    () => loadedPages.flatMap((p) => p.content),
    [loadedPages]
  );

  const stockCodes = useMemo(() => allItems.map((item) => item.stockCode), [allItems]);

  const newCodes = useMemo(() => {
    return stockCodes.filter((code) => !accumulatedPrices[code]);
  }, [stockCodes, accumulatedPrices]);

  const deltaKey = useMemo(() => newCodes.slice().sort().join(','), [newCodes]);

  const { data: deltaPrices, isLoading: batchLoading, error: batchError } = useSWR(
    newCodes.length > 0 ? ['batch-prices-delta', deltaKey] : null,
    () => getBatchPrices(newCodes),
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  useEffect(() => {
    if (deltaPrices) {
      dispatch({ type: 'merge', prices: deltaPrices });
    }
  }, [deltaPrices]);

  const filteredItems = useMemo(() => {
    const filtered = filterBySign(allItems, accumulatedPrices, sign);
    return sortItems(filtered, accumulatedPrices, sort);
  }, [allItems, accumulatedPrices, sign, sort]);

  const domesticPrices = accumulatedPrices;
  const overseasPrices: Record<string, OverseasStockPrice> = {};

  const loadingCodes = useMemo(() => {
    if (!batchLoading) return new Set<string>();
    return new Set(newCodes);
  }, [batchLoading, newCodes]);

  const errorCodes = useMemo(() => {
    if (!batchError) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const code of newCodes) {
      map.set(code, batchError.message);
    }
    return map;
  }, [batchError, newCodes]);

  return (
    <BatchPriceProvider domestic={domesticPrices} overseas={overseasPrices} loadingCodes={loadingCodes} errorCodes={errorCodes}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item) => (
          <StockCatalogCard key={item.stockCode} item={item} />
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20 text-steel">
          <p className="text-lg font-bold mb-2">종목을 찾을 수 없습니다</p>
          <p className="text-sm">필터를 변경하거나 검색어를 다시 입력해보세요.</p>
        </div>
      )}

      <LoadMore onLoadMore={loadMore} hasMore={hasNext} isLoading={isLoadingMore || batchLoading} />
    </BatchPriceProvider>
  );
}