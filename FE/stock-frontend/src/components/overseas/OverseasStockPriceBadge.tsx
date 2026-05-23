'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { OverseasStockPrice } from '@/types/overseasStock';

interface OverseasStockPriceBadgeProps {
  ticker: string;
  exchangeCode: string;
  initialPrice?: OverseasStockPrice;
}

export default function OverseasStockPriceBadge({
  initialPrice,
}: OverseasStockPriceBadgeProps) {
  if (!initialPrice) {
    return <div className="text-stone text-sm">—</div>;
  }

  const isUp = initialPrice.changeSign === '1' || initialPrice.changeSign === '2';
  const isDown = initialPrice.changeSign === '4' || initialPrice.changeSign === '5';
  const colorClass = isUp ? 'text-market-up' : isDown ? 'text-market-down' : 'text-market-neutral';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className={`text-lg font-bold ${colorClass}`}>
          {initialPrice.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className={`flex items-center gap-0.5 text-xs font-bold ${colorClass}`}>
          {initialPrice.changeSign === '3' ? (
            <Minus className="w-3 h-3" />
          ) : isUp ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>
            {initialPrice.changeRate >= 0 ? '+' : ''}{initialPrice.changeRate.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="text-xs text-steel">기준가 {initialPrice.basePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
  );
}