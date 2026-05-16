'use client';

import { useEffect, useState, useCallback, useReducer } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StockChart, { CandlePoint } from '@/components/StockChart';
import {
  getStockPrice,
  getDailyCandles,
  getMinuteCandles,
  MappedStockPrice,
  MappedDailyCandle,
  MappedMinuteCandle,
} from '@/lib/api';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Calendar,
  BarChart3,
  Hash,
  Activity,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { getStockName } from '@/lib/stockMap';

type Period = 'D' | 'W' | 'M' | 'Y';

const PERIOD_LABELS: Record<Period, string> = {
  D: '일봉',
  W: '주봉',
  M: '월봉',
  Y: '연봉',
};

interface State {
  priceInfo: MappedStockPrice | null;
  candles: MappedDailyCandle[];
  minuteCandles: MappedMinuteCandle[];
  loading: boolean;
  error: string | null;
}

const initialState: State = {
  priceInfo: null,
  candles: [],
  minuteCandles: [],
  loading: false,
  error: null,
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_PRICE_SUCCESS'; payload: MappedStockPrice }
  | { type: 'FETCH_CANDLES_SUCCESS'; payload: MappedDailyCandle[] }
  | { type: 'FETCH_MINUTE_SUCCESS'; payload: MappedMinuteCandle[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_PRICE_SUCCESS':
      return { ...state, priceInfo: action.payload };
    case 'FETCH_CANDLES_SUCCESS':
      return { ...state, candles: action.payload, minuteCandles: [], loading: false };
    case 'FETCH_MINUTE_SUCCESS':
      return { ...state, minuteCandles: action.payload, candles: [], loading: false };
    case 'FETCH_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

/** 숫자 포맷: 3자리 콤마 */
function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

/** 가격 변동 색상 클래스 */
function priceColorClass(info: MappedStockPrice | null): string {
  if (!info) return 'text-ink';
  if (info.isLimitUp || info.isUp) return 'text-market-up';
  if (info.isLimitDown || info.isDown) return 'text-market-down';
  return 'text-market-neutral';
}

/** 가격 변동 아이콘 */
function PriceIcon({ info }: { info: MappedStockPrice | null }) {
  if (!info || info.sign === '3') return <Minus className="w-5 h-5" />;
  if (info.isUp) return <TrendingUp className="w-5 h-5" />;
  return <TrendingDown className="w-5 h-5" />;
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stockCode = (params.code as string) || '';
  const stockName = getStockName(stockCode);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { priceInfo, candles, minuteCandles, loading, error } = state;

  const [period, setPeriod] = useState<Period>('D');
  const [viewMode, setViewMode] = useState<'daily' | 'minute'>('daily');

  // 날짜 범위 계산
  const getDateRange = useCallback((p: Period) => {
    const today = new Date();
    const endDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    const start = new Date(today);
    switch (p) {
      case 'D':
        start.setMonth(today.getMonth() - 3);
        break;
      case 'W':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'M':
        start.setFullYear(today.getFullYear() - 3);
        break;
      case 'Y':
        start.setFullYear(today.getFullYear() - 10);
        break;
    }
    const startDate = start.toISOString().slice(0, 10).replace(/-/g, '');
    return { startDate, endDate };
  }, []);

  // 현재가 조회
  const fetchPrice = useCallback(() => {
    if (!stockCode) return;
    getStockPrice(stockCode)
      .then((data) => dispatch({ type: 'FETCH_PRICE_SUCCESS', payload: data }))
      .catch((e) => console.error('현재가 조회 실패:', e));
  }, [stockCode]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // 캔들 조회
  const fetchCandleData = useCallback(() => {
    if (!stockCode) return;
    dispatch({ type: 'FETCH_START' });

    if (viewMode === 'daily') {
      const { startDate, endDate } = getDateRange(period);
      getDailyCandles({ stockCode, period, startDate, endDate })
        .then((data) => dispatch({ type: 'FETCH_CANDLES_SUCCESS', payload: data }))
        .catch((e) => dispatch({ type: 'FETCH_ERROR', payload: e.message }));
    } else {
      getMinuteCandles(stockCode)
        .then((data) => dispatch({ type: 'FETCH_MINUTE_SUCCESS', payload: data }))
        .catch((e) => dispatch({ type: 'FETCH_ERROR', payload: e.message }));
    }
  }, [stockCode, period, viewMode, getDateRange]);

  useEffect(() => {
    fetchCandleData();
  }, [fetchCandleData]);

  // 차트 데이터 매핑
  const chartData: {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
  }[] =
    viewMode === 'daily'
      ? candles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      : minuteCandles.map((c) => ({
          time: new Date(c.time).getTime() / 1000,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

  const colorClass = priceColorClass(priceInfo);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* ── Top Bar ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-hairline-soft h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-steel hover:text-ink transition-colors rounded-full hover:bg-surface-soft"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-bold">{stockName}</h1>
            <span className="text-xs text-steel font-medium bg-surface-soft px-2 py-0.5 rounded-full">
              {stockCode}
            </span>
            {priceInfo && (
              <span className="text-xs text-steel">
                {priceInfo.marketName}
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ═══════════════════════════════════════════════
            Price Hero
        ═══════════════════════════════════════════════ */}
        <section className="bg-white border border-hairline-soft rounded-[24px] p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            {/* Left: 현재가 */}
            <div>
              <p className="text-sm text-steel mb-1 flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                현재가
              </p>
              <div className="flex items-baseline gap-2">
                <p className={`text-5xl font-extrabold tracking-tight ${colorClass}`}>
                  {priceInfo ? fmt(priceInfo.price) : '—'}
                </p>
                <span className="text-xl text-steel font-medium">원</span>
              </div>

              {priceInfo && (
                <div className={`flex items-center gap-1.5 mt-3 font-bold text-lg ${colorClass}`}>
                  <PriceIcon info={priceInfo} />
                  <span>
                    {priceInfo.change >= 0 ? '+' : ''}
                    {fmt(priceInfo.change)} ({priceInfo.changeRate >= 0 ? '+' : ''}
                    {priceInfo.changeRate}%)
                  </span>
                  {priceInfo.isLimitUp && (
                    <span className="ml-1 text-xs bg-market-up/10 text-market-up px-2 py-0.5 rounded-full font-bold">
                      상한가
                    </span>
                  )}
                  {priceInfo.isLimitDown && (
                    <span className="ml-1 text-xs bg-market-down/10 text-market-down px-2 py-0.5 rounded-full font-bold">
                      하한가
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: 요약 지표 */}
            {priceInfo && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 text-sm">
                <div>
                  <p className="text-steel text-xs mb-0.5">시가</p>
                  <p className="font-semibold text-ink">{fmt(priceInfo.open)}</p>
                </div>
                <div>
                  <p className="text-steel text-xs mb-0.5">고가</p>
                  <p className="font-semibold text-ink">{fmt(priceInfo.high)}</p>
                </div>
                <div>
                  <p className="text-steel text-xs mb-0.5">저가</p>
                  <p className="font-semibold text-ink">{fmt(priceInfo.low)}</p>
                </div>
                <div>
                  <p className="text-steel text-xs mb-0.5">거래량</p>
                  <p className="font-semibold text-ink">{fmt(priceInfo.volume)}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            Detail Grid
        ═══════════════════════════════════════════════ */}
        {priceInfo && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoCard
              icon={<Landmark className="w-4 h-4" />}
              label="기준가 / 전일종가"
              value={fmt(priceInfo.basePrice)}
              sub="전일대비 기준"
            />
            <InfoCard
              icon={<ArrowUpRight className="w-4 h-4 text-market-up" />}
              label="상한가"
              value={fmt(priceInfo.upperLimit)}
              highlight="up"
            />
            <InfoCard
              icon={<ArrowDownRight className="w-4 h-4 text-market-down" />}
              label="하한가"
              value={fmt(priceInfo.lowerLimit)}
              highlight="down"
            />
            <InfoCard
              icon={<BarChart3 className="w-4 h-4" />}
              label="누적거래대금"
              value={`${fmt(priceInfo.volumeValue)} 원`}
              sub="당일"
            />
            <InfoCard
              icon={<Hash className="w-4 h-4" />}
              label="PER / PBR"
              value={`${priceInfo.per.toFixed(2)} / ${priceInfo.pbr.toFixed(2)}`}
            />
            <InfoCard
              icon={<Hash className="w-4 h-4" />}
              label="EPS / BPS"
              value={`${fmt(priceInfo.eps)} / ${fmt(priceInfo.bps)}`}
            />
            <InfoCard
              icon={<TrendingUp className="w-4 h-4 text-market-up" />}
              label="52주 최고"
              value={fmt(priceInfo.w52High)}
              highlight="up"
            />
            <InfoCard
              icon={<TrendingDown className="w-4 h-4 text-market-down" />}
              label="52주 최저"
              value={fmt(priceInfo.w52Low)}
              highlight="down"
            />
            <InfoCard
              icon={<Landmark className="w-4 h-4" />}
              label="시가총액"
              value={`${fmt(priceInfo.marketCap)} 억원`}
              sub="HTS 기준"
              className="md:col-span-2 lg:col-span-4"
            />
          </section>
        )}

        {/* ═══════════════════════════════════════════════
            Chart Section
        ═══════════════════════════════════════════════ */}
        <section className="bg-white border border-hairline-soft rounded-[24px] p-6 shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
                viewMode === 'daily'
                  ? 'bg-meta-blue text-white'
                  : 'bg-surface-soft text-steel hover:text-ink'
              }`}
            >
              <Calendar className="w-4 h-4" /> 일봉+
            </button>
            <button
              onClick={() => setViewMode('minute')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
                viewMode === 'minute'
                  ? 'bg-meta-blue text-white'
                  : 'bg-surface-soft text-steel hover:text-ink'
              }`}
            >
              <Clock className="w-4 h-4" /> 분봉
            </button>

            {viewMode === 'daily' && (
              <>
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
                      period === p
                        ? 'bg-meta-blue text-white'
                        : 'bg-surface-soft text-steel hover:text-ink'
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Chart */}
          <div className="w-full h-[420px] bg-surface-soft rounded-meta-xxl p-2 border border-hairline-soft">
            {loading && (
              <div className="w-full h-full flex items-center justify-center text-steel">
                데이터 로딩 중...
              </div>
            )}
            {error && (
              <div className="w-full h-full flex items-center justify-center text-market-down">
                {error}
              </div>
            )}
            {!loading && !error && chartData.length > 0 && (
              <StockChart
                data={chartData as CandlePoint[]}
                type="candlestick"
                height={400}
              />
            )}
            {!loading && !error && chartData.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-steel">
                데이터가 없습니다.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ── Info Card ─────────────────────────────────────────── */

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
    <div
      className={`rounded-meta-xl border p-4 shadow-sm ${highlightClass} ${className}`}
    >
      <div className="flex items-center gap-1.5 text-steel text-xs mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold text-ink">{value}</p>
      {sub && <p className="text-[11px] text-steel mt-0.5">{sub}</p>}
    </div>
  );
}
