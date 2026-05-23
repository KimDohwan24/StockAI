import Link from 'next/link';
import StockPriceBadge from './StockPriceBadge';
import { useInView } from '@/hooks/useInView';
import type { StockCatalogItem } from '@/types/stock';
import type { MappedStockPrice } from '@/lib/api';

interface StockCatalogCardProps {
  item: StockCatalogItem;
  price?: MappedStockPrice;
}

export default function StockCatalogCard({ item, price }: StockCatalogCardProps) {
  const { ref, isInView } = useInView({ rootMargin: '300px', triggerOnce: true });

  return (
    <div ref={ref}>
      <Link
        href={`/stock/${item.stockCode}`}
        className="bg-white border border-hairline-soft rounded-[32px] p-6 hover:shadow-lg transition-shadow cursor-pointer group block"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-lg truncate group-hover:text-meta-blue transition-colors">{item.name} <span className="text-sm text-steel font-medium">({item.stockCode})</span></h4>
          </div>
          <span className={`ml-2 flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
            item.marketType === 'KOSPI'
              ? 'bg-surface-soft text-ink'
              : 'bg-meta-blue/5 text-meta-blue'
          }`}>
            {item.marketType}
          </span>
        </div>

        {isInView ? (
          <StockPriceBadge price={price} />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold animate-pulse bg-surface-soft rounded w-20 h-6" />
              <span className="text-xs animate-pulse bg-surface-soft rounded w-10 h-4" />
            </div>
            <div className="text-xs animate-pulse bg-surface-soft rounded w-16 h-3" />
          </div>
        )}
      </Link>
    </div>
  );
}