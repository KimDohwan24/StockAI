'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  Star,
  Eye,
  Globe,
} from 'lucide-react';
import StockChart, { AreaPoint } from '@/components/StockChart';
import { Time } from 'lightweight-charts';
import {
  getMinuteCandles,
  getPortfolio,
  getHoldings,
  MappedStockPrice,
  MappedMinuteCandle,
  PortfolioResponse,
  HoldingResponse,
  getDashboardRecommendations,
  DashboardRecommendationItem,
  DashboardRecommendations,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useVisibility } from '@/hooks/useVisibility';
import { useStockPriceStreamBatch } from '@/hooks/useStockPriceStream';
import OverseasBalanceTable from '@/components/overseas/OverseasBalanceTable';
import { getTrendingOverseasStocks, type OverseasTrendingResponse } from '@/services/overseasStockApi';
import OverseasStockCard from '@/components/overseas/OverseasStockCard';
import type { OverseasStockCatalogItem } from '@/types/overseasStock';
import { getBatchStockPrices } from '@/services/stockCatalogApi';

const HERO_CODE = '005930';
const RECOMMENDED_CODES = ['005930', '000660', '035420', '035720'];
const STOCK_NAMES: Record<string, string> = {
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '035420': 'NAVER',
  '035720': '카카오',
};

interface StockSnapshot {
  code: string;
  name: string;
  info: MappedStockPrice | null;
  sparkline: AreaPoint[];
  loading: boolean;
  error: string | null;
}

interface HeroSnapshot extends StockSnapshot {
  sparkline: AreaPoint[];
}

interface RecommendedSnapshot extends StockSnapshot {
  sparkline: AreaPoint[];
}

function toSparkline(minutes: MappedMinuteCandle[]): AreaPoint[] {
  const points: AreaPoint[] = [];
  const seenTimes = new Set<number>();

  for (const m of minutes) {
    const parsedTime = Math.floor(new Date(m.time).getTime() / 1000);
    if (isNaN(parsedTime) || m.close <= 0) continue;
    if (!seenTimes.has(parsedTime)) {
      seenTimes.add(parsedTime);
      points.push({
        time: parsedTime as Time,
        value: m.close,
      });
    }
  }

  return points.sort((a, b) => (a.time as number) - (b.time as number));
}

function fmt(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ko-KR');
}

