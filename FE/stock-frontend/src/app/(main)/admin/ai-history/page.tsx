'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  Cpu,
  History,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Trash2,
  Download,
  ArrowLeft,
  Calendar,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { resolveStockName } from '@/lib/stockMap';

interface SnapshotRecord {
  profile: {
    id: number;
    email: string;
    name: string;
    riskProfile: 'HIGH' | 'MEDIUM' | 'LOW';
    aiTradingEnabled: boolean;
    mockOrderEnabled: boolean;
    aiTradingAllocationRatio: number;
    assignedModel: string;
  };
  portfolio: {
    initialBalance: number;
    cashBalance: number;
    totalAssetValue: number;
  } | null;
  holdings: Array<{
    stockCode: string;
    stockName: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    profitLoss: number;
    profitRate: number;
  }>;
  orderCount: number;
}

interface Snapshot {
  id: number;
  savedAt: string;
  summary: {
    totalAsset: number;
    totalInitial: number;
    activeCount: number;
    totalOrders: number;
  };
  records: SnapshotRecord[];
}

function fmt(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ko-KR');
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const getStockDetailUrl = (code: string) => {
  if (!code) return '#';
  const isDomestic = /^\d{6}$/.test(code);
  return isDomestic ? `/stock/${code}` : `/overseas-stocks/${code}?exchange=NAS`;
};

export default function AdminAiHistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [historyList, setHistoryList] = useState<Snapshot[]>([]);
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<number | null>(null);
  const [expandedAiEmail, setExpandedAiEmail] = useState<string | null>(null);

  // Redirect if not authenticated or not an admin
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'ADMIN') {
        router.push('/');
      }
    }
  }, [isAuthenticated, authLoading, user, router]);

  // Load history list from LocalStorage
  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      const raw = localStorage.getItem('ai_history_records');
      if (raw) {
        try {
          setHistoryList(JSON.parse(raw));
        } catch (e) {
          console.error('Failed to parse ai_history_records', e);
        }
      }
    }
  }, [isAuthenticated, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-meta-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-steel">인증 현황 조회 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  const handleDeleteEntry = (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm('선택한 AI 기록 스냅샷을 영구히 삭제하시겠습니까?')) {
      return;
    }
    const updated = historyList.filter((item) => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem('ai_history_records', JSON.stringify(updated));
    if (expandedSnapshotId === id) {
      setExpandedSnapshotId(null);
    }
  };

  const handleClearAll = () => {
    if (!window.confirm('저장된 모든 AI 기록 히스토리를 삭제하고 비우시겠습니까?\n(※ 실제 AI 구동 상태는 초기화되지 않으며, 기록 내역만 영구 삭제됩니다.)')) {
      return;
    }
    setHistoryList([]);
    localStorage.removeItem('ai_history_records');
    setExpandedSnapshotId(null);
  };

  const handleExportJSON = (snapshot: Snapshot, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(snapshot, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      const filename = `AI_Trading_Snapshot_${snapshot.savedAt.replace(/[:.]/g, '-')}.json`;
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      alert('파일 내보내기 실패');
    }
  };

  const toggleSnapshot = (id: number) => {
    if (expandedSnapshotId === id) {
      setExpandedSnapshotId(null);
      setExpandedAiEmail(null);
    } else {
      setExpandedSnapshotId(id);
      setExpandedAiEmail(null);
    }
  };

  const toggleAiRecord = (email: string) => {
    setExpandedAiEmail(expandedAiEmail === email ? null : email);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Navigation & Title */}
        <div className="space-y-4">
          <Link
            href="/admin/ai-monitoring"
            className="inline-flex items-center gap-2 text-xs font-bold text-meta-blue hover:text-indigo-600 transition-colors uppercase tracking-wider group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            자율 매매 모니터링 페이지로 돌아가기
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
                <History className="w-9 h-9 text-indigo-600" />
                AI 자율 매매 히스토리 기록
              </h1>
              <p className="text-steel text-sm mt-1">저장한 특정 시점의 AI 투자 성향별 계좌 자산, 보유 주식 및 구동 모델 스냅샷을 시계열 조회합니다.</p>
            </div>
            {historyList.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-all rounded-meta-full text-sm font-bold text-rose-600 shadow-sm cursor-pointer self-start md:self-auto"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                전체 히스토리 삭제
              </button>
            )}
          </div>
        </div>

        {/* Timeline Snapshot Feed */}
        {historyList.length > 0 ? (
          <div className="relative border-l-2 border-indigo-100 pl-6 md:pl-8 ml-3 md:ml-4 space-y-10">
            {historyList.map((snapshot) => {
              const profit = snapshot.summary.totalAsset - snapshot.summary.totalInitial;
              const profitRate = snapshot.summary.totalInitial > 0
                ? (profit / snapshot.summary.totalInitial) * 100
                : 0;
              const isExpanded = expandedSnapshotId === snapshot.id;

              return (
                <div key={snapshot.id} className="relative group">
                  {/* Timeline Indicator Dot */}
                  <div className={`absolute -left-[35px] md:-left-[43px] top-1.5 w-6 h-6 rounded-full border-4 border-canvas flex items-center justify-center shadow-sm transition-all duration-300 ${
                    isExpanded ? 'bg-indigo-600 scale-110' : 'bg-indigo-200 group-hover:bg-indigo-400'
                  }`}>
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>

                  {/* Timeline Card */}
                  <div className={`bg-white border rounded-[28px] overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md ${
                    isExpanded ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-hairline-soft'
                  }`}>
                    {/* Header Summary */}
                    <div
                      onClick={() => toggleSnapshot(snapshot.id)}
                      className="p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 cursor-pointer select-none"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-500" />
                          <span className="text-sm text-steel font-bold">{formatDateTime(snapshot.savedAt)}</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-ink">
                          AI 합산 자산: {fmt(snapshot.summary.totalAsset)}원
                        </h3>
                        <p className="text-xs text-steel">
                          가동 상태: <span className="font-bold text-charcoal">{snapshot.summary.activeCount}대 작동중</span> | 누적 체결: {snapshot.summary.totalOrders}건
                        </p>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className="text-[10px] text-steel font-bold uppercase tracking-wider">합산 손익률</p>
                          <p className={`text-lg font-black ${profit >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                            {profit >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                          </p>
                          <p className={`text-xs font-semibold ${profit >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                            ({profit >= 0 ? '+' : ''}{fmt(profit)}원)
                          </p>
                        </div>

                        <div className="w-px h-10 bg-hairline" />

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleExportJSON(snapshot, e)}
                            className="flex items-center justify-center p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors border border-indigo-100"
                            title="이 기록 JSON 파일로 다운로드"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteEntry(snapshot.id, e)}
                            className="flex items-center justify-center p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors border border-rose-100"
                            title="이 기록 영구 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="text-indigo-600 ml-2">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Content (Expanded View) */}
                    {isExpanded && (
                      <div className="border-t border-hairline-soft bg-surface-soft/10 p-6 md:p-8 space-y-6">
                        <h4 className="text-sm font-black text-indigo-900 uppercase tracking-wider">
                          📋 저장 당시 6대 AI 에이전트 상세 자산 분계표
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {snapshot.records.map((rec) => {
                            const recAsset = rec.portfolio?.totalAssetValue ?? 0;
                            const recInitial = rec.portfolio?.initialBalance ?? 0;
                            const recProfit = recAsset - recInitial;
                            const recProfitRate = recInitial > 0 ? (recProfit / recInitial) * 100 : 0;
                            const isAiExpanded = expandedAiEmail === rec.profile.email;

                            return (
                              <div
                                key={rec.profile.id}
                                className="bg-white border border-hairline-soft rounded-2xl p-5 hover:shadow-sm transition-all duration-300 cursor-pointer"
                                onClick={() => toggleAiRecord(rec.profile.email)}
                              >
                                {/* AI Profile Card Header */}
                                <div className="flex items-start justify-between gap-2 mb-4">
                                  <div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                      rec.profile.riskProfile === 'HIGH' ? 'bg-market-up/10 text-market-up' :
                                      rec.profile.riskProfile === 'MEDIUM' ? 'bg-indigo-500/10 text-indigo-500' :
                                      'bg-meta-blue/10 text-meta-blue'
                                    }`}>
                                      {rec.profile.riskProfile === 'HIGH' ? '상 (공격)' :
                                       rec.profile.riskProfile === 'MEDIUM' ? '중 (중립)' : '하 (안정)'}
                                    </span>
                                    <h5 className="font-extrabold text-charcoal text-base mt-1.5">{rec.profile.name}</h5>
                                    <p className="text-[10px] text-steel">{rec.profile.email}</p>
                                  </div>

                                  <div className="text-right">
                                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      rec.profile.aiTradingEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-steel'
                                    }`}>
                                      {rec.profile.aiTradingEnabled ? '작동중' : '중지됨'}
                                    </span>
                                    <p className="text-[9px] text-steel font-bold mt-1 uppercase">
                                      {rec.profile.mockOrderEnabled ? '한투연동' : '로컬가상'}
                                    </p>
                                  </div>
                                </div>

                                {/* Model & Assets Summary */}
                                <div className="space-y-2.5 pb-4 border-b border-hairline-soft">
                                  <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-xl px-3 py-2">
                                    <p className="text-[9px] text-steel font-bold">탑재된 AI 무료 두뇌(모델)</p>
                                    <p className="text-xs font-black text-indigo-900 mt-0.5">{rec.profile.assignedModel}</p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[9px] text-steel font-bold">평가 총자산</p>
                                      <p className="text-sm font-black text-charcoal">{fmt(recAsset)}원</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] text-steel font-bold">보유 현금</p>
                                      <p className="text-sm font-extrabold text-steel">{fmt(rec.portfolio?.cashBalance ?? 0)}원</p>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-[9px] text-steel font-bold">수익률 / 수익금</p>
                                    <p className={`text-sm font-black ${recProfit >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                                      {recProfit >= 0 ? '+' : ''}{recProfitRate.toFixed(2)}% ({recProfit >= 0 ? '+' : ''}{fmt(recProfit)}원)
                                    </p>
                                  </div>
                                </div>

                                {/* Holdings Accordion Trigger */}
                                <div className="pt-3 flex items-center justify-between text-xs text-indigo-600 font-bold">
                                  <span>보유 주식 ({rec.holdings.length}종목)</span>
                                  <span className="flex items-center gap-1">
                                    {isAiExpanded ? '접기' : '상세 보유 종목 보기'}
                                    {isAiExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </span>
                                </div>

                                {/* Expandable Holdings List */}
                                {isAiExpanded && (
                                  <div className="mt-3.5 pt-3 border-t border-dashed border-hairline-soft space-y-3.5 animate-fadeIn">
                                    {rec.holdings.length > 0 ? (
                                      <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                                        {rec.holdings.map((hold) => {
                                          const displayName = resolveStockName(hold.stockCode, hold.stockName);
                                          return (
                                            <div key={hold.stockCode} className="bg-surface-soft/40 border border-hairline-soft/60 rounded-xl p-3 flex justify-between items-center text-xs">
                                              <div>
                                                <p className="font-extrabold text-charcoal">{displayName}</p>
                                                <p className="text-[9px] text-steel font-mono">{hold.stockCode} | {hold.quantity}주</p>
                                              </div>
                                              <div className="text-right">
                                                <p className="font-bold text-charcoal">{fmt(hold.currentPrice)}원</p>
                                                <p className={`text-[10px] font-black ${hold.profitLoss >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                                                  {hold.profitLoss >= 0 ? '+' : ''}{hold.profitRate.toFixed(2)}%
                                                </p>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-steel text-center py-4">저장 당시 보유 주식이 없습니다.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-hairline-soft rounded-[32px] p-16 text-center text-steel bg-white shadow-sm flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <History className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-ink">저장된 히스토리 기록 없음</h3>
            <p className="text-sm leading-relaxed max-w-sm">
              현재 저장된 AI 매매 기록 스냅샷이 없습니다. 
              <br />
              <Link href="/admin/ai-monitoring" className="text-meta-blue hover:underline font-bold">AI 자율 매매 모니터링</Link> 페이지에서 우측 상단의 <strong>[AI 현재 기록 저장]</strong> 버튼을 누르면 현재 모든 AI의 자산과 보유 종목 상태를 실시간 스냅샷으로 영구 보관할 수 있습니다.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
