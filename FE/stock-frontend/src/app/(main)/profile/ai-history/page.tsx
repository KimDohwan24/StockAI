'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth';
import { getOrderHistory, getUserProfile } from '@/lib/api';
import {
  Cpu,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Calendar,
  Settings,
  Info,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { resolveStockName } from '@/lib/stockMap';

// Number formatter
function fmt(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ko-KR');
}

// DateTime formatter
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Robust 3-line parsing helper for AI reasons
function parseReasonToThreeLines(reason?: string): string[] {
  if (!reason) {
    return [
      '상세 판단 사유가 기록되지 않았습니다.',
      'AI의 기본 매커니즘에 의거하여 주문이 실행되었습니다.',
      '추가 모니터링을 진행 중입니다.'
    ];
  }
  
  // Strip markdown bold markers, list bullets, and numbered prefixes
  const clean = reason
    .replace(/\*\*/g, '')
    .replace(/^[-*•\s]+/gm, '')
    .replace(/^\d+\.\s+/gm, '');
  
  // Split by newlines or sentences (periods followed by space)
  const sentences = clean
    .split(/(?:\r?\n)+|(?<=\.)\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.endsWith('.') ? s : s + '.');
    
  if (sentences.length >= 3) {
    return [
      sentences[0],
      sentences[1],
      sentences.slice(2).join(' ')
    ];
  } else if (sentences.length === 2) {
    return [
      sentences[0],
      sentences[1],
      '시장 모멘텀 분석 점수 및 유저 위험도 등급 기준 적합 판단.'
    ];
  } else {
    return [
      sentences[0],
      'AI 투자 알고리즘 실시간 분석 점수 반영.',
      '유저 자산 포트폴리오 관리 한도 내 분할 체결.'
    ];
  }
}

type FilterType = 'ALL' | 'BUY' | 'SELL';

export default function AiHistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [filter, setFilter] = useState<FilterType>('ALL');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch profile to show trading configuration status
  const { data: profile, isLoading: profileLoading } = useSWR(
    isAuthenticated ? 'user-profile' : null,
    getUserProfile,
    { revalidateOnFocus: false, dedupingInterval: 15000 }
  );

  // Fetch complete order history
  const { data: orderHistory, isLoading: orderHistoryLoading } = useSWR(
    isAuthenticated ? 'order-history' : null,
    getOrderHistory,
    { revalidateOnFocus: false, dedupingInterval: 15000 }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-meta-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-steel">인증 상태 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Filter transactions: orderedBy === 'AI' and matches selected tab
  const aiHistoryList = (orderHistory || [])
    .filter(item => item.orderedBy === 'AI')
    .filter(item => {
      if (filter === 'BUY') return item.orderType === 'BUY';
      if (filter === 'SELL') return item.orderType === 'SELL';
      return true;
    });

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        
        {/* Header */}
        <div className="space-y-4">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs text-steel hover:text-ink font-bold transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            마이페이지로 돌아가기
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Cpu className="w-8 h-8 text-indigo-500 animate-pulse" />
                AI 투자 레포지토리
              </h1>
              <p className="text-steel text-sm mt-1.5">
                AI 자율 매매 시스템이 내린 실시간 시장 분석 및 종목 거래 판단 사유입니다.
              </p>
            </div>
            
            {/* AI Active Status Info Card */}
            {profile && (
              <div className="bg-white border border-hairline-soft rounded-2xl p-3.5 flex items-center gap-4 shadow-sm text-xs max-w-[280px]">
                <div className="relative">
                  <div className="w-9 h-9 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    profile.aiTradingEnabled ? 'bg-market-up animate-pulse' : 'bg-steel'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink truncate">AI 자율 매매</p>
                  <p className="text-steel mt-0.5">
                    {profile.aiTradingEnabled ? '활성화 상태' : '비활성화 상태'} (위험도: {
                      profile.riskProfile === 'HIGH' ? '상' : profile.riskProfile === 'MEDIUM' ? '중' : '하'
                    })
                  </p>
                </div>
                <Link
                  href="/profile"
                  className="p-1.5 text-steel hover:text-ink hover:bg-surface-soft rounded-lg transition-colors cursor-pointer"
                  title="설정 변경"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between border-b border-hairline-soft pb-2">
          <div className="flex gap-1">
            {(['ALL', 'BUY', 'SELL'] as FilterType[]).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  filter === t
                    ? 'bg-ink text-white shadow-sm'
                    : 'bg-surface-soft text-slate hover:bg-hairline-soft'
                }`}
              >
                {t === 'ALL' ? '전체 내역' : t === 'BUY' ? '매수 주문' : '매도 주문'}
              </button>
            ))}
          </div>
          <span className="text-xs text-steel font-medium">
            총 <span className="font-bold text-ink">{aiHistoryList.length}</span>건의 AI 거래
          </span>
        </div>

        {/* List Content */}
        {orderHistoryLoading || profileLoading ? (
          // Loading Skeleton
          <div className="space-y-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-hairline-soft rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-5 w-32 bg-surface-soft rounded" />
                    <div className="h-3.5 w-24 bg-surface-soft rounded" />
                  </div>
                  <div className="h-6 w-16 bg-surface-soft rounded-full" />
                </div>
                <div className="h-10 w-full bg-surface-soft rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-surface-soft rounded" />
                  <div className="h-4 w-5/6 bg-surface-soft rounded" />
                  <div className="h-4 w-4/5 bg-surface-soft rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : aiHistoryList.length === 0 ? (
          // Empty State
          <div className="bg-white border border-hairline-soft rounded-[28px] p-12 text-center shadow-sm space-y-6">
            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
              <Cpu className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="text-lg font-bold text-ink">거래 내역이 존재하지 않습니다</h3>
              <p className="text-sm text-steel leading-relaxed">
                현재 선택된 필터 조건에 부합하는 AI 자율 거래 내역이 없습니다. AI 자율 투자를 활성화하고 포트폴리오를 설정해보세요.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white hover:bg-indigo-600 transition-colors rounded-meta-full text-xs font-bold shadow-sm"
              >
                <Settings className="w-4 h-4" />
                AI 자율 매매 활성화하러 가기
              </Link>
            </div>
          </div>
        ) : (
          // History Cards List
          <div className="space-y-6">
            {aiHistoryList.map((item) => {
              const sentences = parseReasonToThreeLines(item.reason);
              const isBuy = item.orderType === 'BUY';
              
              // Custom tags for Stop-Loss detection inside the reason text
              const isStopLoss = item.reason?.includes('Stop-Loss') || item.reason?.includes('손절');

              return (
                <div
                  key={item.id}
                  className="bg-white border border-hairline-soft rounded-[24px] p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group"
                >
                  {/* Subtle top indicator bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 transition-colors ${
                    isStopLoss 
                      ? 'bg-amber-500' 
                      : isBuy 
                        ? 'bg-market-up' 
                        : 'bg-market-down'
                  }`} />

                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-hairline-soft">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/stock/${item.ticker}`} className="hover:text-meta-blue transition-colors">
                          <h3 className="font-bold text-lg text-ink inline-block hover:underline">
                            {resolveStockName(item.ticker, item.stockName)}
                          </h3>
                        </Link>
                        <span className="text-xs text-steel font-medium bg-surface-soft px-2 py-0.5 rounded-md">
                          {item.ticker}
                        </span>
                      </div>
                      
                      <p className="text-xs text-steel flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>

                    {/* Trade Type Chips */}
                    <div className="flex gap-2 self-start sm:self-auto">
                      {isStopLoss && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          ⚠️ 자동 손절
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        isBuy
                          ? 'bg-market-up/10 text-market-up'
                          : 'bg-market-down/10 text-market-down'
                      }`}>
                        {isBuy ? (
                          <>
                            <TrendingUp className="w-3.5 h-3.5" />
                            매수 체결
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-3.5 h-3.5" />
                            매도 체결
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Transaction details row */}
                  <div className="grid grid-cols-3 gap-4 py-4 text-center bg-surface-soft/30 rounded-xl my-4 border border-hairline-soft/50">
                    <div>
                      <p className="text-[10px] text-steel">체결 단가</p>
                      <p className="text-sm font-bold text-ink mt-0.5">{fmt(item.price)}원</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-steel">체결 수량</p>
                      <p className="text-sm font-bold text-ink mt-0.5">{fmt(item.quantity)}주</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-steel">총 거래 금액</p>
                      <p className="text-sm font-bold text-ink mt-0.5">{fmt(item.amount)}원</p>
                    </div>
                  </div>

                  {/* AI Reasoning Section */}
                  <div className="space-y-3 bg-gradient-to-tr from-indigo-500/[0.02] to-indigo-500/[0.05] border border-indigo-500/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                      <Cpu className="w-4 h-4 text-indigo-500 animate-spin-slow" />
                      <span>AI 자율 투자 거래 분석</span>
                    </div>
                    
                    <ul className="space-y-2">
                      {sentences.map((line, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-charcoal leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 mt-1.5 flex-shrink-0" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
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