function HeroSection({ data, isLoggedIn }: { data: StockSnapshot; isLoggedIn: boolean }) {
  const { info, sparkline, loading, error } = data;

  const colorClass = !info
    ? 'text-ink'
    : info.isUp || info.isLimitUp
    ? 'text-market-up'
    : info.isDown || info.isLimitDown
    ? 'text-market-down'
    : 'text-market-neutral';

  return (
    <section className="mb-16">
      <div className="bg-white border border-hairline-soft rounded-[32px] overflow-hidden shadow-[0_20px_40px_rgba(0,100,224,0.08)]">
        <div className="grid lg:grid-cols-[1fr_400px] items-center">
          <div className="p-12">
            <div className="flex items-center gap-2 mb-6">
              <span className="bg-market-up text-white text-[10px] font-bold px-2 py-1 rounded-meta-full uppercase tracking-wider">
                Today&apos;s Pick
              </span>
              <span className="text-steel text-sm">AI 가 분석한 오늘의 강력 추천주</span>
            </div>
            <h2 className="text-5xl font-bold mb-4 leading-tight">
              {`${STOCK_NAMES[HERO_CODE] || info?.stockName || HERO_CODE} (${HERO_CODE})`}
            </h2>
            <p className="text-xl text-slate mb-8 max-w-lg">
              반도체 사이클 회복과 AI 수요 증가로 인해 2분기 실적 개선이 기대됩니다. 현재
              구간에서 강력한 매수 신호가 감지되었습니다.
            </p>
            <div className="flex gap-4">
              <Link
                href={isLoggedIn ? `/stock/${HERO_CODE}` : '/login'}
                className="meta-button-buy inline-block text-center"
              >
                지금 매수하기
              </Link>
              <Link href={`/stock/${HERO_CODE}`} className="meta-button-secondary inline-block text-center">
                상세 분석 보기
              </Link>
            </div>
          </div>

          <div className="bg-surface-soft p-8 h-full flex flex-col justify-center border-l border-hairline-soft">
            {loading && (
              <div className="flex items-center justify-center h-full text-steel text-sm">
                데이터 로딩 중...
              </div>
            )}
            {!loading && error && (
              <div className="flex items-center justify-center h-full text-market-down text-sm">
                {error}
              </div>
            )}
            {!loading && !error && !info && (
              <div className="flex items-center justify-center h-full text-steel text-sm">
                가격 데이터를 불러올 수 없습니다.
              </div>
            )}
            {!loading && !error && info && (
              <>
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-sm text-steel mb-1">현재가</p>
                    <p className={`text-3xl font-bold ${colorClass}`}>
                      {fmt(info.price)}{' '}
                      <span className="text-lg">
                        {info.change >= 0 ? '+' : ''}
                        {fmt(info.change)}
                      </span>
                    </p>
                    <p className={`text-sm font-bold mt-1 ${colorClass}`}>
                      {info.changeRate >= 0 ? '+' : ''}
                      {info.changeRate}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-steel mb-1">매칭 점수</p>
                    <p className="text-3xl font-bold text-meta-blue">98%</p>
                  </div>
                </div>
                <div className="h-[200px] w-full bg-white rounded-meta-xxl p-4 border border-hairline-soft">
                  {sparkline.length > 0 ? (
                    <StockChart data={sparkline} type="area" color={info.isUp ? '#e41e3f' : '#0064e0'} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-steel text-xs">
                      차트 데이터 없음
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StockCard({ data }: { data: StockSnapshot }) {
  const { code, name, info, loading } = data;
  const isVisible = useVisibility();

  const { data: minutes } = useSWR(
    isVisible && code ? `stock-minutes-${code}` : null,
    () => getMinuteCandles(code),
    { dedupingInterval: 15000 }
  );

  const sparkline = useMemo(() => (minutes ? toSparkline(minutes) : []), [minutes]);
  const displayName = name && name !== code ? name : (info?.stockName || code);

  if (loading || !info) {
    return (
      <div className="meta-card p-6 block animate-pulse">
        <div className="h-4 bg-surface-soft rounded w-1/3 mb-2" />
        <div className="h-6 bg-surface-soft rounded w-2/3 mb-4" />
        <div className="h-8 bg-surface-soft rounded w-1/2" />
      </div>
    );
  }

  const colorClass =
    info.isUp || info.isLimitUp
      ? 'text-market-up'
      : info.isDown || info.isLimitDown
      ? 'text-market-down'
      : 'text-market-neutral';

  return (
    <Link
      href={`/stock/${code}`}
      className="meta-card p-6 hover:shadow-lg transition-shadow cursor-pointer group flex flex-col justify-between h-full min-h-[220px] block"
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-steel font-medium mb-0.5">{code}</p>
            <h4 className="font-bold text-lg group-hover:text-meta-blue transition-colors">{displayName}</h4>
          </div>
          <button className="text-hairline hover:text-meta-blue transition-colors" onClick={(e) => e.preventDefault()}>
            <Star className="w-5 h-5" />
          </button>
        </div>

        <div>
          <p className="text-xl font-bold">{fmt(info.price)}</p>
          <div className={`flex items-center gap-1 text-sm font-bold ${colorClass}`}>
            {info.sign === '3' ? (
              <Minus className="w-4 h-4" />
            ) : info.isUp ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>
              {info.change >= 0 ? '+' : ''}
              {fmt(info.change)} ({info.changeRate >= 0 ? '+' : ''}
              {info.changeRate}%)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 h-[60px] w-full relative">
        {sparkline.length > 0 ? (
          <StockChart
            data={sparkline}
            type="area"
            color={info.isUp ? '#e41e3f' : '#0064e0'}
            height={60}
            sparkline={true}
            pureLine={true}
            realtimePrice={info.price}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-soft/40 rounded-lg border border-hairline-soft/50">
            <span className="text-[10px] text-steel">차트 로딩 중...</span>
          </div>
        )}
      </div>
    </Link>
  );
}



function useDashboardStocks(
  allCodes: string[],
  heroCode: string,
  recommendedCodes: string[],
  isVisible: boolean,
  initialPrices: Record<string, MappedStockPrice>,
  pricesLoading: boolean,
): { hero: HeroSnapshot; recommended: RecommendedSnapshot[] } {
  const { data: minutes, error: minutesError } = useSWR(
    isVisible ? `hero-minutes-${heroCode}` : null,
    () => getMinuteCandles(heroCode),
    { dedupingInterval: 15000 },
  );

  const wsPrices = useStockPriceStreamBatch(allCodes, initialPrices);

  const sparkline = useMemo(() => minutes ? toSparkline(minutes) : [], [minutes]);
  const heroPrice = wsPrices[heroCode] ?? initialPrices[heroCode] ?? null;
  const hero: HeroSnapshot = useMemo(() => ({
    code: heroCode,
    name: heroPrice?.stockName || STOCK_NAMES[heroCode] || heroCode,
    info: heroPrice,
    sparkline,
    loading: pricesLoading && !heroPrice,
    error: null,
  }), [heroCode, heroPrice, sparkline, minutesError, pricesLoading]);

  const recommended: RecommendedSnapshot[] = useMemo(() =>
    recommendedCodes.map((code) => {
      const price = wsPrices[code] ?? initialPrices[code] ?? null;
      return {
        code,
        name: price?.stockName || STOCK_NAMES[code] || code,
        info: price,
        sparkline: [],
        loading: pricesLoading && !price,
        error: null,
      };
    }),
    [recommendedCodes, wsPrices, initialPrices, pricesLoading],
  );

  return { hero, recommended };
}

function OverseasRecommendedSection() {
  const isVisible = useVisibility();
  const { data: trendingItems, error } = useSWR<OverseasTrendingResponse[]>(
    isVisible ? 'overseas-trending' : null,
    () => getTrendingOverseasStocks(),
    { dedupingInterval: 30000 }
  );

  const items: OverseasStockCatalogItem[] = (trendingItems ?? []).map((t) => ({
    ticker: t.stockCode,
    name: t.name,
    exchangeCode: t.marketType as OverseasStockCatalogItem['exchangeCode'],
    country: 'US' as const,
    sector: null,
    currency: 'USD',
  }));

  if (error) {
    return (
      <div className="bg-white border border-hairline-soft rounded-meta-xl p-8 text-center text-steel text-sm">
        <p className="text-market-down">추천 종목을 불러올 수 없습니다.</p>
      </div>
    );
  }

  if (items.length === 0 && !trendingItems) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-hairline-soft rounded-[32px] p-6 animate-pulse">
            <div className="h-4 bg-surface-soft rounded w-1/2 mb-2" />
            <div className="h-6 bg-surface-soft rounded w-3/4 mb-4" />
            <div className="h-8 bg-surface-soft rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-hairline-soft rounded-meta-xl p-8 text-center text-steel text-sm">
        <p>추천 종목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item) => (
        <OverseasStockCard key={`${item.ticker}-${item.exchangeCode}`} item={item} />
      ))}
    </div>
  );
}

interface AiRecommendationsSectionProps {
  data: DashboardRecommendations | undefined;
  isLoading: boolean;
}

function AiRecommendationsSection({ data, isLoading }: AiRecommendationsSectionProps) {
  if (isLoading) {
    return (
      <section className="mb-12">
        <h3 className="text-2xl font-bold mb-6 text-ink">AI 오늘의 투자 추천</h3>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="font-bold text-lg text-ink">🔥 AI 오늘의 추천 종목</h4>
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white border border-hairline-soft rounded-[24px] p-6 space-y-4 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-6 bg-surface-soft rounded w-1/3" />
                  <div className="h-6 bg-surface-soft rounded-full w-14" />
                </div>
                <div className="h-5 bg-surface-soft rounded w-1/4" />
                <div className="h-12 bg-surface-soft rounded-[12px] w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h4 className="font-bold text-lg text-ink">⚠️ AI 오늘의 피해야 할 종목</h4>
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white border border-hairline-soft rounded-[24px] p-6 space-y-4 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-6 bg-surface-soft rounded w-1/3" />
                  <div className="h-6 bg-surface-soft rounded-full w-14" />
                </div>
                <div className="h-5 bg-surface-soft rounded w-1/4" />
                <div className="h-12 bg-surface-soft rounded-[12px] w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const recommended = data?.recommended ?? [];
  const avoided = data?.avoided ?? [];

  if (recommended.length === 0 && avoided.length === 0) {
    return (
      <section className="mb-12 text-center py-16 bg-white border border-hairline-soft rounded-[32px] shadow-sm">
        <p className="text-steel font-medium">분석된 AI 투자 추천/회피 종목 데이터가 없습니다.</p>
      </section>
    );
  }

  const getLinkHref = (item: DashboardRecommendationItem) => {
    if (item.marketType === 'OVERSEAS') {
      return `/overseas-stocks/${item.stockCode}?exchange=NASDAQ`;
    }
    return `/stock/${item.stockCode}`;
  };

  return (
    <section className="mb-12">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-ink">AI 오늘의 투자 추천</h3>
        <p className="text-sm text-steel mt-1">AI가 감성 지수와 가격 변동 모멘텀을 종합하여 매일 엄선합니다.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recommended Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h4 className="font-bold text-lg text-ink">🔥 AI 오늘의 추천 종목</h4>
          </div>
          {recommended.length === 0 ? (
            <div className="bg-white border border-hairline-soft rounded-[24px] p-8 text-center text-steel shadow-sm">
              추천 종목이 없습니다.
            </div>
          ) : (
            recommended.map((item) => (
              <Link
                key={item.stockCode}
                href={getLinkHref(item)}
                className="bg-white border border-hairline-soft hover:border-emerald-200 rounded-[24px] p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group flex flex-col justify-between block min-h-[170px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] text-steel font-medium tracking-wider">{item.stockCode}</span>
                      <h5 className="font-bold text-lg group-hover:text-meta-blue transition-colors leading-snug">
                        {item.stockName}
                      </h5>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                      매수 {item.aiScore > 0 ? `+${item.aiScore}` : item.aiScore}점
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-lg font-bold text-ink">{fmt(item.price)}원</span>
                    <span className={`text-xs font-semibold ${item.changeRate >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                      {item.changeRate >= 0 ? '+' : ''}{item.changeRate.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50/25 border border-emerald-100/50 rounded-xl p-3.5 text-xs text-slate leading-relaxed">
                  {item.reason}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Avoided Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <h4 className="font-bold text-lg text-ink">⚠️ AI 오늘의 피해야 할 종목</h4>
          </div>
          {avoided.length === 0 ? (
            <div className="bg-white border border-hairline-soft rounded-[24px] p-8 text-center text-steel shadow-sm">
              회피 종목이 없습니다.
            </div>
          ) : (
            avoided.map((item) => (
              <Link
                key={item.stockCode}
                href={getLinkHref(item)}
                className="bg-white border border-hairline-soft hover:border-rose-200 rounded-[24px] p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group flex flex-col justify-between block min-h-[170px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] text-steel font-medium tracking-wider">{item.stockCode}</span>
                      <h5 className="font-bold text-lg group-hover:text-meta-blue transition-colors leading-snug">
                        {item.stockName}
                      </h5>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                      매도 {item.aiScore}점
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-lg font-bold text-ink">{fmt(item.price)}원</span>
                    <span className={`text-xs font-semibold ${item.changeRate >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                      {item.changeRate >= 0 ? '+' : ''}{item.changeRate.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="bg-rose-50/25 border border-rose-100/50 rounded-xl p-3.5 text-xs text-slate leading-relaxed">
                  {item.reason}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [dashboardTab, setDashboardTab] = useState<'domestic' | 'overseas'>('domestic');
  const isVisible = useVisibility();

  const allDashboardCodes = useMemo(
    () => [...new Set([HERO_CODE, ...RECOMMENDED_CODES])],
    [],
  );

  const { data: batchPrices, isLoading: pricesLoading } = useSWR(
    isVisible ? 'dashboard-batch-prices' : null,
    () => getBatchStockPrices(allDashboardCodes),
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  const initialPrices = useMemo(
    () => batchPrices ?? {},
    [batchPrices],
  );

  const { hero, recommended } = useDashboardStocks(allDashboardCodes, HERO_CODE, RECOMMENDED_CODES, isVisible, initialPrices, pricesLoading);

  const { data: aiRecommendations, isLoading: aiLoading } = useSWR(
    isVisible ? `dashboard-ai-recommendations-${dashboardTab}` : null,
    () => getDashboardRecommendations(dashboardTab === 'domestic' ? 'DOMESTIC' : 'OVERSEAS'),
    { revalidateOnFocus: false, dedupingInterval: 30000, refreshInterval: 30000 }
  );

  const { data: portfolio } = useSWR(
    isAuthenticated ? 'dashboard-portfolio' : null,
    () => getPortfolio(),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  const { data: holdings } = useSWR(
    isAuthenticated ? 'dashboard-holdings' : null,
    () => getHoldings(),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="max-w-7xl mx-auto px-6 py-12">
        {!isAuthenticated && (
          <div className="mb-10 bg-meta-blue/5 border border-meta-blue/20 rounded-meta-xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-meta-blue flex-shrink-0" />
              <p className="text-sm text-ink">
                <span className="font-bold">게스트 모드</span> — 현재가와 검색은 자유롭게 이용 가능합니다. 거래는 로그인 후 이용할 수 있습니다.
              </p>
            </div>
            <Link href="/login" className="meta-button-buy text-sm px-5 py-2 flex-shrink-0">
              로그인
            </Link>
          </div>
        )}

        <div className="flex gap-2 mb-10">
          <button
            onClick={() => setDashboardTab('domestic')}
            className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
              dashboardTab === 'domestic'
                ? 'bg-ink text-white border-ink'
                : 'bg-white text-ink border-hairline hover:border-ink'
            }`}
          >
            국내
          </button>
          <button
            onClick={() => setDashboardTab('overseas')}
            className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
              dashboardTab === 'overseas'
                ? 'bg-ink text-white border-ink'
                : 'bg-white text-ink border-hairline hover:border-ink'
            }`}
          >
            해외
          </button>
        </div>

        {dashboardTab === 'domestic' && (
          <>
            <AiRecommendationsSection data={aiRecommendations} isLoading={aiLoading} />
          </>
        )}

        {dashboardTab === 'overseas' && (
          <>
            <AiRecommendationsSection data={aiRecommendations} isLoading={aiLoading} />

            {!isAuthenticated && (
              <div className="bg-white border border-hairline-soft rounded-meta-xl p-8 text-center text-steel text-sm">
                <Globe className="w-8 h-8 mx-auto mb-3 text-stone" />
                <p className="font-bold text-ink mb-1">해외 주식 거래</p>
                <p className="mb-4">로그인 후 해외 주식 잔고를 확인하고 거래할 수 있습니다.</p>
                <Link href="/login" className="meta-button-buy text-sm px-6 py-2">
                  로그인
                </Link>
              </div>
            )}
          </>
        )}
      </main>

      <button className="md:hidden fixed bottom-8 right-8 w-14 h-14 bg-meta-blue text-white rounded-full shadow-xl flex items-center justify-center">
        <ArrowUpRight className="w-6 h-6" />
      </button>
    </div>
  );
}