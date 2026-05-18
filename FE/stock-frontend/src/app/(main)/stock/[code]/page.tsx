'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import StockChart, { CandlePoint } from '@/components/StockChart';
import {
  getStockPrice,
  getDailyCandles,
  getMinuteCandles,
  getHoldings,
  buyOrder,
  sellOrder,
  MappedStockPrice,
  MappedDailyCandle,
  MappedMinuteCandle,
  OrderResult,
} from '@/lib/api';
import {
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

import { useAuth } from '@/lib/auth';
import { useVisibility } from '@/hooks/useVisibility';
import { useStockPriceStream } from '@/hooks/useStockPriceStream';

type Period = 'D' | 'W' | 'M' | 'Y';

const PERIOD_LABELS: Record<Period, string> = {
  D: '일봉',
  W: '주봉',
  M: '월봉',
  Y: '연봉',
};

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

function priceColorClass(info: MappedStockPrice | null): string {
  if (!info) return 'text-ink';
  if (info.isLimitUp || info.isUp) return 'text-market-up';
  if (info.isLimitDown || info.isDown) return 'text-market-down';
  return 'text-market-neutral';
}

function PriceIcon({ info }: { info: MappedStockPrice | null }) {
  if (!info || info.sign === '3') return <Minus className="w-5 h-5" />;
  if (info.isUp) return <TrendingUp className="w-5 h-5" />;
  return <TrendingDown className="w-5 h-5" />;
}

function usePriceFlash(price: number | undefined) {
  const [flashKey, setFlashKey] = useState(0);
  const [flashClass, setFlashClass] = useState('');
  const prevPriceRef = useRef(price);

  useEffect(() => {
    if (price !== undefined && prevPriceRef.current !== undefined && price !== prevPriceRef.current) {
      const isUp = price > prevPriceRef.current;
      setFlashClass(isUp ? 'animate-flash-up' : 'animate-flash-down');
      setFlashKey(k => k + 1);
      
      const timer = setTimeout(() => {
        setFlashClass('');
      }, 600);
      
      prevPriceRef.current = price;
      return () => clearTimeout(timer);
    }
    if (price !== undefined) {
      prevPriceRef.current = price;
    }
  }, [price]);

  return { flashKey, flashClass };
}

function TradePanel({
  stockCode,
  priceInfo,
  isAuthenticated,
}: {
  stockCode: string;
  priceInfo: MappedStockPrice | null;
  isAuthenticated: boolean;
}) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMsg, setOrderMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentPrice = priceInfo?.price ?? 0;
  const totalAmount = currentPrice * quantity;
  const { flashKey, flashClass } = usePriceFlash(currentPrice);

  const { data: holdings } = useSWR(
    isAuthenticated ? 'dashboard-holdings' : null,
    () => getHoldings(),
    { dedupingInterval: 30000, revalidateOnFocus: false }
  );
  const userHolding = useMemo(
    () => holdings?.find((h) => h.stockCode === stockCode) ?? null,
    [holdings, stockCode]
  );

  const handleOrder = async () => {
    if (quantity <= 0) return;
    setOrderLoading(true);
    setOrderMsg(null);
    try {
      let result: OrderResult;
      if (side === 'buy') {
        result = await buyOrder(stockCode, quantity, priceInfo?.price ?? 0);
      } else {
        result = await sellOrder(stockCode, quantity, priceInfo?.price ?? 0);
      }
      setOrderMsg({
        type: 'success',
        text: `${result.side === 'BUY' ? '매수' : '매도'} 완료: ${result.stockName} ${result.quantity}주 @ ${fmt(result.price)}원`,
      });
      mutate('dashboard-holdings');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '주문에 실패했습니다.';
      setOrderMsg({ type: 'error', text: msg });
    } finally {
      setOrderLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white border border-hairline-soft rounded-[24px] p-6 shadow-sm">
        <h3 className="font-bold text-ink text-lg mb-3">모의 투자</h3>
        <p className="text-slate text-sm mb-2">회원가입하고 가상 자본으로 자유롭게 매수·매도를 체험해보세요.</p>
        <p className="text-steel text-xs mb-4">초기 자본은 직접 설정 가능 (1백만원 ~ 100억원)</p>
        <Link href="/signup" className="meta-button-buy inline-block text-center w-full mb-2">
          회원가입하고 시작하기
        </Link>
        <Link href="/login" className="block text-center text-sm text-meta-blue font-bold hover:underline py-2">
          이미 계정이 있으신가요? 로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-hairline-soft rounded-[24px] p-6 shadow-sm space-y-5">
      <h3 className="font-bold text-ink text-lg">주문</h3>

      <div className="flex gap-2">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2.5 rounded-meta-full text-sm font-bold transition-colors ${
            side === 'buy'
              ? 'bg-market-up text-white'
              : 'bg-surface-soft text-steel hover:text-ink'
          }`}
        >
          매수
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2.5 rounded-meta-full text-sm font-bold transition-colors ${
            side === 'sell'
              ? 'bg-meta-blue text-white'
              : 'bg-surface-soft text-steel hover:text-ink'
          }`}
        >
          매도
        </button>
      </div>

      {userHolding && (
        <div className="bg-surface-soft rounded-meta-xl px-4 py-3 text-sm">
          <span className="text-steel">보유: </span>
          <span className="font-bold text-ink">{userHolding.quantity}주</span>
          <span className="text-steel ml-2">평균단가: </span>
          <span className="font-bold text-ink">{fmt(userHolding.avgPrice)}원</span>
        </div>
      )}

      <div>
        <label className="block text-xs text-steel mb-1.5">수량</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-meta-xl bg-surface-soft text-ink font-bold hover:bg-hairline-soft transition-colors"
          >
            -
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            className="flex-1 text-center px-4 py-2.5 border border-hairline-soft rounded-meta-xl text-sm font-bold focus:outline-none focus:border-meta-blue transition-colors"
          />
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 rounded-meta-xl bg-surface-soft text-ink font-bold hover:bg-hairline-soft transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <div className="bg-surface-soft rounded-meta-xl px-4 py-3">
        <div className="flex justify-between text-sm">
          <span className="text-steel">체결가 (현재가)</span>
          <span key={flashKey} className={`font-bold text-ink px-1 rounded transition-colors ${flashClass}`}>{fmt(currentPrice)}원</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-steel">주문 금액</span>
          <span className="font-bold text-ink">{fmt(totalAmount)}원</span>
        </div>
      </div>

      {orderMsg && (
        <div
          className={`text-sm rounded-meta-xl px-4 py-3 ${
            orderMsg.type === 'success'
              ? 'bg-market-up/5 text-market-up border border-market-up/20'
              : 'bg-market-down/5 text-market-down border border-market-down/20'
          }`}
        >
          {orderMsg.text}
        </div>
      )}

      <button
        onClick={handleOrder}
        disabled={orderLoading || quantity <= 0 || currentPrice === 0}
        className={`w-full py-3 rounded-meta-full font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          side === 'buy'
            ? 'bg-market-up text-white active:bg-red-700'
            : 'bg-meta-blue text-white active:bg-meta-blue-deep'
        }`}
      >
        {orderLoading
          ? '주문 중...'
          : `${side === 'buy' ? '매수' : '매도'} ${fmt(totalAmount)}원`}
      </button>
    </div>
  );
}

