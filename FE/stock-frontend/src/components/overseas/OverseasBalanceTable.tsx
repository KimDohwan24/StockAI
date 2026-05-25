'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getOverseasBalance } from '@/services/overseasStockApi';
import type { OverseasBalanceItem } from '@/types/overseasStock';

const currencyMap: Record<string, string> = {
  NAS: 'USD', NYS: 'USD', AMS: 'USD',
  HKQ: 'HKD', HXK: 'HKD',
  TKY: 'JPY',
  SHH: 'CNY', SHZ: 'CNY',
};

function fmtNum(n: number, currency: string): string {
  if (currency === 'KRW') return Math.round(n).toLocaleString('ko-KR');
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OverseasBalanceTable() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR(
    'overseas-balance',
    () => getOverseasBalance(),
    { refreshInterval: 30000, dedupingInterval: 10000 }
  );

  if (isLoading) {
    return (
      <div className="bg-white border border-hairline-soft rounded-meta-xl p-8 text-center text-steel text-sm animate-pulse">
        잔고를 불러오는 중...
      </div>
    );
  }

  if (error || !data || !data.output1 || data.output1.length === 0) {
    return (
      <div className="bg-white border border-hairline-soft rounded-meta-xl p-8 text-center text-steel text-sm">
        보유 종목이 없습니다
      </div>
    );
  }

  const items = data.output1;

  return (
    <div className="bg-white border border-hairline-soft rounded-meta-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline-soft text-steel text-xs">
            <th className="text-left px-5 py-3 font-medium">종목</th>
            <th className="text-left px-5 py-3 font-medium">거래소</th>
            <th className="text-right px-5 py-3 font-medium">보유수량</th>
            <th className="text-right px-5 py-3 font-medium">매입단가</th>
            <th className="text-right px-5 py-3 font-medium">현재가</th>
            <th className="text-right px-5 py-3 font-medium">손익</th>
            <th className="text-right px-5 py-3 font-medium">손익률</th>
          </tr>
        </thead>
        <tbody>
          {items.map((h: OverseasBalanceItem) => {
            const currency = currencyMap[h.exchangeCode] ?? 'USD';
            const isProfit = h.profitLossRate >= 0;
            return (
              <tr
                key={`${h.ticker}-${h.exchangeCode}`}
                className="border-b border-hairline-soft last:border-b-0 hover:bg-surface-soft transition-colors cursor-pointer"
                onClick={() => router.push(`/overseas-stocks/${h.ticker}?exchange=${h.exchangeCode}`)}
              >
                <td className="px-5 py-4">
                  <p className="font-bold text-ink">{h.name}</p>
                  <p className="text-xs text-steel">{h.ticker}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="px-2 py-0.5 bg-surface-soft rounded-full text-xs font-bold">
                    {h.exchangeCode}
                  </span>
                </td>
                <td className="text-right px-5 py-4 font-medium">{h.quantity.toLocaleString()}</td>
                <td className="text-right px-5 py-4">{fmtNum(h.avgPrice, currency)}</td>
                <td className="text-right px-5 py-4">{fmtNum(h.currentPrice, currency)}</td>
                <td className={`text-right px-5 py-4 font-medium ${isProfit ? 'text-market-up' : 'text-market-down'}`}>
                  {isProfit ? '+' : ''}{fmtNum(h.profitLoss, currency)}
                </td>
                <td className={`text-right px-5 py-4 font-bold ${isProfit ? 'text-market-up' : 'text-market-down'}`}>
                  {isProfit ? '+' : ''}{h.profitLossRate.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {data.output2 && (
        <div className="border-t border-hairline-soft px-5 py-3 flex justify-between text-sm text-steel">
          <span>총 평가금액</span>
          <span className="font-bold text-ink">
            {Math.round(data.output2.totalEvaluatedAmount).toLocaleString('ko-KR')}원
          </span>
        </div>
      )}
    </div>
  );
}