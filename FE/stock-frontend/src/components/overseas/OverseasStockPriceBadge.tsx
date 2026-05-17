'use client';

import { useCallback, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useBatchOverseasPrice, useBatchPriceActions } from '@/context/BatchPriceContext';
import { getOverseasStockPrice } from '@/services/overseasStockApi';

export default function OverseasStockPriceBadge({
  ticker,
  exchangeCode,
}: {
  ticker: string;
  exchangeCode: string;
}) {
  const { data, isLoading, error } = useBatchOverseasPrice(ticker, exchangeCode);
  const { updateOverseasPrice, removeError } = useBatchPriceActions();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      const price = await getOverseasStockPrice(ticker, exchangeCode);
      if (price) {
        updateOverseasPrice(`${ticker}-${exchangeCode}`, price);
        removeError(`${ticker}-${exchangeCode}`);
      }
    } catch {} finally {
      setRetrying(false);
    }
  }, [ticker, exchangeCode, updateOverseasPrice, removeError]);

  if (isLoading || retrying) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold animate-pulse bg-surface-soft rounded w-20 h-6" />
          <span className="text-xs animate-pulse bg-surface-soft rounded w-10 h-4" />
        </div>
        <div className="text-xs animate-pulse bg-surface-soft rounded w-16 h-3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-market-down">일시적 오류</span>
          <button
            onClick={handleRetry}
            className="text-steel hover:text-ink transition-colors"
            title="다시 시도"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-stone text-sm">—</div>;
  }

  const isUp = data.changeSign === '1' || data.changeSign === '2';
  const isDown = data.changeSign === '4' || data.changeSign === '5';
  const colorClass = isUp ? 'text-market-up' : isDown ? 'text-market-down' : 'text-market-neutral';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className={`text-lg font-bold ${colorClass}`}>
          {data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className={`flex items-center gap-0.5 text-xs font-bold ${colorClass}`}>
          {data.changeSign === '3' ? (
            <Minus className="w-3 h-3" />
          ) : isUp ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>
            {data.changeRate >= 0 ? '+' : ''}{data.changeRate.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="text-xs text-steel">기준가 {data.basePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
  );
}