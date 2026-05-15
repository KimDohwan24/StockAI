'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Bell, User, ShoppingCart, TrendingUp, TrendingDown, ArrowUpRight, Star } from 'lucide-react';
import StockChart from '@/components/StockChart';
import { getStockCode, searchStockNames } from '@/lib/stockMap';

const MOCK_CHART_DATA = [
  { time: '2024-01-01', value: 100 },
  { time: '2024-01-02', value: 105 },
  { time: '2024-01-03', value: 102 },
  { time: '2024-01-04', value: 110 },
  { time: '2024-01-05', value: 108 },
  { time: '2024-01-06', value: 115 },
  { time: '2024-01-07', value: 125 },
];

const RECOMMENDED_STOCKS = [
  { name: '삼성전자', ticker: '005930', price: '78,500', change: '+2.4%', up: true },
  { name: 'SK하이닉스', ticker: '000660', price: '185,200', change: '+3.1%', up: true },
  { name: 'NAVER', ticker: '035420', price: '192,400', change: '-0.8%', up: false },
  { name: '카카오', ticker: '035720', price: '48,200', change: '+1.2%', up: true },
];

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; code: string }[]>([]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length >= 1) {
      setSuggestions(searchStockNames(value));
    } else {
      setSuggestions([]);
    }
  };

  const navigateToStock = (code: string) => {
    window.location.href = `/stock/${code}`;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const code = getStockCode(trimmed);
    if (code) {
      navigateToStock(code);
    } else {
      // 검색어에 해당하는 종목이 없으면 숫자(코드)인지 확인 후 그대로 이동
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
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 bg-surface-soft px-4 py-2 rounded-meta-full">
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
        {/* Recommendation Hero */}
        <section className="mb-16">
          <div className="bg-white border border-hairline-soft rounded-[32px] overflow-hidden shadow-[0_20px_40px_rgba(0,100,224,0.08)]">
            <div className="grid lg:grid-cols-[1fr_400px] items-center">
              <div className="p-12">
                <div className="flex items-center gap-2 mb-6">
                  <span className="bg-market-up text-white text-[10px] font-bold px-2 py-1 rounded-meta-full uppercase tracking-wider">Today&apos;s Pick</span>
                  <span className="text-steel text-sm">AI 가 분석한 오늘의 강력 추천주</span>
                </div>
                <h2 className="text-5xl font-bold mb-4 leading-tight">삼성전자 (005930)</h2>
                <p className="text-xl text-slate mb-8 max-w-lg">
                  반도체 사이클 회복과 AI 수요 증가로 인해 2분기 실적 개선이 기대됩니다. 현재 구간에서 강력한 매수 신호가 감지되었습니다.
                </p>
                <div className="flex gap-4">
                  <Link href="/stock/005930" className="meta-button-buy inline-block text-center">
                    지금 매수하기
                  </Link>
                  <Link href="/stock/005930" className="meta-button-secondary inline-block text-center">
                    상세 분석 보기
                  </Link>
                </div>
              </div>

              <div className="bg-surface-soft p-8 h-full flex flex-col justify-center border-l border-hairline-soft">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-sm text-steel mb-1">현재가</p>
                    <p className="text-3xl font-bold text-market-up">78,500 <span className="text-lg">▲ 1,800</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-steel mb-1">매칭 점수</p>
                    <p className="text-3xl font-bold text-meta-blue">98%</p>
                  </div>
                </div>
                <div className="h-[200px] w-full bg-white rounded-meta-xxl p-4 border border-hairline-soft">
                  <StockChart data={MOCK_CHART_DATA} color="#e41e3f" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stock Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold">인기 추천 종목</h3>
            <button className="text-meta-blue font-bold text-sm hover:underline">전체보기</button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {RECOMMENDED_STOCKS.map((stock) => (
              <Link href={`/stock/${stock.ticker}`} key={stock.ticker} className="meta-card p-6 hover:shadow-lg transition-shadow cursor-pointer group block">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-steel mb-1">{stock.ticker}</p>
                    <h4 className="font-bold text-lg group-hover:text-meta-blue transition-colors">{stock.name}</h4>
                  </div>
                  <button className="text-hairline hover:text-meta-blue transition-colors">
                    <Star className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold">{stock.price}</p>
                    <div className={`flex items-center gap-1 text-sm font-bold ${stock.up ? 'text-market-up' : 'text-market-down'}`}>
                      {stock.up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {stock.change}
                    </div>
                  </div>
                  <div className="w-16 h-10">
                    <StockChart
                      data={MOCK_CHART_DATA.slice(-4)}
                      color={stock.up ? '#e41e3f' : '#0064e0'}
                    />
                  </div>
                </div>
              </Link>
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