export default function StockDetailPage() {
  const params = useParams();
  const { isAuthenticated } = useAuth();
  const stockCode = (params.code as string) || '';
  const isVisible = useVisibility();

  const { data: swrPrice } = useSWR<MappedStockPrice | null>(
    stockCode ? `detail-price-${stockCode}` : null,
    () => getStockPrice(stockCode),
    { dedupingInterval: 30000, revalidateOnFocus: false, refreshInterval: 30000 }
  );

  const { price: wsPrice } = useStockPriceStream(stockCode, swrPrice ?? null);

  const priceInfo = wsPrice ?? swrPrice ?? null;
  const stockName = priceInfo?.stockName || stockCode;

  const { flashKey, flashClass } = usePriceFlash(priceInfo?.price);

  const [period, setPeriod] = useState<Period>('D');
  const [viewMode, setViewMode] = useState<'daily' | 'minute'>('daily');

  const dateRange = useMemo(() => {
    const today = new Date();
    const endDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    const start = new Date(today);
    switch (period) {
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
  }, [period]);

  const { data: dailyCandles, isLoading: dailyLoading, error: dailyError } = useSWR<MappedDailyCandle[]>(
    stockCode && viewMode === 'daily' ? ['daily-candles', stockCode, period, dateRange.startDate, dateRange.endDate] : null,
    () => getDailyCandles({ stockCode, period, startDate: dateRange.startDate, endDate: dateRange.endDate }),
    { keepPreviousData: true, refreshInterval: 60000 }
  );

  const { data: minuteCandles, isLoading: minuteLoading, error: minuteError } = useSWR<MappedMinuteCandle[]>(
    stockCode && viewMode === 'minute' ? ['minute-candles', stockCode] : null,
    () => getMinuteCandles(stockCode),
    { keepPreviousData: true, refreshInterval: 15000 }
  );

  const candles = viewMode === 'daily' ? (dailyCandles ?? []) : [];
  const minuteData = viewMode === 'minute' ? (minuteCandles ?? []) : [];
  const loading = (viewMode === 'daily' ? dailyLoading : minuteLoading) ?? false;
  const error = viewMode === 'daily' ? dailyError?.message ?? null : minuteError?.message ?? null;

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
      : minuteData.map((c) => ({
          time: new Date(c.time).getTime() / 1000,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

  const colorClass = priceColorClass(priceInfo);

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
                  <div key={flashKey} className={`flex items-baseline gap-2 rounded-lg px-2 py-1 -mx-2 transition-colors ${flashClass}`}>
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

            {/* Detail Grid */}
            {priceInfo && (
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard icon={<Landmark className="w-4 h-4" />} label="기준가 / 전일종가" value={fmt(priceInfo.basePrice ?? 0)} sub="전일대비 기준" />
                <InfoCard icon={<ArrowUpRight className="w-4 h-4 text-market-up" />} label="상한가" value={fmt(priceInfo.upperLimit ?? 0)} highlight="up" />
                <InfoCard icon={<ArrowDownRight className="w-4 h-4 text-market-down" />} label="하한가" value={fmt(priceInfo.lowerLimit ?? 0)} highlight="down" />
                <InfoCard icon={<BarChart3 className="w-4 h-4" />} label="누적거래대금" value={`${fmt(priceInfo.volumeValue ?? 0)} 원`} sub="당일" />
                <InfoCard icon={<Hash className="w-4 h-4" />} label="PER / PBR" value={`${(priceInfo.per ?? 0).toFixed(2)} / ${(priceInfo.pbr ?? 0).toFixed(2)}`} />
                <InfoCard icon={<Hash className="w-4 h-4" />} label="EPS / BPS" value={`${fmt(priceInfo.eps ?? 0)} / ${fmt(priceInfo.bps ?? 0)}`} />
                <InfoCard icon={<TrendingUp className="w-4 h-4 text-market-up" />} label="52주 최고" value={fmt(priceInfo.w52High ?? 0)} highlight="up" />
                <InfoCard icon={<TrendingDown className="w-4 h-4 text-market-down" />} label="52주 최저" value={fmt(priceInfo.w52Low ?? 0)} highlight="down" />
                <InfoCard icon={<Landmark className="w-4 h-4" />} label="시가총액" value={`${fmt(priceInfo.marketCap ?? 0)} 억원`} sub="HTS 기준" className="md:col-span-2 lg:col-span-4" />
              </section>
            )}

            {/* Chart Section */}
            <section className="bg-white border border-hairline-soft rounded-[24px] p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
                    viewMode === 'daily' ? 'bg-meta-blue text-white' : 'bg-surface-soft text-steel hover:text-ink'
                  }`}
                >
                  <Calendar className="w-4 h-4" /> 일봉+
                </button>
                <button
                  onClick={() => setViewMode('minute')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
                    viewMode === 'minute' ? 'bg-meta-blue text-white' : 'bg-surface-soft text-steel hover:text-ink'
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
                          period === p ? 'bg-meta-blue text-white' : 'bg-surface-soft text-steel hover:text-ink'
                        }`}
                      >
                        {PERIOD_LABELS[p]}
                      </button>
                    ))}
                  </>
                )}
              </div>

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
                  <StockChart data={chartData as CandlePoint[]} type="candlestick" height={400} realtimePrice={priceInfo?.price} />
                )}
                {!loading && !error && chartData.length === 0 && (
                  <div className="w-full h-full flex items-center justify-center text-steel">
                    데이터가 없습니다.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Trade Panel Sidebar */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <TradePanel
              stockCode={stockCode}
              priceInfo={priceInfo}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>
      </main>
    </div>
  );
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