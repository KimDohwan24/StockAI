'use client';

import { useEffect, useState, useCallback, useReducer } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StockChart from '@/components/StockChart';
import {
  getStockPrice,
  getDailyCandles,
  getMinuteCandles,
  DailyCandle,
  MinuteCandle,
  StockPriceResponse,
} from '@/lib/api';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';
import { getStockName } from '@/lib/stockMap';

type Period = 'D' | 'W' | 'M' | 'Y';

const PERIOD_LABELS: Record<Period, string> = {
  D: '일봉',
  W: '주봉',
  M: '월봉',
  Y: '연봉',
};

const initialState = {
  priceInfo: null as StockPriceResponse | null,
  candles: [] as DailyCandle[],
  minuteCandles: [] as MinuteCandle[],
  loading: false,
  error: null as string | null,
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_PRICE_SUCCESS'; payload: StockPriceResponse }
  | { type: 'FETCH_CANDLES_SUCCESS'; payload: DailyCandle[] }
  | { type: 'FETCH_MINUTE_SUCCESS'; payload: MinuteCandle[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean };

function reducer(state: typeof initialState, action: Action): typeof initialState {
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

  const chartData = viewMode === 'daily'
    ? candles.map((c) => ({
        time: c.date.slice(0, 4) + '-' + c.date.slice(4, 6) + '-' + c.date.slice(6, 8),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    : minuteCandles.map((c) => ({
        time: c.time.includes('T') ? c.time : c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

  const isUp = (priceInfo?.change ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-hairline-soft h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-steel hover:text-ink transition-colors rounded-full hover:bg-surface-soft"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">{stockName}</h1>
            <p className="text-xs text-steel">{stockCode}</p>
            {priceInfo && (
              <p className="text-xs text-steel">
                {isUp ? '+' : ''}
                {priceInfo.change.toLocaleString()} ({isUp ? '+' : ''}
                {priceInfo.changeRate}%)
              </p>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Price Hero */}
        <section className="bg-white border border-hairline-soft rounded-[24px] p-8 mb-8 shadow-sm">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-steel mb-1">현재가</p>
              <div className="flex items-baseline gap-3">
                <p className={`text-4xl font-bold ${isUp ? 'text-market-up' : 'text-market-down'}`}>
                  {priceInfo ? priceInfo.price.toLocaleString() : '—'}
                </p>
                <span className="text-lg">원</span>
              </div>
              {priceInfo && (
                <div className={`flex items-center gap-1 mt-2 font-bold ${isUp ? 'text-market-up' : 'text-market-down'}`}>
                  {isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  <span>
                    {isUp ? '+' : ''}
                    {priceInfo.change.toLocaleString()} ({isUp ? '+' : ''}
                    {priceInfo.changeRate}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Chart Section */}
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
                data={chartData}
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
