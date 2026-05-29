'use client';

import { resolveSectorDisplay } from '@/lib/sectorMap';
import { getSectors } from '@/services/stockCatalogApi';
import { ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import useSWR from 'swr';

export default function SectorFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentSector = searchParams.get('sector') ?? '';
  const currentMarketType = searchParams.get('marketType') ?? '';

  const { data: allSectors = [] } = useSWR(
    ['sectors', currentMarketType],
    () => getSectors(currentMarketType || undefined),
    { dedupingInterval: 5000, revalidateOnFocus: false }
  );

  useEffect(() => {
    if (currentSector && !allSectors.includes(currentSector) && allSectors.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('sector');
      params.delete('page');
      router.replace(`/stocks?${params.toString()}`);
    }
  }, [currentSector, allSectors, router, searchParams]);

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('sector', value);
    } else {
      params.delete('sector');
    }
    params.delete('page');
    router.push(`/stocks?${params.toString()}`);
  };

  return (
    <div className="relative">
      <select
        value={currentSector}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none bg-white border border-hairline-soft rounded-full pl-3 pr-7 py-2 text-sm font-bold text-ink focus:outline-none focus:border-meta-blue transition-colors cursor-pointer"
      >
        <option value="">전체 섹터</option>
        {allSectors.map((sector) => (
          <option key={sector} value={sector}>{resolveSectorDisplay(sector)}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-steel pointer-events-none" />
    </div>
  );
}