import Link from 'next/link';
import OverseasStockPriceBadge from './OverseasStockPriceBadge';
import { COUNTRY_FLAGS } from '@/constants/countryFlags';
import type { OverseasStockCatalogItem } from '@/types/overseasStock';

export default function OverseasStockCard({ item }: { item: OverseasStockCatalogItem }) {
  const flag = COUNTRY_FLAGS[item.country] ?? '';

  return (
    <Link
      href={`/overseas-stocks/${item.ticker}?exchange=${item.exchangeCode}`}
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

      <OverseasStockPriceBadge ticker={item.ticker} exchangeCode={item.exchangeCode} />
    </Link>
  );
}