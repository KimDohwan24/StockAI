import { COUNTRY_FLAGS } from '@/constants/countryFlags';
import { useInView } from '@/hooks/useInView';
import type { OverseasStockCatalogItem, OverseasStockPrice } from '@/types/overseasStock';
import Link from 'next/link';
import OverseasStockPriceBadge from './OverseasStockPriceBadge';

interface OverseasStockCardProps {
  item: OverseasStockCatalogItem;
  initialPrice?: OverseasStockPrice;
}

export default function OverseasStockCard({ item, initialPrice }: OverseasStockCardProps) {
  const flag = COUNTRY_FLAGS[item.country] ?? '';
  const { ref, isInView } = useInView({ rootMargin: '300px', triggerOnce: true });

  return (
    <div ref={ref}>
      <Link
        href={`/overseas-stocks/${item.ticker}?exchange=${item.exchangeCode}${initialPrice ? `&price=${initialPrice.price}&changeRate=${initialPrice.changeRate}&changeSign=${initialPrice.changeSign}&volume=${initialPrice.volume}&basePrice=${initialPrice.basePrice}` : ''}`}
        className="bg-white border border-hairline-soft rounded-[32px] p-6 hover:shadow-lg transition-shadow cursor-pointer group block"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-lg truncate group-hover:text-meta-blue transition-colors">{item.name} <span className="text-sm text-steel font-medium">({item.ticker})</span></h4>
          </div>
          <span className="ml-2 flex-shrink-0 px-2.5 py-1 rounded-full bg-surface-soft text-xs font-bold">
            {item.exchangeCode}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3 text-xs text-steel">
          <span>{flag} {item.country}</span>
          <span className="text-stone">{item.currency}</span>
        </div>

        {isInView ? (
          <OverseasStockPriceBadge ticker={item.ticker} exchangeCode={item.exchangeCode} initialPrice={initialPrice} />
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