'use client';

import { translateSector } from '@/lib/sectorMap';
import { getOverseasSectors } from '@/services/overseasStockApi';
import { ChevronDown, Languages } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

export default function OverseasSectorFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentSector = searchParams.get('sector') ?? '';
  const currentExchange = searchParams.get('exchangeCode') ?? '';
  const [lang, setLang] = useState<'ko' | 'en'>('ko');

  const { data: allSectors = [] } = useSWR(
    ['overseas-sectors', currentExchange],
    () => getOverseasSectors(currentExchange || undefined),
    { dedupingInterval: 5000, revalidateOnFocus: false }
  );

  useEffect(() => {
    if (currentSector && !allSectors.includes(currentSector) && allSectors.length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('sector');
      params.delete('page');
      router.replace(`/overseas-stocks?${params.toString()}`);
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
    router.push(`/overseas-stocks?${params.toString()}`);
  };

  const toggleLang = () => {
    setLang((prev) => (prev === 'ko' ? 'en' : 'ko'));
  };

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <select
          value={currentSector}
          onChange={(e) => handleChange(e.target.value)}
          className="appearance-none bg-white border border-hairline-soft rounded-full pl-3 pr-7 py-2 text-sm font-bold text-ink focus:outline-none focus:border-meta-blue transition-colors cursor-pointer"
        >
          <option value="">{lang === 'ko' ? '전체 섹터' : 'All Sectors'}</option>
          {allSectors.map((sector) => (
            <option key={sector} value={sector}>{translateSector(sector, lang)}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-steel pointer-events-none" />
      </div>
      <button
        onClick={toggleLang}
        className={`flex items-center gap-1 rounded-full px-2.5 py-2 text-xs font-bold border transition-colors ${
          lang === 'en'
            ? 'bg-meta-blue text-white border-meta-blue'
            : 'bg-white text-ink border-hairline-soft hover:border-meta-blue'
        }`}
      >
        <Languages className="w-3.5 h-3.5" />
        {lang === 'ko' ? 'EN' : '한'}
      </button>
    </div>
  );
}