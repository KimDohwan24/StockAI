'use client';

import { useParams, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  BarChart3,
  Landmark,
  Hash,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent,
} from 'lucide-react';
import { getOverseasStockPrice } from '@/services/overseasStockApi';
import type { ExchangeCode, CountryCode, OverseasStockPrice } from '@/types/overseasStock';
import { COUNTRY_FLAGS } from '@/constants/countryFlags';
import { useVisibility } from '@/hooks/useVisibility';
import OverseasOrderPanel from '@/components/overseas/OverseasOrderPanel';

function fmt(n: number, currency: string): string {
  if (currency === 'KRW') return Math.round(n).toLocaleString('ko-KR');
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function InfoCard({
  icon,
  label,
  value,
  sub,
  highlight,
  className = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: 'up' | 'down';
  className?: string;
}) {
  const highlightClass =
    highlight === 'up'
      ? 'border-market-up/20 bg-market-up/[0.03]'
      : highlight === 'down'
      ? 'border-market-down/20 bg-market-down/[0.03]'
      : 'border-hairline-soft bg-white';

  return (
    <div className={`rounded-meta-xl border p-4 shadow-sm ${highlightClass} ${className}`}>
      <div className="flex items-center gap-1.5 text-steel text-xs mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold text-ink">{value}</p>
      {sub && <p className="text-[11px] text-steel mt-0.5">{sub}</p>}
    </div>
  );
}

export default function OverseasStockDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ticker = (params.ticker as string) || '';
  const exchangeCode = (searchParams.get('exchange') as ExchangeCode) || 'NAS';
  const isVisible = useVisibility();

  const { data: priceInfo, error: priceError } = useSWR<OverseasStockPrice>(
    ticker ? `overseas-detail-price-${ticker}-${exchangeCode}` : null,
    () => getOverseasStockPrice(ticker, exchangeCode),
    { refreshInterval: isVisible ? 10000 : 0, dedupingInterval: 5000 }
  );

  const isLoading = !priceInfo && !priceError;

  const isUp = priceInfo?.changeSign === '1' || priceInfo?.changeSign === '2';
  const isDown = priceInfo?.changeSign === '4' || priceInfo?.changeSign === '5';
  const colorClass = isUp ? 'text-market-up' : isDown ? 'text-market-down' : 'text-market-neutral';

  const currencyMap: Record<string, string> = {
    NAS: 'USD', NYS: 'USD', AMS: 'USD',
  };
  const currency = currencyMap[exchangeCode] ?? 'USD';

  const countryMap: Record<string, CountryCode> = {
    NAS: 'US', NYS: 'US', AMS: 'US',
  };
  const country = countryMap[exchangeCode] ?? 'US';
  const flag = COUNTRY_FLAGS[country] ?? '';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-8">
            {/* Price Hero */}
            <section className="bg-white border border-hairline-soft rounded-[24px] p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                  <p className="text-sm text-steel mb-1 flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    현재가
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-5xl font-extrabold tracking-tight ${colorClass}`}>
                      {priceInfo ? fmt(priceInfo.price, currency) : '—'}
                    </p>
                    <span className="text-xl text-steel font-medium">{currency}</span>
                  </div>

                  {priceInfo && (
                    <div className={`flex items-center gap-1.5 mt-3 font-bold text-lg ${colorClass}`}>
                      {priceInfo.changeSign === '3' ? (
                        <Minus className="w-5 h-5" />
                      ) : isUp ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                      <span>
                        {priceInfo.changeRate >= 0 ? '+' : ''}
                        {priceInfo.changeRate.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>

                {priceInfo && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 text-sm">
                    <div>
                      <p className="text-steel text-xs mb-0.5">시가</p>
                      <p className="font-semibold text-ink">{fmt(priceInfo.openPrice, currency)}</p>
                    </div>
                    <div>
                      <p className="text-steel text-xs mb-0.5">고가</p>
                      <p className="font-semibold text-ink">{fmt(priceInfo.highPrice, currency)}</p>
                    </div>
                    <div>
                      <p className="text-steel text-xs mb-0.5">저가</p>
                      <p className="font-semibold text-ink">{fmt(priceInfo.lowPrice, currency)}</p>
                    </div>
                    <div>
                      <p className="text-steel text-xs mb-0.5">거래량</p>
                      <p className="font-semibold text-ink">{priceInfo.volume.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Detail Grid — 해외 주식 특화 정보 (더미 데이터, BE API 연동 시 교체) */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoCard icon={<Hash className="w-4 h-4" />} label="PER / PBR" value="— / —" sub="데이터 준비 중" />
              <InfoCard icon={<DollarSign className="w-4 h-4" />} label="EPS / BPS" value="— / —" sub="데이터 준비 중" />
              <InfoCard icon={<Percent className="w-4 h-4" />} label="배당수익률" value="—%" sub="데이터 준비 중" />
              <InfoCard icon={<Landmark className="w-4 h-4" />} label="시가총액" value="—" sub="데이터 준비 중" />
              <InfoCard icon={<ArrowUpRight className="w-4 h-4 text-market-up" />} label="52주 최고가" value="—" highlight="up" />
              <InfoCard icon={<ArrowDownRight className="w-4 h-4 text-market-down" />} label="52주 최저가" value="—" highlight="down" />
            </section>

            {/* Chart Placeholder */}
            <section className="bg-white border border-hairline-soft rounded-[24px] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-steel" />
                <h3 className="font-bold text-sm">차트</h3>
              </div>
              <div className="w-full h-[420px] bg-surface-soft rounded-meta-xxl flex items-center justify-center border border-hairline-soft">
                <div className="text-center">
                  <Landmark className="w-8 h-8 text-stone mx-auto mb-2" />
                  <p className="text-sm text-steel font-bold">해외 일봉 차트</p>
                  <p className="text-xs text-stone mt-1">데이터 준비 중입니다</p>
                </div>
              </div>
            </section>
          </div>

          {/* Trade Panel Sidebar */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <OverseasOrderPanel
              ticker={ticker}
              exchangeCode={exchangeCode}
              currentPrice={priceInfo?.price ?? 0}
              currency={currency}
            />
          </div>
        </div>
      </main>
    </div>
  );
}