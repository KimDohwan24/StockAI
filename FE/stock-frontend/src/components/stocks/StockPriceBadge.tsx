'use client';

import { useCallback, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useBatchDomesticPrice, useBatchPriceActions } from '@/context/BatchPriceContext';
import { getStockPrice } from '@/lib/api';

function fmt(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ko-KR');
}

export default function StockPriceBadge({ stockCode }: { stockCode: string }) {
  const { data, isLoading, error } = useBatchDomesticPrice(stockCode);
  const { updateDomesticPrice, removeError } = useBatchPriceActions();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      const price = await getStockPrice(stockCode);
      if (price) {
        updateDomesticPrice(stockCode, price);
        removeError(stockCode);
      }
    } catch {} finally {
      setRetrying(false);
    }
  }, [stockCode, updateDomesticPrice, removeError]);

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
    return (
      <div className="text-stone text-sm">—</div>
    );
  }

  const isUp = data.isUp || data.isLimitUp;
  const isDown = data.isDown || data.isLimitDown;
  const colorClass = isUp ? 'text-market-up' : isDown ? 'text-market-down' : 'text-market-neutral';

  const limitLabel = data.isLimitUp
    ? `상한가 ${fmt(data.upperLimit)}`
    : data.isLimitDown
      ? `하한가 ${fmt(data.lowerLimit)}`
    : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className={`text-lg font-bold ${colorClass}`}>{fmt(data.price)}</span>
        <div className={`flex items-center gap-0.5 text-xs font-bold ${colorClass}`}>
          {data.sign === '3' ? (
            <Minus className="w-3 h-3" />
          ) : isUp ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>
            {data.changeRate >= 0 ? '+' : ''}{data.changeRate}%
          </span>
        </div>
      </div>
      {limitLabel ? (
        <div className={`text-xs font-bold ${colorClass}`}>{limitLabel}</div>
      ) : (
        <div className="text-xs text-steel">기준가 {fmt(data.basePrice)}</div>
      )}
    </div>
  );
}