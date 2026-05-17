'use client';

import { createContext, useContext, useMemo, useCallback, useState } from 'react';
import type { MappedStockPrice } from '@/lib/api';
import type { OverseasStockPrice } from '@/types/overseasStock';

interface BatchPriceContextValue {
  domestic: Record<string, MappedStockPrice>;
  overseas: Record<string, OverseasStockPrice>;
  loadingCodes: Set<string>;
  errorCodes: Map<string, string>;
  updateDomesticPrice: (code: string, price: MappedStockPrice) => void;
  updateOverseasPrice: (key: string, price: OverseasStockPrice) => void;
  removeError: (key: string) => void;
}

const BatchPriceContext = createContext<BatchPriceContextValue>({
  domestic: {},
  overseas: {},
  loadingCodes: new Set(),
  errorCodes: new Map(),
  updateDomesticPrice: () => {},
  updateOverseasPrice: () => {},
  removeError: () => {},
});

interface BatchPriceProviderProps {
  children: React.ReactNode;
  domestic: Record<string, MappedStockPrice>;
  overseas: Record<string, OverseasStockPrice>;
  loadingCodes?: Set<string>;
  errorCodes?: Map<string, string>;
}

export function BatchPriceProvider({
  children,
  domestic: domesticProp,
  overseas: overseasProp,
  loadingCodes: loadingCodesProp = new Set(),
  errorCodes: errorCodesProp = new Map(),
}: BatchPriceProviderProps) {
  const [domesticOverrides, setDomesticOverrides] = useState<Record<string, MappedStockPrice>>({});
  const [overseasOverrides, setOverseasOverrides] = useState<Record<string, OverseasStockPrice>>({});
  const [errorOverrides, setErrorOverrides] = useState<Map<string, string | null>>(new Map());

  const domestic = useMemo(
    () => ({ ...domesticProp, ...domesticOverrides }),
    [domesticProp, domesticOverrides]
  );
  const overseas = useMemo(
    () => ({ ...overseasProp, ...overseasOverrides }),
    [overseasProp, overseasOverrides]
  );

  const loadingCodes = loadingCodesProp;
  const errorCodes = useMemo(() => {
    const map = new Map(errorCodesProp);
    for (const [k, v] of errorOverrides) {
      if (v === null) map.delete(k);
      else map.set(k, v);
    }
    return map;
  }, [errorCodesProp, errorOverrides]);

  const updateDomesticPrice = useCallback((code: string, price: MappedStockPrice) => {
    setDomesticOverrides((prev) => ({ ...prev, [code]: price }));
  }, []);

  const updateOverseasPrice = useCallback((key: string, price: OverseasStockPrice) => {
    setOverseasOverrides((prev) => ({ ...prev, [key]: price }));
  }, []);

  const removeError = useCallback((key: string) => {
    setErrorOverrides((prev) => new Map(prev).set(key, null));
  }, []);

  const value = useMemo(
    () => ({ domestic, overseas, loadingCodes, errorCodes, updateDomesticPrice, updateOverseasPrice, removeError }),
    [domestic, overseas, loadingCodes, errorCodes, updateDomesticPrice, updateOverseasPrice, removeError]
  );
  return (
    <BatchPriceContext.Provider value={value}>
      {children}
    </BatchPriceContext.Provider>
  );
}

export function useBatchDomesticPrice(stockCode: string): {
  data: MappedStockPrice | undefined;
  isLoading: boolean;
  error: string | undefined;
} {
  const ctx = useContext(BatchPriceContext);
  const data = ctx.domestic[stockCode];
  const isLoading = ctx.loadingCodes.has(stockCode);
  const error = ctx.errorCodes.get(stockCode);
  return useMemo(
    () => ({ data, isLoading, error }),
    [data, isLoading, error]
  );
}

export function useBatchOverseasPrice(ticker: string, exchangeCode: string): {
  data: OverseasStockPrice | undefined;
  isLoading: boolean;
  error: string | undefined;
} {
  const ctx = useContext(BatchPriceContext);
  const key = `${ticker}-${exchangeCode}`;
  const data = ctx.overseas[key];
  const isLoading = ctx.loadingCodes.has(key);
  const error = ctx.errorCodes.get(key);
  return useMemo(
    () => ({ data, isLoading, error }),
    [data, isLoading, error]
  );
}

export function useBatchPriceActions() {
  const ctx = useContext(BatchPriceContext);
  return useMemo(
    () => ({
      updateDomesticPrice: ctx.updateDomesticPrice,
      updateOverseasPrice: ctx.updateOverseasPrice,
      removeError: ctx.removeError,
    }),
    [ctx.updateDomesticPrice, ctx.updateOverseasPrice, ctx.removeError]
  );
}