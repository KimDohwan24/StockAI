'use client';

import { getAiNewsList, StockNewsItem } from '@/lib/api';
import {
  AlertCircle,
  ArrowUpRight,
  Globe,
  Minus,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';

export default function AiNewsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [marketFilter, setMarketFilter] = useState<'all' | 'domestic' | 'overseas'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');

  const { data: newsList, error, isLoading, mutate } = useSWR<StockNewsItem[]>(
    'ai-news-list',
    () => getAiNewsList(),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  const isOverseas = (code: string) => {
    return /^[A-Za-z]+$/.test(code);
  };

  // Custom sentiment badges mapped strictly from FE/DESIGN.md tokens
  const getSentimentBadge = (sentiment: StockNewsItem['sentiment'], score: number) => {
    switch (sentiment) {
      case 'positive':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-meta-full text-xs font-bold bg-[#31a24c]/10 text-[#31a24c] border border-[#31a24c]/20 shadow-sm -tracking-[0.14px]">
            <TrendingUp className="w-3.5 h-3.5" />
            호재 {Math.round(score * 100)}%
          </span>
        );
      case 'negative':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-meta-full text-xs font-bold bg-market-up/10 text-market-up border border-market-up/20 shadow-sm -tracking-[0.14px]">
            <TrendingDown className="w-3.5 h-3.5" />
            악재 {Math.round(score * 100)}%
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-meta-full text-xs font-bold bg-steel/10 text-steel border border-steel/20 shadow-sm -tracking-[0.14px]">
            <Minus className="w-3.5 h-3.5" />
            중립 {Math.round(score * 100)}%
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const filteredNews = useMemo(() => {
    if (!newsList) return [];

    return newsList.filter((item) => {
      // 1. Search filter
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.stockName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.stockCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.source.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Market filter
      let matchesMarket = true;
      if (item.stockCode) {
        const overseas = isOverseas(item.stockCode);
        if (marketFilter === 'domestic') matchesMarket = !overseas;
        if (marketFilter === 'overseas') matchesMarket = overseas;
      }

      // 3. Sentiment filter
      const matchesSentiment =
        sentimentFilter === 'all' || item.sentiment === sentimentFilter;

      return matchesSearch && matchesMarket && matchesSentiment;
    });
  }, [newsList, searchTerm, marketFilter, sentimentFilter]);

  return (
    <div className="min-h-screen bg-canvas text-ink pb-24 -tracking-[0.16px]">
      {/* Stark White Canvas Header - Photography & Variable Font-first Editorial Look */}
      <header className="border-b border-hairline-soft bg-canvas py-12 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-steel mb-8 -tracking-[0.14px]">
            <Link href="/" className="hover:text-ink transition-colors">홈</Link>
            <span className="text-hairline select-none">›</span>
            <span className="text-ink font-bold">AI 뉴스 모니터링 룸</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-meta-blue/10 border border-meta-blue/20 rounded-meta-full text-xs font-bold text-meta-blue -tracking-[0.14px]">
                <Sparkles className="w-3.5 h-3.5 text-meta-blue animate-pulse" />
                Real-Time AI News Digest
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-ink leading-tight -tracking-[0.6px] font-sans">
                AI 뉴스 모니터링 룸
              </h1>
              <p className="text-lg text-slate leading-relaxed font-normal">
                인공지능이 16개 핵심 국내 및 해외 주식 시장의 최신 흐름을 실시간으로 크롤링하여 분석합니다.
                정교하게 가공된 뉴스 분석 피드를 통해 호재 및 악재 위험을 신속하게 모니터링하세요.
              </p>
            </div>
            
            <button
              onClick={() => mutate()}
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-canvas hover:bg-surface-soft border-2 border-hairline text-ink rounded-meta-full text-sm font-bold transition-all active:bg-hairline cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              피드 새로고침
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-6 mt-12">
        {/* Advanced Filters Panel - Stark Layout */}
        <div className="bg-canvas border border-hairline-soft rounded-meta-xl p-6 shadow-sm mb-10 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input - text-input spec (height 44px, rounded 8px) */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-3 w-5 h-5 text-steel pointer-events-none" />
              <input
                type="text"
                placeholder="뉴스 제목, 종목명 또는 코드를 입력하세요..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 h-11 bg-canvas border border-hairline rounded-meta-xl text-sm text-ink placeholder-steel focus:outline-none focus:border-meta-blue focus:ring-2 focus:ring-meta-blue/20 transition-all"
              />
            </div>

            {/* Market Tabs - button-pill-tab spec (Inactive border-hairline, Active bg-ink text-white) */}
            <div className="flex gap-2 w-full md:w-auto p-1 bg-surface-soft rounded-meta-full">
              {(['all', 'domestic', 'overseas'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarketFilter(m)}
                  className={`flex-1 md:flex-none px-6 py-2.5 rounded-meta-full text-xs font-bold transition-all -tracking-[0.14px] cursor-pointer ${
                    marketFilter === m
                      ? 'bg-ink text-white shadow-sm'
                      : 'bg-transparent text-steel hover:text-ink'
                  }`}
                >
                  {m === 'all' && '전체 시장'}
                  {m === 'domestic' && '국내 주식'}
                  {m === 'overseas' && '해외 주식'}
                </button>
              ))}
            </div>
          </div>

          {/* Sentiment Filter Tabs - Active & Inactive button-pill-tab styles */}
          <div className="flex flex-wrap gap-2 items-center border-t border-hairline-soft pt-5">
            <span className="text-xs font-bold text-steel mr-2">감성 분석 분류 :</span>
            {(['all', 'positive', 'neutral', 'negative'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSentimentFilter(s)}
                className={`px-5 py-2 rounded-meta-full text-xs font-bold border transition-all -tracking-[0.14px] cursor-pointer ${
                  sentimentFilter === s
                    ? 'bg-ink text-white border-ink'
                    : s === 'all'
                    ? 'bg-canvas text-steel border-hairline hover:border-ink hover:text-ink'
                    : s === 'positive'
                    ? 'bg-canvas text-emerald-600 border-[#31a24c]/30 hover:bg-[#31a24c]/5'
                    : s === 'negative'
                    ? 'bg-canvas text-market-up border-market-up/30 hover:bg-market-up/5'
                    : 'bg-canvas text-slate border-steel/30 hover:bg-steel/5'
                }`}
              >
                {s === 'all' && '전체 기사'}
                {s === 'positive' && '🔥 호재'}
                {s === 'neutral' && '⚖️ 중립'}
                {s === 'negative' && '⚠️ 악재'}
              </button>
            ))}
          </div>
        </div>

        {/* Loading States - card-product-feature skeleton */}
        {isLoading && (
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-canvas border border-hairline-soft rounded-meta-xxxl p-8 space-y-6 animate-pulse shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-surface-soft rounded-meta-full w-32" />
                  <div className="h-6 bg-surface-soft rounded-meta-full w-24" />
                </div>
                <div className="h-7 bg-surface-soft rounded w-5/6" />
                <div className="h-4 bg-surface-soft rounded w-2/5 pt-2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-canvas border border-hairline-soft rounded-meta-xxxl p-12 text-center max-w-lg mx-auto shadow-sm">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-market-up animate-pulse" />
            <h3 className="text-xl font-bold mb-2">데이터 로드 실패</h3>
            <p className="text-sm text-steel mb-8">
              AI 뉴스 모니터링 서버로부터 뉴스를 가져오는 도중 오류가 발생했습니다.
            </p>
            <button
              onClick={() => mutate()}
              className="px-8 py-3.5 bg-ink text-white rounded-meta-full text-sm font-bold hover:bg-charcoal transition-all active:bg-charcoal cursor-pointer"
            >
              다시 시도하기
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredNews.length === 0 && (
          <div className="bg-canvas border border-hairline-soft rounded-meta-xxxl py-20 px-8 text-center text-steel shadow-sm">
            <Newspaper className="w-16 h-16 mx-auto mb-5 text-steel/30" />
            <p className="font-extrabold text-xl text-ink mb-2">조건에 부합하는 뉴스가 없습니다</p>
            <p className="text-sm text-steel mb-8 max-w-sm mx-auto leading-relaxed">
              검색어나 필터 대상을 재조정하여 AI 실시간 모니터링 피드들을 탐색해 보세요.
            </p>
            {(searchTerm || marketFilter !== 'all' || sentimentFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setMarketFilter('all');
                  setSentimentFilter('all');
                }}
                className="px-6 py-3 bg-ink text-white rounded-meta-full text-xs font-bold hover:bg-charcoal transition-colors cursor-pointer"
              >
                필터 조건 초기화
              </button>
            )}
          </div>
        )}

        {/* News List - card-product-feature spec (rounded-meta-xxxl (32px), border hairline-soft, p-8, bg-canvas) */}
        {!isLoading && !error && filteredNews.length > 0 && (
          <div className="space-y-6">
            {filteredNews.map((item, index) => {
              const overseas = item.stockCode ? isOverseas(item.stockCode) : false;
              const linkHref = item.stockCode
                ? overseas
                  ? `/overseas-stocks/${item.stockCode}?exchange=NASDAQ`
                  : `/stock/${item.stockCode}`
                : null;

              return (
                <div
                  key={index}
                  className="bg-canvas border border-hairline-soft hover:border-hairline rounded-meta-xxxl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(0,100,224,0.04)] transition-all duration-300 group flex flex-col justify-between"
                >
                  <div>
                    {/* Header Row: Stock badge, Media name & AI analysis badge */}
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {linkHref && (
                          <Link
                            href={linkHref}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-meta-full text-xs font-bold border transition-all duration-200 -tracking-[0.14px] ${
                              overseas
                                ? 'bg-indigo-50/50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                                : 'bg-meta-blue/5 text-meta-blue border-meta-blue/10 hover:bg-meta-blue/10'
                            }`}
                          >
                            {overseas ? <Globe className="w-3.5 h-3.5 text-indigo-500" /> : null}
                            {item.stockName}
                            <span className="opacity-60 text-[10px] ml-0.5">{item.stockCode}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                          </Link>
                        )}
                        <span className="text-xs font-bold text-slate bg-surface-soft px-2.5 py-1 rounded-md -tracking-[0.14px]">
                          {item.source}
                        </span>
                      </div>

                      {/* AI Sentiment Analysis Badge */}
                      {getSentimentBadge(item.sentiment, item.sentimentScore)}
                    </div>

                    {/* Article Title */}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-bold text-xl md:text-2xl text-ink group-hover:text-meta-blue transition-colors leading-snug mb-4 max-w-4xl -tracking-[0.4px]"
                    >
                      {item.title}
                    </a>
                  </div>

                  {/* Metadata Row: Date & Confidence */}
                  <div className="flex justify-between items-center text-xs text-steel border-t border-hairline-soft/80 pt-4 mt-2">
                    <p className="-tracking-[0.14px]">{formatDate(item.pubDate)}</p>
                    <div className="flex items-center gap-1.5 bg-surface-soft px-2.5 py-1 rounded text-[10px] font-bold">
                      <span className="text-steel/80">AI 신뢰도</span>
                      <span className="text-ink">{Math.round(item.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
