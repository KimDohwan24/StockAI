'use client';

import { ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const SIGN_OPTIONS = [
  { label: '전체', value: '' },
  { label: '상한가', value: '1' },
  { label: '상승', value: '2' },
  { label: '보합', value: '3' },
  { label: '하락', value: '4' },
  { label: '하한가', value: '5' },
];

export default function SignFilterSelect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentSign = searchParams.get('sign') ?? '';

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('sign', value);
    } else {
      params.delete('sign');
    }
    params.delete('page');
    router.push(`/stocks?${params.toString()}`);
  };

  return (
    <div className="relative">
      <select
        value={currentSign}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none bg-white border border-hairline-soft rounded-full pl-3 pr-7 py-2 text-sm font-bold text-ink focus:outline-none focus:border-meta-blue transition-colors cursor-pointer"
      >
        {SIGN_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-steel pointer-events-none" />
    </div>
  );
}