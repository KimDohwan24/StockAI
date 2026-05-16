'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  User,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  Star,
} from 'lucide-react';
import StockChart from '@/components/StockChart';
import Sparkline from '@/components/Sparkline';
import { getStockPrice, getMinuteCandles, MappedStockPrice } from '@/lib/api';
import { getStockCode, searchStockNames, getStockName } from '@/lib/stockMap';

// ── 상수 ───────────────────────────────────────────────────

const HERO_CODE = '005930';
const RECOMMENDED_CODES = ['005930', '000660', '035420', '035720'];
const POLLING_INTERVAL = 5000;

// ── 타입 ───────────────────────────────────────────────────

interface SparklineData {
  time: string | number;
  value: number;
}

interface StockSnapshot {
  code: string;
  name: string;
  info: MappedStockPrice | null;
  sparkline: SparklineData[];
  loading: boolean;
  error: string | null;
}

// ── 숫자 포맷 ─────────────────────────────────────────────

function fmt(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ko-KR');
}

// ── Hero ──────────────────────────────────────────────────

function HeroSection({ data }: { data: StockSnapshot }) {
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
              {getStockName(HERO_CODE)} ({HERO_CODE})
            </h2>
            <p className="text-xl text-slate mb-8 max-w-lg">
              반도체 사이클 회복과 AI 수요 증가로 인해 2분기 실적 개선이 기대됩니다. 현재
              구간에서 강력한 매수 신호가 감지되었습니다.
            </p>
            <div className="flex gap-4">
              <Link href={`/stock/${HERO_CODE}`} className="meta-button-buy inline-block text-center">
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

// ── 추천 종목 카드 ─────────────────────────────────────────

function StockCard({ data }: { data: StockSnapshot }) {
  const { code, name, info, sparkline, loading } = data;

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
          <p className="text-xs text-steel mb-1">{code}</p>
          <h4 className="font-bold text-lg group-hover:text-meta-blue transition-colors">{name}</h4>
        </div>
        <button className="text-hairline hover:text-meta-blue transition-colors">
          <Star className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-end justify-between">
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
        <div className="w-16 h-10 flex-shrink-0 ml-3 overflow-visible">
          {sparkline.length > 0 ? (
            <Sparkline
              data={sparkline}
              color={info.isUp ? '#e41e3f' : '#0064e0'}
            />
          ) : (
            <div className="w-full h-full bg-surface-soft rounded" />
          )}
        </div>
      </div>
    </Link>
  );
}

// ── 메인 대시보드 ──────────────────────────────────────────

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; code: string }[]>([]);

  // Hero 상태
  const [hero, setHero] = useState<StockSnapshot>({
    code: HERO_CODE,
    name: getStockName(HERO_CODE),
    info: null,
    sparkline: [],
    loading: true,
    error: null,
  });

  // 추천 종목 상태
  const [recommended, setRecommended] = useState<StockSnapshot[]>(
    RECOMMENDED_CODES.map((code) => ({
      code,
      name: getStockName(code),
      info: null,
      sparkline: [],
      loading: true,
      error: null,
    }))
  );

  // ── 데이터 페칭 ─────────────────────────────────────────

  const fetchHero = useCallback(async () => {
    try {
      const [info, minuteRaw] = await Promise.all([
        getStockPrice(HERO_CODE),
        getMinuteCandles(HERO_CODE),
      ]);
      const sparkline = minuteRaw.map((m) => ({
        time: Math.floor(new Date(m.time).getTime() / 1000),
        value: m.close,
      }));
      setHero({ ...hero, info, sparkline, loading: false, error: null });
    } catch (e) {
      setHero({ ...hero, loading: false, error: (e as Error).message });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecommended = useCallback(async () => {
    const results = await Promise.all(
      RECOMMENDED_CODES.map(async (code, idx) => {
        try {
          const [info, minuteRaw] = await Promise.all([
            getStockPrice(code),
            getMinuteCandles(code),
          ]);
          const sparkline = minuteRaw.map((m) => ({
            time: Math.floor(new Date(m.time).getTime() / 1000),
            value: m.close,
          }));
          return { ...recommended[idx], info, sparkline, loading: false, error: null };
        } catch (e) {
          return { ...recommended[idx], loading: false, error: (e as Error).message };
        }
      })
    );
    setRecommended(results);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchHero();
    fetchRecommended();

    const timer = setInterval(() => {
      fetchHero();
      fetchRecommended();
    }, POLLING_INTERVAL);

    return () => clearInterval(timer);
  }, [fetchHero, fetchRecommended]);

  // ── 검색 핸들러 ──────────────────────────────────────────

  const navigateToStock = (code: string) => {
    window.location.href = `/stock/${code}`;
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length >= 1) {
      setSuggestions(searchStockNames(value));
    } else {
      setSuggestions([]);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const code = getStockCode(trimmed);
    if (code) {
      navigateToStock(code);
    } else {
      const numeric = trimmed.replace(/\D/g, '');
      if (numeric && numeric.length >= 5) {
        navigateToStock(numeric);
      }
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-hairline-soft h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold tracking-tight text-meta-blue">StockAI</h1>
            <div className="hidden md:block relative w-80">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-2 bg-surface-soft px-4 py-2 rounded-meta-full"
              >
                <Search className="w-4 h-4 text-steel" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="종목명 입력 (예: 삼성전자)"
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-steel"
                />
              </form>
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-hairline-soft rounded-xl shadow-lg z-50 max-h-60 overflow-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => navigateToStock(s.code)}
                      className="w-full text-left px-4 py-2 hover:bg-surface-soft transition-colors text-sm"
                    >
                      <span className="font-bold">{s.name}</span>
                      <span className="text-steel ml-2">{s.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-steel active:text-ink transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-steel active:text-ink transition-colors">
              <User className="w-5 h-5" />
            </button>
            <button className="p-2 text-steel active:text-ink transition-colors">
              <ShoppingCart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <HeroSection data={hero} />

        {/* 추천 종목 그리드 */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold">인기 추천 종목</h3>
            <button className="text-meta-blue font-bold text-sm hover:underline">전체보기</button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommended.map((stock) => (
              <StockCard key={stock.code} data={stock} />
            ))}
          </div>
        </section>
      </main>

      {/* Floating Action Button (Mobile) */}
      <button className="md:hidden fixed bottom-8 right-8 w-14 h-14 bg-meta-blue text-white rounded-full shadow-xl flex items-center justify-center">
        <ArrowUpRight className="w-6 h-6" />
      </button>
    </div>
  );
}
