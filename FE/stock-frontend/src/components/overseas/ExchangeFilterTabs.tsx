'use client';

import { useSearchParams, useRouter } from 'next/navigation';

const TABS = [
  { label: '전체', value: '' },
  { label: 'NASDAQ', value: 'NAS' },
  { label: 'NYSE', value: 'NYS' },
  { label: 'AMEX', value: 'AMS' },
];

export default function ExchangeFilterTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentExchange = searchParams.get('exchangeCode') ?? '';

  const handleTabClick = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('exchangeCode', value);
    } else {
      params.delete('exchangeCode');
    }
    params.delete('page');
    params.delete('sector');
    params.delete('sort');
    router.push(`/overseas-stocks?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = currentExchange === tab.value;
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