'use client';

import { ArrowDownAZ, ArrowUpAZ, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const DOMESTIC_SORT_OPTIONS = [
  { label: '기본 정렬', value: '' },
  { label: '이름순', value: 'name' },
  { label: '종목코드순', value: 'stockCode' },
  { label: '등락률순', value: 'changeRate' },
  { label: '거래량순', value: 'volume' },
  { label: '상한가순', value: 'upperLimit' },
  { label: '하한가순', value: 'lowerLimit' },
];

const OVERSEAS_SORT_OPTIONS = [
  { label: '기본 정렬', value: '' },
  { label: '이름순', value: 'name' },
  { label: '티커순', value: 'ticker' },
  { label: '등락률순', value: 'changeRate' },
  { label: '거래량순', value: 'volume' },
];

interface SortSelectProps {
  basePath: string;
}

export default function SortSelect({ basePath }: SortSelectProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawSort = searchParams.get('sort') ?? '';
  const isOverseas = basePath === '/overseas-stocks';
  const sortOptions = isOverseas ? OVERSEAS_SORT_OPTIONS : DOMESTIC_SORT_OPTIONS;

  const [sortField, sortDir] = rawSort.includes(',') ? rawSort.split(',') : [rawSort, 'asc'];
  const currentField = sortField || '';
  const currentDir = sortDir || 'asc';

  const handleFieldChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      const defaultDir = (value === 'name' || value === 'stockCode' || value === 'ticker') ? 'asc' : 'desc';
      params.set('sort', `${value},${defaultDir}`);
    } else {
      params.delete('sort');
    }
    params.delete('page');
    router.push(`${basePath}?${params.toString()}`);
  };

  const toggleDirection = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentField) {
      const newDir = currentDir === 'asc' ? 'desc' : 'asc';
      params.set('sort', `${currentField},${newDir}`);
    } else {
      return;
    }
    params.delete('page');
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <select
          value={currentField}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="appearance-none bg-white border border-hairline-soft rounded-full pl-3 pr-7 py-2 text-sm font-bold text-ink focus:outline-none focus:border-meta-blue transition-colors cursor-pointer"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-steel pointer-events-none" />
      </div>
      {currentField && (
        <button
          onClick={toggleDirection}
          className="p-2 rounded-full border border-hairline-soft bg-white hover:border-ink transition-colors"
          title={currentDir === 'asc' ? '오름차순' : '내림차순'}
        >
          {currentDir === 'asc'
            ? <ArrowUpAZ className="w-4 h-4 text-ink" />
            : <ArrowDownAZ className="w-4 h-4 text-ink" />
          }
        </button>
      )}
    </div>
  );
}