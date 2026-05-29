'use client';

import OverseasStockCard from '@/components/overseas/OverseasStockCard';
import StockChart, { AreaPoint } from '@/components/StockChart';
import { useStockPriceStreamBatch } from '@/hooks/useStockPriceStream';
import { useVisibility } from '@/hooks/useVisibility';
import {
  DashboardRecommendationItem,
  DashboardRecommendations,
  getDashboardRecommendations,
  getFavoriteStatus,
  getMinuteCandles,
  MappedMinuteCandle,
  MappedStockPrice,
  toggleFavorite
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { resolveStockName } from '@/lib/stockMap';
import { getTrendingOverseasStocks, type OverseasTrendingResponse } from '@/services/overseasStockApi';
import { getBatchStockPrices } from '@/services/stockCatalogApi';
import type { OverseasStockCatalogItem } from '@/types/overseasStock';
import { Time } from 'lightweight-charts';
import {
  ArrowUpRight,
  Eye,
  Globe,
  Minus,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';

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
    <section className="mb-16 -tracking-[0.16px]">
      <div className="bg-canvas border border-hairline-soft rounded-meta-xxxl overflow-hidden shadow-[0_20px_40px_rgba(0,100,224,0.08)]">
        <div className="grid lg:grid-cols-[1fr_400px] items-center">
          <div className="p-8 md:p-12 space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="bg-market-up text-white text-[10px] font-extrabold px-3 py-1 rounded-meta-full uppercase tracking-wider shadow-sm">
                Today&apos;s Pick
              </span>
              <span className="text-steel text-sm font-semibold">AI 가 분석한 오늘의 강력 추천주</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight -tracking-[0.6px] text-ink">
              {`${STOCK_NAMES[HERO_CODE] || info?.stockName || HERO_CODE} (${HERO_CODE})`}
            </h2>
            <p className="text-lg text-slate leading-relaxed font-normal max-w-xl">
              반도체 사이클 회복과 AI 수요 증가로 인해 2분기 실적 개선이 기대됩니다. 현재
              구간에서 강력한 매수 신호가 감지되었습니다.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href={isLoggedIn ? `/stock/${HERO_CODE}` : '/login'}
                className="meta-button-buy inline-block text-center shadow-md active:scale-95 transition-all"
              >
                지금 매수하기
              </Link>
              <Link href={`/stock/${HERO_CODE}`} className="meta-button-secondary inline-block text-center active:scale-95 transition-all">
                상세 분석 보기
              </Link>
            </div>
          </div>

          <div className="bg-surface-soft p-8 h-full flex flex-col justify-center border-l border-hairline-soft">
            {loading && (
              <div className="flex items-center justify-center h-full text-steel text-sm font-bold">
                데이터 로딩 중...
              </div>
            )}
            {!loading && error && (
              <div className="flex items-center justify-center h-full text-market-up text-sm font-bold">
                {error}
              </div>
            )}
            {!loading && !error && !info && (
              <div className="flex items-center justify-center h-full text-steel text-sm">
                가격 데이터를 불러올 수 없습니다.
              </div>
            )}
            {!loading && !error && info && (
              <div className="space-y-6">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-steel font-bold">현재가</p>
                    <p className={`text-3xl font-black ${colorClass} -tracking-[0.4px]`}>
                      {fmt(info.price)}{' '}
                      <span className="text-lg font-bold">
                        {info.change >= 0 ? '+' : ''}
                        {fmt(info.change)}
                      </span>
                    </p>
                    <p className={`text-sm font-extrabold ${colorClass}`}>
                      {info.changeRate >= 0 ? '+' : ''}
                      {info.changeRate}%
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs text-steel font-bold">매칭 점수</p>
                    <p className="text-3xl font-black text-meta-blue">98%</p>
                  </div>
                </div>
                <div className="h-[200px] w-full bg-canvas rounded-meta-xxl p-4 border border-hairline-soft shadow-inner">
                  {sparkline.length > 0 ? (
                    <StockChart data={sparkline} type="area" color={info.isUp ? '#e41e3f' : '#0064e0'} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-steel text-xs">
                      차트 데이터 없음
                    </div>
                  )}
                </div>
              </div>
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
  const { isAuthenticated } = useAuth();

  const { data: minutes } = useSWR(
    isVisible && code ? `stock-minutes-${code}` : null,
    () => getMinuteCandles(code),
    { dedupingInterval: 15000 }
  );

  const { data: favoriteData, mutate: mutateFavorite } = useSWR(
    isAuthenticated && code ? `favorite-status-${code}` : null,
    () => getFavoriteStatus(code),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  const isFavorite = favoriteData?.favorited ?? false;
  const [favoriteToggleLoading, setFavoriteToggleLoading] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    setFavoriteToggleLoading(true);
    try {
      const res = await toggleFavorite(code);
      mutateFavorite({ favorited: res.favorited }, false);
      mutate('user-favorites');
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setFavoriteToggleLoading(false);
    }
  };

  const sparkline = useMemo(() => (minutes ? toSparkline(minutes) : []), [minutes]);
  const displayName = resolveStockName(code, name || info?.stockName);

  if (loading || !info) {
    return (
      <div className="bg-canvas border border-hairline-soft rounded-meta-xl p-6 block animate-pulse space-y-4">
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
      className="bg-canvas border border-hairline-soft hover:border-hairline rounded-meta-xl p-6 hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between h-full min-h-[220px] -tracking-[0.14px] block"
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-steel font-bold mb-0.5">{code}</p>
            <h4 className="font-extrabold text-lg text-ink group-hover:text-meta-blue transition-colors leading-snug">{displayName}</h4>
          </div>
          {isAuthenticated && (
            <button
              onClick={handleToggleFavorite}
              disabled={favoriteToggleLoading}
              className="p-1 rounded-full hover:bg-surface-soft transition-colors cursor-pointer group"
              title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <Star
                className={`w-5 h-5 transition-all duration-300 ${
                  isFavorite
                    ? 'text-yellow-500 fill-yellow-500 scale-110'
                    : 'text-steel group-hover:text-yellow-500 group-hover:scale-105'
                }`}
              />
            </button>
          )}
        </div>

        <div>
          <p className="text-2xl font-black text-ink">{fmt(info.price)}</p>
          <div className={`flex items-center gap-1 text-sm font-extrabold ${colorClass}`}>
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
          <div className="w-full h-full flex items-center justify-center bg-surface-soft/40 rounded-meta-xl border border-hairline-soft/50">
            <span className="text-[10px] text-steel font-bold">차트 로딩 중...</span>
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
  const { data: minutes } = useSWR(
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
  }), [heroCode, heroPrice, sparkline, pricesLoading]);

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
      <section className="mb-12 -tracking-[0.16px]">
        <div className="mb-8">
          <h3 className="text-2xl font-extrabold text-ink -tracking-[0.4px]">AI 오늘의 투자 추천</h3>
          <p className="text-sm text-steel mt-1">AI가 감성 지수와 가격 변동 모멘텀을 종합하여 매일 엄선합니다.</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#31a24c] animate-pulse" />
              <h4 className="font-extrabold text-lg text-ink">🔥 AI 오늘의 추천 종목</h4>
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-canvas border border-hairline-soft rounded-meta-xxl p-6 space-y-4 animate-pulse shadow-sm">
                <div className="flex justify-between">
                  <div className="h-6 bg-surface-soft rounded w-1/3" />
                  <div className="h-6 bg-surface-soft rounded-meta-full w-14" />
                </div>
                <div className="h-5 bg-surface-soft rounded w-1/4" />
                <div className="h-12 bg-surface-soft rounded-meta-xl w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-market-up animate-pulse" />
              <h4 className="font-extrabold text-lg text-ink">⚠️ AI 오늘의 피해야 할 종목</h4>
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-canvas border border-hairline-soft rounded-meta-xxl p-6 space-y-4 animate-pulse shadow-sm">
                <div className="flex justify-between">
                  <div className="h-6 bg-surface-soft rounded w-1/3" />
                  <div className="h-6 bg-surface-soft rounded-meta-full w-14" />
                </div>
                <div className="h-5 bg-surface-soft rounded w-1/4" />
                <div className="h-12 bg-surface-soft rounded-meta-xl w-full" />
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
      <section className="mb-12 text-center py-16 bg-canvas border border-hairline-soft rounded-meta-xxxl shadow-sm">
        <p className="text-steel font-bold">분석된 AI 투자 추천/회피 종목 데이터가 없습니다.</p>
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
    <section className="mb-12 -tracking-[0.16px]">
      <div className="mb-8 border-b border-hairline-soft pb-4">
        <h3 className="text-2xl font-extrabold text-ink -tracking-[0.4px]">AI 오늘의 투자 추천</h3>
        <p className="text-sm text-steel mt-1">AI가 감성 지수와 가격 변동 모멘텀을 종합하여 매일 엄선합니다.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recommended Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#31a24c]" />
            <h4 className="font-extrabold text-lg text-ink">🔥 AI 오늘의 추천 종목</h4>
          </div>
          {recommended.length === 0 ? (
            <div className="bg-canvas border border-hairline-soft rounded-meta-xxl p-8 text-center text-steel shadow-sm">
              추천 종목이 없습니다.
            </div>
          ) : (
            recommended.map((item) => (
              <Link
                key={item.stockCode}
                href={getLinkHref(item)}
                className="bg-canvas border border-hairline-soft hover:border-[#31a24c]/40 rounded-meta-xxl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group flex flex-col justify-between block min-h-[170px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] text-steel font-bold tracking-wider">{item.stockCode}</span>
                      <h5 className="font-extrabold text-lg text-ink group-hover:text-meta-blue transition-colors leading-snug">
                        {item.stockName}
                      </h5>
                    </div>
                    <span className="px-3 py-1 rounded-meta-full text-xs font-bold bg-[#31a24c]/10 text-[#31a24c] border border-[#31a24c]/20 shadow-sm -tracking-[0.14px]">
                      매수 {item.aiScore > 0 ? `+${item.aiScore}` : item.aiScore}점
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-lg font-black text-ink">{fmt(item.price)}원</span>
                    <span className={`text-xs font-extrabold ${item.changeRate >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                      {item.changeRate >= 0 ? '+' : ''}{item.changeRate.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="bg-surface-soft/60 border border-hairline-soft/80 rounded-meta-xl p-4 text-xs text-slate leading-relaxed">
                  {item.reason}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Avoided Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-market-up" />
            <h4 className="font-extrabold text-lg text-ink">⚠️ AI 오늘의 피해야 할 종목</h4>
          </div>
          {avoided.length === 0 ? (
            <div className="bg-canvas border border-hairline-soft rounded-meta-xxl p-8 text-center text-steel shadow-sm">
              회피 종목이 없습니다.
            </div>
          ) : (
            avoided.map((item) => (
              <Link
                key={item.stockCode}
                href={getLinkHref(item)}
                className="bg-canvas border border-hairline-soft hover:border-market-up/40 rounded-meta-xxl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group flex flex-col justify-between block min-h-[170px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] text-steel font-bold tracking-wider">{item.stockCode}</span>
                      <h5 className="font-extrabold text-lg text-ink group-hover:text-meta-blue transition-colors leading-snug">
                        {item.stockName}
                      </h5>
                    </div>
                    <span className="px-3 py-1 rounded-meta-full text-xs font-bold bg-market-up/10 text-market-up border border-market-up/20 shadow-sm -tracking-[0.14px]">
                      매도 {item.aiScore}점
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-lg font-black text-ink">{fmt(item.price)}원</span>
                    <span className={`text-xs font-extrabold ${item.changeRate >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                      {item.changeRate >= 0 ? '+' : ''}{item.changeRate.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="bg-surface-soft/60 border border-hairline-soft/80 rounded-meta-xl p-4 text-xs text-slate leading-relaxed">
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
  const dashboardTab = 'domestic' as 'domestic' | 'overseas';
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

        {/* 해외 주식 비활성화로 인해 탭 비활성화 및 국내 주식 단독 노출 */}

        {dashboardTab === 'domestic' && (
          <div className="space-y-16">
            {/* 1. Hero Pick (samsung) */}
            <HeroSection data={hero} isLoggedIn={isAuthenticated} />
            
            {/* 2. Domestic Stocks Grid */}
            <section className="space-y-6 -tracking-[0.16px]">
              <div className="flex items-baseline justify-between border-b border-hairline-soft pb-4">
                <h3 className="text-2xl font-extrabold text-ink -tracking-[0.4px]">🔥 실시간 추천 종목</h3>
                <span className="text-xs text-steel font-bold">실시간 변동률 반영 피드</span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommended.map((stock) => (
                  <StockCard key={stock.code} data={stock} />
                ))}
              </div>
            </section>

            {/* 3. AI recommendations */}
            <AiRecommendationsSection data={aiRecommendations} isLoading={aiLoading} />
          </div>
        )}

        {dashboardTab === 'overseas' && (
          <div className="space-y-16">
            {/* 1. Overseas Recommended Stocks Grid */}
            <section className="space-y-6 -tracking-[0.16px]">
              <div className="flex items-baseline justify-between border-b border-hairline-soft pb-4">
                <h3 className="text-2xl font-extrabold text-ink -tracking-[0.4px]">🌎 인기 해외 추천 종목</h3>
                <span className="text-xs text-steel font-bold">실시간 글로벌 마켓 트렌드</span>
              </div>
              <OverseasRecommendedSection />
            </section>

            {/* 2. AI recommendations */}
            <AiRecommendationsSection data={aiRecommendations} isLoading={aiLoading} />

            {!isAuthenticated && (
              <div className="bg-canvas border border-hairline-soft rounded-meta-xxl p-8 text-center text-steel text-sm shadow-sm max-w-lg mx-auto -tracking-[0.14px]">
                <Globe className="w-10 h-10 mx-auto mb-4 text-stone" />
                <p className="font-extrabold text-lg text-ink mb-1">해외 주식 거래</p>
                <p className="mb-6 leading-relaxed">로그인 후 해외 주식 잔고를 확인하고 거래할 수 있습니다.</p>
                <Link href="/login" className="meta-button-buy inline-block text-sm px-6 py-2.5">
                  로그인
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Real-time AI News Compilation Link Section */}
        <div className="mt-20 bg-canvas border border-hairline-soft rounded-meta-xxxl p-8 md:p-12 shadow-[0_20px_40px_rgba(0,100,224,0.06)] overflow-hidden relative group -tracking-[0.16px]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-meta-blue/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 group-hover:bg-meta-blue/10 transition-all duration-500" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-meta-blue/10 border border-meta-blue/20 rounded-meta-full text-xs font-bold text-meta-blue shadow-sm -tracking-[0.14px]">
                <Sparkles className="w-3.5 h-3.5 text-meta-blue animate-pulse" />
                AI 실시간 수집 뉴스
              </div>
              <h4 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight leading-tight -tracking-[0.4px]">
                실시간 AI 수집 뉴스 모아보기
              </h4>
              <p className="text-sm md:text-base text-slate max-w-2xl leading-relaxed">
                국내 및 해외 주요 16개 관심 종목의 기사들을 인공지능이 실시간 크롤링하여 
                투자 감성 지수 분석과 호재/악재 감지 피드를 일괄적으로 제공합니다.
              </p>
            </div>
            
            <Link
              href="/ai-news"
              className="meta-button-primary inline-flex items-center gap-2 group-hover:scale-[1.03] transition-transform duration-300 shadow-md font-bold text-sm -tracking-[0.14px] px-8 py-3.5 rounded-meta-full cursor-pointer flex-shrink-0"
            >
              수집 뉴스 더보기
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </main>

      <button className="md:hidden fixed bottom-8 right-8 w-14 h-14 bg-meta-blue text-white rounded-full shadow-xl flex items-center justify-center">
        <ArrowUpRight className="w-6 h-6" />
      </button>
    </div>
  );
}