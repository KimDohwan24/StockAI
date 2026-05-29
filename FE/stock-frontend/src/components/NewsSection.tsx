'use client';

import { StockNewsItem } from '@/lib/api';
import { ExternalLink, Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface NewsSectionProps {
  news: StockNewsItem[];
  isLoading?: boolean;
}

export default function NewsSection({ news, isLoading }: NewsSectionProps) {
  // 날짜 포맷팅 함수 (RFC 822 또는 일반 날짜 문자열 처리)
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  const getSentimentBadge = (sentiment: StockNewsItem['sentiment'], score: number, confidence: number) => {
    const confPct = Math.round(confidence * 100);
    
    switch (sentiment) {
      case 'positive':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>긍정 ({confPct}%)</span>
          </span>
        );
      case 'negative':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/30">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>부정 ({confPct}%)</span>
          </span>
        );
      case 'neutral':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            <Minus className="w-3.5 h-3.5" />
            <span>중립 ({confPct}%)</span>
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 bg-surface-soft rounded-lg w-48 animate-pulse" />
        <div className="h-4 bg-surface-soft rounded-lg w-72 animate-pulse mb-6" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-hairline-soft rounded-[20px] p-6 space-y-3 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-surface-soft rounded w-20 animate-pulse" />
                <div className="h-6 bg-surface-soft rounded-full w-24 animate-pulse" />
              </div>
              <div className="h-6 bg-surface-soft rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-surface-soft rounded w-5/6 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-ink">실시간 AI 뉴스 감성 분석</h3>
        <p className="text-sm text-steel mt-1">AI가 실시간 뉴스를 수집하고 시장 지표와 감성을 정밀 분석합니다.</p>
      </div>

      {!news || news.length === 0 ? (
        <div className="bg-white border border-hairline-soft rounded-[20px] p-12 text-center text-steel shadow-sm">
          <p className="text-sm font-medium">현재 분석된 실시간 뉴스가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map((item, index) => (
            <div
              key={index}
              className="bg-white border border-hairline-soft hover:border-meta-blue/20 rounded-[20px] p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-xs text-steel">
                  <span className="font-semibold text-slate">{item.source || '뉴스'}</span>
                  <span className="w-1 h-1 rounded-full bg-hairline-soft" />
                  <span>{formatDate(item.pubDate)}</span>
                </div>
                <div>
                  {getSentimentBadge(item.sentiment, item.sentimentScore, item.confidence)}
                </div>
              </div>

              <h4 className="font-bold text-base text-ink mb-2 group-hover:text-meta-blue transition-colors line-clamp-1">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5"
                  dangerouslySetInnerHTML={{ __html: item.title }}
                />
              </h4>

              {/* 제목 클릭 링크와 아이콘 제공 */}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-hairline-soft/40">
                <span className="text-xs text-steel">AI 감성 지수: {item.sentimentScore > 0 ? '+' : ''}{item.sentimentScore.toFixed(2)}</span>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-meta-blue hover:text-meta-blue-deep font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  기사 원문 보기
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
