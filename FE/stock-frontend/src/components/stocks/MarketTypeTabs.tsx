'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const TABS = [
  { label: '전체', value: '' },
  { label: 'KOSPI', value: 'KOSPI' },
  { label: 'KOSDAQ', value: 'KOSDAQ' },
];

export default function MarketTypeTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentMarket = searchParams.get('marketType') ?? '';

  const handleTabClick = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('marketType', value);
    } else {
      params.delete('marketType');
    }
    params.delete('page');
    params.delete('sector');
    params.delete('sort');
    router.push(`/stocks?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      {TABS.map((tab) => {
        const isActive = currentMarket === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
              isActive
                ? 'bg-ink text-white border-ink'
                : 'bg-white text-ink border-hairline hover:border-ink'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}