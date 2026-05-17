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
} from '@/lib/api';
import { getBatchPrices } from '@/services/stockCatalogApi';
import { useAuth } from '@/lib/auth';
import { useVisibility } from '@/hooks/useVisibility';
import OverseasBalanceTable from '@/components/overseas/OverseasBalanceTable';
import { getTrendingOverseasStocks } from '@/services/overseasStockApi';
import OverseasStockCard from '@/components/overseas/OverseasStockCard';
import type { OverseasStockCatalogItem } from '@/types/overseasStock';

const HERO_CODE = '005930';
const RECOMMENDED_CODES = ['005930', '000660', '035420', '035720'];
const STOCK_NAMES: Record<string, string> = {
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '035420': 'NAVER',
  '035720': '카카오',
};
const POLLING_INTERVAL = 15000;

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
  return minutes.map((m) => ({
    time: Math.floor(new Date(m.time).getTime() / 1000) as Time,
    value: m.close,
  }));
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
            {error && (
              <div className="flex items-center justify-center h-full text-market-down text-sm">
                {error}
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
      className="meta-card p-6 hover:shadow-lg transition-shadow cursor-pointer group block"
    >
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
    </Link>
  );
}

function PortfolioSummary({ portfolio }: { portfolio: PortfolioResponse | null }) {
  if (!portfolio) return null;

  const totalReturn = portfolio.totalAssetValue - portfolio.initialBalance;
  const totalReturnRate = portfolio.initialBalance > 0
    ? ((totalReturn / portfolio.initialBalance) * 100).toFixed(2)
    : '0.00';
  const isPositive = totalReturn >= 0;

  return (
    <section className="mb-12">
      <h3 className="text-2xl font-bold mb-6">내 포트폴리오</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-hairline-soft rounded-meta-xl p-5">
          <p className="text-xs text-steel mb-1">총 자산</p>
          <p className="text-2xl font-bold text-ink">{fmt(portfolio.totalAssetValue)}원</p>
        </div>
        <div className="bg-white border border-hairline-soft rounded-meta-xl p-5">
          <p className="text-xs text-steel mb-1">현금 잔액</p>
          <p className="text-2xl font-bold text-ink">{fmt(portfolio.cashBalance)}원</p>
        </div>
        <div className="bg-white border border-hairline-soft rounded-meta-xl p-5">
          <p className="text-xs text-steel mb-1">총 수익률</p>
          <p className={`text-2xl font-bold ${isPositive ? 'text-market-up' : 'text-market-down'}`}>
            {isPositive ? '+' : ''}{totalReturnRate}%
          </p>
        </div>
        <div className="bg-white border border-hairline-soft rounded-meta-xl p-5">
          <p className="text-xs text-steel mb-1">투자금액</p>
          <p className="text-2xl font-bold text-ink">{fmt(portfolio.initialBalance)}원</p>
        </div>
      </div>
    </section>
  );
}

