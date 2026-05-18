'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MappedStockPrice } from '@/lib/api';

function fmt(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ko-KR');
}

interface StockPriceBadgeProps {
  price?: MappedStockPrice;
}

export default function StockPriceBadge({ price }: StockPriceBadgeProps) {
  if (!price) {
    return (
      <div className="text-stone text-sm">—</div>
    );
  }

  const isUp = price.isUp || price.isLimitUp;
  const isDown = price.isDown || price.isLimitDown;
  const colorClass = isUp ? 'text-market-up' : isDown ? 'text-market-down' : 'text-market-neutral';

  const limitLabel = price.isLimitUp
    ? `상한가 ${fmt(price.upperLimit)}`
    : price.isLimitDown
      ? `하한가 ${fmt(price.lowerLimit)}`
    : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className={`text-lg font-bold ${colorClass}`}>{fmt(price.price)}</span>
        <div className={`flex items-center gap-0.5 text-xs font-bold ${colorClass}`}>
          {price.sign === '3' ? (
            <Minus className="w-3 h-3" />
          ) : isUp ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>
            {price.changeRate >= 0 ? '+' : ''}{price.changeRate}%
          </span>
        </div>
      </div>
      {limitLabel ? (
        <div className={`text-xs font-bold ${colorClass}`}>{limitLabel}</div>
      ) : (
        <div className="text-xs text-steel">기준가 {fmt(price.basePrice)}</div>
      )}
    </div>
  );
}