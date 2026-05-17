'use client';

import { useState, useCallback, useMemo, useReducer, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { getOverseasStocks, getOverseasBatchPrices } from '@/services/overseasStockApi';
import { BatchPriceProvider } from '@/context/BatchPriceContext';
import OverseasStockCard from '@/components/overseas/OverseasStockCard';
import LoadMore from '@/components/stocks/LoadMore';
import type { OverseasStockCatalogItem, OverseasStockCatalogResponse, OverseasStockPrice } from '@/types/overseasStock';
import type { MappedStockPrice } from '@/lib/api';

interface OverseasStockCatalogInfiniteProps {
  initialData: OverseasStockCatalogResponse;
  initialPrices?: Record<string, OverseasStockPrice>;
  exchangeCode?: string;
  country?: string;
  sector?: string;
  sort?: string;
}

const PAGE_SIZE = 20;

type PriceAction =
  | { type: 'reset'; prices: Record<string, OverseasStockPrice> }
  | { type: 'merge'; prices: Record<string, OverseasStockPrice> };

function priceReducer(state: Record<string, OverseasStockPrice>, action: PriceAction): Record<string, OverseasStockPrice> {
  switch (action.type) {
    case 'reset':
      return action.prices;
    case 'merge':
      return { ...state, ...action.prices };
  }
}

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

  const [accumulatedPrices, dispatch] = useReducer(priceReducer, initialPrices ?? {});
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedPages, setLoadedPages] = useState<OverseasStockCatalogResponse[]>([initialData]);
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
    ? [`overseas-prefetch`, nextPage, exchangeCode, country, sector, sort]
    : null;

  const { data: prefetchedPage } = useSWR<OverseasStockCatalogResponse>(
    prefetchKey,
    () => getOverseasStocks({ page: nextPage, size: PAGE_SIZE, exchangeCode, country, sector, sort }),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const prefetchedRequests = useMemo(
    () =>
      prefetchedPage
        ? prefetchedPage.content.map((item) => ({ ticker: item.ticker, exchangeCode: item.exchangeCode }))
        : [],
    [prefetchedPage]
  );

  const prefetchPricesSWRKey = useMemo(() => {
    if (prefetchedRequests.length === 0) return null;
    return [
      'overseas-batch-prices-prefetch',
      prefetchedRequests.map((r) => `${r.ticker}-${r.exchangeCode}`).sort().join(','),
    ];
  }, [prefetchedRequests]);

  const { data: prefetchPrices } = useSWR<Record<string, OverseasStockPrice>>(
    prefetchPricesSWRKey,
    () => getOverseasBatchPrices(prefetchedRequests),
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
      const result = await getOverseasStocks({ page: nextPage, size: PAGE_SIZE, exchangeCode, country, sector, sort });
      setLoadedPages((prev) => [...prev, result]);
      setCurrentPage(nextPage);
      const requests = result.content.map((item) => ({ ticker: item.ticker, exchangeCode: item.exchangeCode }));
      if (requests.length > 0) {
        const prices = await getOverseasBatchPrices(requests);
        dispatch({ type: 'merge', prices });
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasNext, prefetchedPage, prefetchPrices, nextPage, exchangeCode, country, sector, sort]);

  const allItems: OverseasStockCatalogItem[] = useMemo(
    () => loadedPages.flatMap((p) => p.content),
    [loadedPages]
  );

  const overseasRequests = useMemo(
    () => allItems.map((item) => ({ ticker: item.ticker, exchangeCode: item.exchangeCode })),
    [allItems]
  );

  const newRequests = useMemo(() => {
    return overseasRequests.filter((r) => !accumulatedPrices[`${r.ticker}-${r.exchangeCode}`]);
  }, [overseasRequests, accumulatedPrices]);

  const deltaKey = useMemo(
    () => newRequests.map((r) => `${r.ticker}-${r.exchangeCode}`).sort().join(','),
    [newRequests]
  );

  const { data: deltaPrices, isLoading: batchLoading, error: batchError } = useSWR(
    newRequests.length > 0 ? ['overseas-batch-prices-delta', deltaKey] : null,
    () => getOverseasBatchPrices(newRequests),
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  useEffect(() => {
    if (deltaPrices) {
      dispatch({ type: 'merge', prices: deltaPrices });
    }
  }, [deltaPrices]);

  const overseasPrices = accumulatedPrices;
  const domesticPrices: Record<string, MappedStockPrice> = {};

  const loadingCodes = useMemo(() => {
    if (!batchLoading) return new Set<string>();
    const newKeys = newRequests.map((r) => `${r.ticker}-${r.exchangeCode}`);
    return new Set(newKeys);
  }, [batchLoading, newRequests]);

  const errorCodes = useMemo(() => {
    if (!batchError) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const r of newRequests) {
      const key = `${r.ticker}-${r.exchangeCode}`;
      map.set(key, batchError.message);
    }
    return map;
  }, [batchError, newRequests]);

  return (
    <BatchPriceProvider domestic={domesticPrices} overseas={overseasPrices} loadingCodes={loadingCodes} errorCodes={errorCodes}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {allItems.map((item) => (
          <OverseasStockCard key={`${item.ticker}-${item.exchangeCode}`} item={item} />
        ))}
      </div>

      {allItems.length === 0 && (
        <div className="text-center py-20 text-steel">
          <p className="text-lg font-bold mb-2">종목을 찾을 수 없습니다</p>
          <p className="text-sm">필터를 변경하거나 검색어를 다시 입력해보세요.</p>
        </div>
      )}

      <LoadMore onLoadMore={loadMore} hasMore={hasNext} isLoading={isLoadingMore || batchLoading} />
    </BatchPriceProvider>
  );
}