function HoldingsList({ holdings }: { holdings: HoldingResponse[] }) {
  if (holdings.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">보유 종목</h3>
      </div>
      <div className="bg-white border border-hairline-soft rounded-meta-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline-soft text-steel text-xs">
              <th className="text-left px-5 py-3 font-medium">종목</th>
              <th className="text-right px-5 py-3 font-medium">보유수량</th>
              <th className="text-right px-5 py-3 font-medium">평균단가</th>
              <th className="text-right px-5 py-3 font-medium">현재가</th>
              <th className="text-right px-5 py-3 font-medium">평가손익</th>
              <th className="text-right px-5 py-3 font-medium">수익률</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.id} className="border-b border-hairline-soft last:border-b-0 hover:bg-surface-soft transition-colors">
                <td className="px-5 py-4">
                  <Link href={`/stock/${h.stockCode}`} className="hover:text-meta-blue transition-colors">
                    <p className="font-bold text-ink">{h.stockName}</p>
                    <p className="text-xs text-steel">{h.stockCode}</p>
                  </Link>
                </td>
                <td className="text-right px-5 py-4 font-medium">{fmt(h.quantity)}</td>
                <td className="text-right px-5 py-4">{fmt(h.avgPrice)}</td>
                <td className="text-right px-5 py-4">{fmt(h.currentPrice)}</td>
                <td className={`text-right px-5 py-4 font-medium ${h.profitLoss >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                  {h.profitLoss >= 0 ? '+' : ''}{fmt(h.profitLoss)}
                </td>
                <td className={`text-right px-5 py-4 font-bold ${h.profitRate >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                  {h.profitRate >= 0 ? '+' : ''}{h.profitRate.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function useDashboardStocks(
  heroCode: string,
  recommendedCodes: string[],
  isVisible: boolean,
): { hero: HeroSnapshot; recommended: RecommendedSnapshot[] } {
  const allCodes = useMemo(
    () => [...new Set([heroCode, ...recommendedCodes])],
    [heroCode, recommendedCodes],
  );
  const batchKey = allCodes.sort().join(',');

  const { data: batchPrices, error: batchError } = useSWR(
    isVisible ? `dashboard-batch-${batchKey}` : null,
    () => getBatchPrices(allCodes),
    { refreshInterval: POLLING_INTERVAL, dedupingInterval: 15000, keepPreviousData: true },
  );

  const { data: minutes, error: minutesError } = useSWR(
    isVisible ? `hero-minutes-${heroCode}` : null,
    () => getMinuteCandles(heroCode),
    { refreshInterval: POLLING_INTERVAL, dedupingInterval: 15000 },
  );

  const sparkline = useMemo(() => minutes ? toSparkline(minutes) : [], [minutes]);
  const heroPrice = batchPrices?.[heroCode] ?? null;
  const heroLoading = !batchPrices && !batchError;
  const hero: HeroSnapshot = useMemo(() => ({
    code: heroCode,
    name: heroPrice?.stockName || STOCK_NAMES[heroCode] || heroCode,
    info: heroPrice,
    sparkline,
    loading: heroLoading,
    error: batchError?.message ?? (minutesError?.message ?? null),
  }), [heroCode, heroPrice, sparkline, heroLoading, batchError, minutesError]);

  const recommended: RecommendedSnapshot[] = useMemo(() =>
    recommendedCodes.map((code) => {
      const price = batchPrices?.[code] ?? null;
      return {
        code,
        name: price?.stockName || STOCK_NAMES[code] || code,
        info: price,
        sparkline: [],
        loading: !batchPrices && !batchError,
        error: batchError?.message ?? null,
      };
    }),
    [recommendedCodes, batchPrices, batchError],
  );

  return { hero, recommended };
}

function OverseasRecommendedSection() {
  const isVisible = useVisibility();
  const { data: trendingItems, error } = useSWR<OverseasStockCatalogItem[]>(
    isVisible ? 'overseas-trending' : null,
    () => getTrendingOverseasStocks(),
    { dedupingInterval: 30000 }
  );

  const items = trendingItems ?? [];

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

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [dashboardTab, setDashboardTab] = useState<'domestic' | 'overseas'>('domestic');
  const isVisible = useVisibility();

  const { hero, recommended } = useDashboardStocks(HERO_CODE, RECOMMENDED_CODES, isVisible);

  const { data: portfolio } = useSWR(
    isAuthenticated ? 'dashboard-portfolio' : null,
    () => getPortfolio(),
    { refreshInterval: 30000, dedupingInterval: 15000 }
  );
  const { data: holdings } = useSWR(
    isAuthenticated ? 'dashboard-holdings' : null,
    () => getHoldings(),
    { refreshInterval: 30000, dedupingInterval: 15000 }
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
            {isAuthenticated && portfolio && (
              <>
                <PortfolioSummary portfolio={portfolio} />
                <HoldingsList holdings={holdings ?? []} />
              </>
            )}

            <HeroSection data={hero} isLoggedIn={isAuthenticated} />

            <section>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">인기 추천 종목</h3>
                <Link href="/stocks" className="text-meta-blue font-bold text-sm hover:underline">전체보기</Link>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommended.map((stock) => (
                  <StockCard key={stock.code} data={stock} />
                ))}
              </div>
            </section>
          </>
        )}

        {dashboardTab === 'overseas' && (
          <>
            {isAuthenticated && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">해외 보유 종목</h3>
                  <Link href="/overseas-stocks" className="text-meta-blue font-bold text-sm hover:underline">전체 해외 종목 보기</Link>
                </div>
                <OverseasBalanceTable />
              </section>
            )}

            <section className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">인기 추천 종목</h3>
                <Link href="/overseas-stocks" className="text-meta-blue font-bold text-sm hover:underline">전체보기</Link>
              </div>
              <OverseasRecommendedSection />
            </section>

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