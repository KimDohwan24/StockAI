'use client';

import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth';
import { wsManager } from '@/lib/websocket';
import { getAdminAiStatus, AdminAiStatusResponse, resetAiAccounts, toggleUserMockOrder, toggleUserAiTrading, syncDomesticStocks, syncOverseasStocks, syncNaverNews, updateUserInitialBalance } from '@/lib/api';
import {
  Cpu,
  TrendingUp,
  TrendingDown,
  Activity,
  Briefcase,
  Layers,
  History,
  DollarSign,
  Info,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Globe,
  Shield,
  Newspaper,
} from 'lucide-react';
import Link from 'next/link';
import { resolveStockName } from '@/lib/stockMap';

function fmt(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ko-KR');
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
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

export default function AdminAiMonitoringPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'medium' | 'low' | 'mock' | 'local'>('all');

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

  // Fetch all AIs status
  const { data: aiStatusList, error, isLoading, mutate } = useSWR(
    isAuthenticated && user?.role === 'ADMIN' ? 'admin-ai-status' : null,
    getAdminAiStatus,
    { refreshInterval: 10000, dedupingInterval: 5000 }
  );

  // AI 매매 이벤트 실시간 감지하여 자동 새로고침(mutate)
  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      const subId = wsManager.subscribe('/topic/ai-trade-event', (message) => {
        console.log('AI Trade Event Received via WebSocket, refreshing data...', message.body);
        mutate();
      });
      return () => {
        wsManager.unsubscribe(subId);
      };
    }
  }, [isAuthenticated, user, mutate]);

  const [resetting, setResetting] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});

  const toggleReason = (orderId: number) => {
    setExpandedReasons((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleReset = async () => {
    if (!window.confirm('모든 AI 계정을 초기화(보유 주식 전량 매도/자산 1억원으로 세팅/주문내역 초기화)하시겠습니까?\n(※ 투자 위험도는 그대로 보존됩니다.)')) {
      return;
    }
    setResetting(true);
    try {
      await resetAiAccounts();
      alert('AI 계정이 성공적으로 초기화되었습니다.');
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      alert(`초기화 실패: ${msg || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setResetting(false);
    }
  };

  const [syncingDomestic, setSyncingDomestic] = useState(false);
  const [syncingOverseas, setSyncingOverseas] = useState(false);
  const [syncingNews, setSyncingNews] = useState(false);

  const handleSyncDomestic = async () => {
    if (!window.confirm('KIS로부터 국내 주식 종목 정보를 동기화하시겠습니까? (이 작업은 다소 시간이 걸릴 수 있습니다.)')) {
      return;
    }
    setSyncingDomestic(true);
    try {
      const count = await syncDomesticStocks();
      alert(`국내 주식 동기화 완료: ${count}개 종목이 동기화되었습니다.`);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      alert(`동기화 실패: ${msg || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setSyncingDomestic(false);
    }
  };

  const handleSyncOverseas = async () => {
    if (!window.confirm('KIS로부터 해외 주식 종목 정보를 동기화하시겠습니까? (이 작업은 다소 시간이 걸릴 수 있습니다.)')) {
      return;
    }
    setSyncingOverseas(true);
    try {
      const count = await syncOverseasStocks();
      alert(`해외 주식 동기화 완료: ${count}개 종목이 동기화되었습니다.`);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      alert(`동기화 실패: ${msg || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setSyncingOverseas(false);
    }
  };

  const handleSyncNews = async () => {
    if (!window.confirm('네이버 뉴스를 동기화하고 AI 종목 분석을 갱신하시겠습니까?\n(이 작업은 다소 시간이 걸릴 수 있습니다.)')) {
      return;
    }
    setSyncingNews(true);
    try {
      const count = await syncNaverNews();
      alert(`네이버 뉴스 동기화 완료: ${count}개 종목의 AI 분석이 최신화되었습니다.`);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      alert(`동기화 실패: ${msg || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setSyncingNews(false);
    }
  };

  const handleSaveHistory = () => {
    if (!aiStatusList || aiStatusList.length === 0) {
      alert('저장할 AI 데이터가 없습니다.');
      return;
    }

    try {
      const raw = localStorage.getItem('ai_history_records');
      const history = raw ? JSON.parse(raw) : [];

      const snapshot = {
        id: Date.now(),
        savedAt: new Date().toISOString(),
        summary: {
          totalAsset: aiStatusList.reduce((acc: number, curr: any) => acc + (curr.portfolio?.totalAssetValue ?? 0), 0),
          totalInitial: aiStatusList.reduce((acc: number, curr: any) => acc + (curr.portfolio?.initialBalance ?? 0), 0),
          activeCount: aiStatusList.filter((a: any) => a.profile.aiTradingEnabled).length,
          totalOrders: aiStatusList.reduce((acc: number, curr: any) => acc + (curr.orderHistory?.length ?? 0), 0),
        },
        records: aiStatusList.map((ai: any) => {
          const FREE_MODELS_LABELS = [
            "Google Gemma 2",
            "Meta Llama 3",
            "Alibaba Qwen 2.5",
            "Mistral 7B",
            "Microsoft Phi-3"
          ];
          const modelIndex = Math.abs(ai.profile.id) % 5;
          const assignedModel = FREE_MODELS_LABELS[modelIndex];

          return {
            profile: {
              id: ai.profile.id,
              email: ai.profile.email,
              name: ai.profile.name,
              riskProfile: ai.profile.riskProfile,
              aiTradingEnabled: ai.profile.aiTradingEnabled,
              mockOrderEnabled: ai.profile.mockOrderEnabled,
              aiTradingAllocationRatio: ai.profile.aiTradingAllocationRatio,
              assignedModel: assignedModel
            },
            portfolio: ai.portfolio ? {
              initialBalance: ai.portfolio.initialBalance,
              cashBalance: ai.portfolio.cashBalance,
              totalAssetValue: ai.portfolio.totalAssetValue,
            } : null,
            holdings: ai.holdings ? ai.holdings.map((h: any) => ({
              stockCode: h.stockCode,
              stockName: h.stockName,
              quantity: h.quantity,
              avgPrice: h.avgPrice,
              currentPrice: h.currentPrice,
              profitLoss: h.profitLoss,
              profitRate: h.profitRate,
            })) : [],
            orderCount: ai.orderHistory?.length ?? 0
          };
        })
      };

      history.unshift(snapshot);
      localStorage.setItem('ai_history_records', JSON.stringify(history));

      if (window.confirm('현재 AI 투자 자산 및 계좌 현황 기록이 성공적으로 저장되었습니다!\nAI 히스토리 기록 조회 페이지로 이동하시겠습니까?')) {
        router.push('/admin/ai-history');
      }
    } catch (e) {
      console.error(e);
      alert('기록 저장 중 오류가 발생했습니다.');
    }
  };

  const [editingUserBalance, setEditingUserBalance] = useState<{ email: string; val: string } | null>(null);
  const [updatingBalance, setUpdatingBalance] = useState<string | null>(null);

  const handleSaveBalance = async (email: string) => {
    if (!editingUserBalance) return;
    const balance = parseFloat(editingUserBalance.val.replace(/,/g, ''));
    if (isNaN(balance) || balance <= 0) {
      alert('올바른 금액을 입력해주세요.');
      return;
    }

    setUpdatingBalance(email);
    try {
      await updateUserInitialBalance(email, balance);
      alert('투자 원금이 성공적으로 변경되었습니다.');
      setEditingUserBalance(null);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      alert(`변경 실패: ${msg || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setUpdatingBalance(null);
    }
  };



  const [togglingUserMock, setTogglingUserMock] = useState<string | null>(null);
  const [togglingUserAi, setTogglingUserAi] = useState<string | null>(null);

  const handleToggleUserMockOrder = async (email: string, currentEnabled: boolean) => {
    const nextModeName = currentEnabled ? '로컬 가상 체결 모드 (24H)' : '한투 모의투자 연동 모드';
    if (!window.confirm(`해당 AI 에이전트의 운영 모드를 [${nextModeName}]으로 변경하시겠습니까?`)) {
      return;
    }
    setTogglingUserMock(email);
    try {
      await toggleUserMockOrder(email, !currentEnabled);
      alert(`성공적으로 변경되었습니다.`);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      alert(`변경 실패: ${msg || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setTogglingUserMock(null);
    }
  };

  const handleToggleUserAiTrading = async (email: string, currentEnabled: boolean) => {
    const nextStateName = currentEnabled ? '중지' : '작동';
    if (!window.confirm(`해당 AI 에이전트의 자율매매 상태를 [${nextStateName}]로 변경하시겠습니까?`)) {
      return;
    }
    setTogglingUserAi(email);
    try {
      await toggleUserAiTrading(email, !currentEnabled);
      alert(`성공적으로 변경되었습니다.`);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      alert(`변경 실패: ${msg || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setTogglingUserAi(null);
    }
  };




  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-meta-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-steel">AI 계정 전체 현황 분석 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null; // Redirecting...
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-hairline-soft rounded-[28px] p-8 text-center shadow-lg">
          <XCircle className="w-12 h-12 text-market-down mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">데이터 로드 실패</h3>
          <p className="text-steel text-sm mb-6">{error.message || '관리자 권한으로 데이터를 불러오지 못했습니다.'}</p>
          <button
            onClick={() => mutate()}
            className="w-full px-5 py-2.5 bg-ink text-white hover:bg-ink/90 transition-colors rounded-meta-full text-sm font-bold"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const list = aiStatusList || [];
  const highActive = list.filter((a) => a.profile.riskProfile === 'HIGH').some((a) => a.profile.aiTradingEnabled);
  const mediumActive = list.filter((a) => a.profile.riskProfile === 'MEDIUM').some((a) => a.profile.aiTradingEnabled);
  const lowActive = list.filter((a) => a.profile.riskProfile === 'LOW').some((a) => a.profile.aiTradingEnabled);

  // Combined metrics
  const totalInitial = list.reduce((acc, curr) => acc + (curr.portfolio?.initialBalance ?? 0), 0);
  const totalAsset = list.reduce((acc, curr) => acc + (curr.portfolio?.totalAssetValue ?? 0), 0);
  const totalProfit = totalAsset - totalInitial;
  const totalProfitRate = totalInitial > 0 ? (totalProfit / totalInitial) * 100 : 0;
  const activeAiCount = list.filter((a) => a.profile.aiTradingEnabled).length;
  const totalOrders = list.reduce((acc, curr) => acc + (curr.orderHistory?.length ?? 0), 0);

  const getFilteredList = () => {
    if (activeTab === 'all') return list;
    if (activeTab === 'high') return list.filter((a) => a.profile.riskProfile === 'HIGH');
    if (activeTab === 'medium') return list.filter((a) => a.profile.riskProfile === 'MEDIUM');
    if (activeTab === 'low') return list.filter((a) => a.profile.riskProfile === 'LOW');
    if (activeTab === 'mock') return list.filter((a) => a.profile.mockOrderEnabled);
    if (activeTab === 'local') return list.filter((a) => !a.profile.mockOrderEnabled);
    return list;
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider">LIVE SYSTEM OVERVIEW</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <Cpu className="w-9 h-9 text-meta-blue" />
              AI 자율 매매 모니터링
            </h1>
            <p className="text-steel text-sm mt-1">{list.length}개 AI 투자 에이전트의 현황과 계좌 상태를 실시간 감시합니다.</p>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center justify-center shrink-0 gap-2 px-6 py-3.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl text-sm font-bold text-rose-600 shadow-sm cursor-pointer w-full whitespace-nowrap"
          >
            <RotateCcw className={`w-4 h-4 text-rose-500 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? '초기화 중...' : '전체 초기화'}
          </button>
          
          <button
            onClick={handleSyncDomestic}
            disabled={syncingDomestic}
            className="flex items-center justify-center shrink-0 gap-2 px-6 py-3.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl text-sm font-bold text-blue-600 shadow-sm cursor-pointer w-full whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 text-blue-500 ${syncingDomestic ? 'animate-spin' : ''}`} />
            {syncingDomestic ? '국내 동기화 중...' : '국내 동기화'}
          </button>

          <div className="flex gap-2 w-full">
            <button
              onClick={handleSyncOverseas}
              disabled={syncingOverseas}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3.5 bg-purple-50 border border-purple-200 hover:bg-purple-100 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl text-[13px] font-bold text-purple-600 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Globe className={`w-4 h-4 text-purple-500 ${syncingOverseas ? 'animate-spin' : ''}`} />
              {syncingOverseas ? '해외...' : '해외 동기화'}
            </button>
            <button
              onClick={handleSyncNews}
              disabled={syncingNews}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl text-[13px] font-bold text-emerald-600 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Newspaper className={`w-4 h-4 text-emerald-500 ${syncingNews ? 'animate-pulse' : ''}`} />
              {syncingNews ? '뉴스...' : '뉴스 동기화'}
            </button>
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={handleSaveHistory}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-100 transition-all rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5 text-white" />
              기록 저장
            </button>
            <Link
              href="/admin/ai-history"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-3.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all rounded-xl text-xs font-bold text-indigo-600 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5 text-indigo-500" />
              히스토리
            </Link>
            <button
              onClick={() => mutate()}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-3.5 bg-white border border-hairline-soft hover:bg-surface-soft transition-colors rounded-xl text-xs font-bold shadow-sm cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 text-steel" />
              새로고침
            </button>
          </div>
        </div>

        {/* Combined Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-tr from-white to-surface-soft border border-hairline-soft rounded-[28px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-steel font-bold">합산 총 자산</span>
              <Briefcase className="w-4.5 h-4.5 text-meta-blue" />
            </div>
            <p className="text-2xl font-extrabold text-ink">{fmt(totalAsset)}원</p>
            <p className="text-xs text-steel mt-1">원금 합산: {fmt(totalInitial)}원</p>
          </div>

          <div className="bg-gradient-to-tr from-white to-surface-soft border border-hairline-soft rounded-[28px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-steel font-bold">합산 실현/평가 손익</span>
              {totalProfit >= 0 ? (
                <TrendingUp className="w-4.5 h-4.5 text-market-up" />
              ) : (
                <TrendingDown className="w-4.5 h-4.5 text-market-down" />
              )}
            </div>
            <p className={`text-2xl font-extrabold ${totalProfit >= 0 ? 'text-market-up' : 'text-market-down'}`}>
              {totalProfit >= 0 ? '+' : ''}
              {fmt(totalProfit)}원
            </p>
            <p className={`text-xs font-semibold mt-1 ${totalProfit >= 0 ? 'text-market-up' : 'text-market-down'}`}>
              {totalProfitRate.toFixed(2)}%
            </p>
          </div>

          <div className="bg-gradient-to-tr from-white to-surface-soft border border-hairline-soft rounded-[28px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-steel font-bold">가동 중인 AI</span>
              <Activity className="w-4.5 h-4.5 text-emerald-500 animate-pulse" />
            </div>
            <p className="text-2xl font-extrabold text-ink">{activeAiCount} / {list.length}대</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {list.map((ai) => (
                <span
                  key={ai.profile.id}
                  className={`w-2 h-2 rounded-full ${ai.profile.aiTradingEnabled ? 'bg-emerald-500' : 'bg-stone'}`}
                  title={`${ai.profile.name} (${ai.profile.email}) 활성화 여부`}
                />
              ))}
              <span className="text-[10px] text-steel ml-1">각 에이전트 활성화 여부</span>
            </div>
          </div>

          <div className="bg-gradient-to-tr from-white to-surface-soft border border-hairline-soft rounded-[28px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-steel font-bold">누적 주문 체결수</span>
              <History className="w-4.5 h-4.5 text-indigo-500" />
            </div>
            <p className="text-2xl font-extrabold text-ink">{totalOrders}건</p>
            <p className="text-xs text-steel mt-1">AI 자율거래 실행 합계</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-hairline-soft gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: '전체 AI 요약' },
            { id: 'high', label: '상 (공격형 AI)', indicator: highActive },
            { id: 'medium', label: '중 (중립형 AI)', indicator: mediumActive },
            { id: 'low', label: '하 (안정형 AI)', indicator: lowActive },
            { id: 'mock', label: '한투 연동 모드' },
            { id: 'local', label: '로컬 가상 모드' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'all' | 'high' | 'medium' | 'low' | 'mock' | 'local')}
              className={`px-6 py-3.5 text-sm font-bold transition-all relative border-b-2 -mb-[2px] cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-meta-blue text-meta-blue font-extrabold'
                  : 'border-transparent text-steel hover:text-ink'
              }`}
            >
              {tab.label}
              {tab.indicator !== undefined && (
                <span className={`w-1.5 h-1.5 rounded-full ${tab.indicator ? 'bg-emerald-500' : 'bg-stone'}`} />
              )}
            </button>
          ))}
        </div>

        {/* AI Details Content */}
        <div className="space-y-12">
          {getFilteredList().map((ai) => {
            const aiProfit = (ai.portfolio?.totalAssetValue ?? 0) - (ai.portfolio?.initialBalance ?? 0);
            const aiProfitRate = (ai.portfolio?.initialBalance ?? 0) > 0
              ? (aiProfit / (ai.portfolio?.initialBalance ?? 0)) * 100
              : 0;
            const actualHoldings = ai.holdings?.filter((h: any) => !h.isReservation) || [];
            const reservationHoldings = ai.holdings?.filter((h: any) => h.isReservation) || [];

            return (
              <div key={ai.profile.id} className="space-y-6 bg-white border border-hairline-soft rounded-[32px] p-6 md:p-8 shadow-sm">
                {/* AI Agent Header Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-hairline-soft">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                      ai.profile.riskProfile === 'HIGH' ? 'bg-market-up/10 text-market-up' :
                      ai.profile.riskProfile === 'MEDIUM' ? 'bg-indigo-500/10 text-indigo-500' :
                      'bg-meta-blue/10 text-meta-blue'
                    }`}>
                      {ai.profile.riskProfile === 'HIGH' ? '상' :
                       ai.profile.riskProfile === 'MEDIUM' ? '중' : '하'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-extrabold text-ink">{ai.profile.name}</h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ai.profile.riskProfile === 'HIGH' ? 'bg-market-up/10 text-market-up' :
                          ai.profile.riskProfile === 'MEDIUM' ? 'bg-indigo-500/10 text-indigo-500' :
                          'bg-meta-blue/10 text-meta-blue'
                        }`}>
                          {ai.profile.riskProfile === 'HIGH' ? '고위험 공격형' :
                           ai.profile.riskProfile === 'MEDIUM' ? '중위험 중립형' : '원금보장 안정형'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ai.profile.mockOrderEnabled ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-teal-500/10 text-teal-600 border border-teal-500/20'
                        }`}>
                          {ai.profile.mockOrderEnabled ? '한투 모의투자 연동' : '로컬 가상 매매'}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
                          {(() => {
                            const FREE_MODELS_LABELS = [
                              "Google Gemma 2",
                              "Meta Llama 3",
                              "Alibaba Qwen 2.5",
                              "Mistral 7B",
                              "Microsoft Phi-3"
                            ];
                            const modelIndex = Math.abs(ai.profile.id) % 5;
                            return FREE_MODELS_LABELS[modelIndex];
                          })()}
                        </span>
                      </div>
                      <p className="text-xs text-steel mt-0.5">{ai.profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 self-start md:self-auto bg-surface-soft/60 px-5 py-2.5 rounded-2xl border border-hairline-soft">
                    <div
                      onClick={() => handleToggleUserAiTrading(ai.profile.email, ai.profile.aiTradingEnabled)}
                      className="text-center cursor-pointer select-none group"
                      title="클릭하여 이 AI의 자율매매 여부를 토글합니다."
                    >
                      <p className="text-[10px] text-steel font-bold uppercase tracking-wider group-hover:text-ink transition-colors">자율매매</p>
                      <div className="flex items-center gap-1 mt-0.5 justify-center">
                        {togglingUserAi === ai.profile.email ? (
                          <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        ) : ai.profile.aiTradingEnabled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors">작동중</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-stone group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-steel group-hover:text-ink transition-colors">중지됨</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="w-px h-6 bg-hairline" />
                    <div
                      onClick={() => handleToggleUserMockOrder(ai.profile.email, ai.profile.mockOrderEnabled)}
                      className="text-center cursor-pointer select-none group"
                      title="클릭하여 이 AI의 운영 모드를 토글합니다."
                    >
                      <p className="text-[10px] text-steel font-bold uppercase tracking-wider group-hover:text-ink transition-colors">운영 모드</p>
                      <div className="flex items-center gap-1 mt-0.5 justify-center">
                        {togglingUserMock === ai.profile.email ? (
                          <div className="w-3.5 h-3.5 border-2 border-meta-blue border-t-transparent rounded-full animate-spin" />
                        ) : ai.profile.mockOrderEnabled ? (
                          <>
                            <Globe className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform animate-pulse" />
                            <span className="text-xs font-bold text-amber-600 group-hover:text-amber-700 transition-colors">한투 연동</span>
                          </>
                        ) : (
                          <>
                            <Shield className="w-3.5 h-3.5 text-teal-500 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-teal-600 group-hover:text-teal-700 transition-colors">로컬 가상</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="w-px h-6 bg-hairline" />
                    <div className="text-center">
                      <p className="text-[10px] text-steel font-bold uppercase tracking-wider">주문당 배분</p>
                      <p className="text-xs font-bold text-ink mt-0.5">
                        {Math.round((ai.profile.aiTradingAllocationRatio ?? 0) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Balance Cards for the AI */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-surface-soft/40 border border-hairline-soft rounded-2xl p-4">
                    <p className="text-[11px] text-steel font-bold mb-1">총 자산 평가액</p>
                    <p className="text-lg font-extrabold text-ink">{fmt(ai.portfolio?.totalAssetValue ?? 0)}원</p>
                  </div>
                  <div className="bg-surface-soft/40 border border-hairline-soft rounded-2xl p-4">
                    <p className="text-[11px] text-steel font-bold mb-1">보유 현금 잔고</p>
                    <p className="text-lg font-extrabold text-ink">{fmt(ai.portfolio?.cashBalance ?? 0)}원</p>
                  </div>
                  <div className="bg-surface-soft/40 border border-hairline-soft rounded-2xl p-4 relative">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[11px] text-steel font-bold">투자 원금</p>
                      {editingUserBalance?.email !== ai.profile.email && (
                        <button
                          onClick={() => setEditingUserBalance({ email: ai.profile.email, val: String(ai.portfolio?.initialBalance ?? 0) })}
                          disabled={updatingBalance === ai.profile.email}
                          className="text-[10px] text-meta-blue hover:text-indigo-600 font-bold transition-colors cursor-pointer"
                        >
                          설정
                        </button>
                      )}
                    </div>
                    {editingUserBalance?.email === ai.profile.email ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="text"
                          value={editingUserBalance.val}
                          onChange={(e) => setEditingUserBalance({ ...editingUserBalance, val: e.target.value })}
                          className="w-full bg-white border border-hairline-soft rounded-lg px-1.5 py-0.5 text-xs font-bold text-ink focus:outline-none focus:border-meta-blue"
                          placeholder="금액 입력"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveBalance(ai.profile.email);
                            if (e.key === 'Escape') setEditingUserBalance(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveBalance(ai.profile.email)}
                          disabled={updatingBalance === ai.profile.email}
                          className="px-1.5 py-0.5 bg-meta-blue text-white rounded text-[9px] font-bold hover:bg-meta-blue-hover cursor-pointer whitespace-nowrap"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingUserBalance(null)}
                          className="px-1.5 py-0.5 bg-stone-100 hover:bg-stone-200 rounded text-[9px] font-bold text-steel cursor-pointer whitespace-nowrap"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <p className="text-lg font-extrabold text-ink">{fmt(ai.portfolio?.initialBalance ?? 0)}원</p>
                    )}
                  </div>
                  <div className="bg-surface-soft/40 border border-hairline-soft rounded-2xl p-4">
                    <p className="text-[11px] text-steel font-bold mb-1">수익률 / 수익금</p>
                    <p className={`text-lg font-extrabold ${aiProfit >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                      {aiProfit >= 0 ? '+' : ''}
                      {fmt(aiProfit)}원 ({aiProfitRate.toFixed(2)}%)
                    </p>
                  </div>
                </div>

                {/* Dynamic Content Grid: Holdings vs Orders */}
                <div className="grid lg:grid-cols-2 gap-8 mt-6">
                  {/* Holdings Section */}
                  <div className="space-y-6">
                    {/* 보유 주식 */}
                    <div className="space-y-3">
                      <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                        <Briefcase className="w-4.5 h-4.5 text-meta-blue" />
                        보유 주식 ({actualHoldings.length}종목)
                      </h3>
                      {actualHoldings.length > 0 ? (
                        <div className="border border-hairline-soft rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-surface-soft/60 border-b border-hairline-soft text-steel font-bold">
                                <th className="px-4 py-2.5">종목명</th>
                                <th className="px-4 py-2.5 text-right">수량</th>
                                <th className="px-4 py-2.5 text-right">평균가</th>
                                <th className="px-4 py-2.5 text-right">현재가</th>
                                <th className="px-4 py-2.5 text-right">손익 (율)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline-soft">
                              {actualHoldings.map((hold) => {
                                const displayName = resolveStockName(hold.stockCode, hold.stockName);
                                return (
                                  <tr key={hold.id} className="hover:bg-surface-soft/30 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-ink">
                                      <Link href={getStockDetailUrl(hold.stockCode)} className="hover:text-meta-blue hover:underline transition-colors block">
                                        <div>{displayName}</div>
                                        <div className="text-[10px] text-steel font-normal">{hold.stockCode}</div>
                                      </Link>
                                    </td>
                                    <td className="px-4 py-3 text-right text-charcoal font-medium">
                                      {hold.quantity}주
                                    </td>
                                    <td className="px-4 py-3 text-right text-steel">
                                      {fmt(hold.avgPrice)}원
                                    </td>
                                    <td className="px-4 py-3 text-right text-charcoal font-semibold">{fmt(hold.currentPrice)}원</td>
                                    <td className={`px-4 py-3 text-right font-bold ${hold.profitLoss >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                                      <div>{hold.profitLoss >= 0 ? '+' : ''}{fmt(hold.profitLoss)}원</div>
                                      <div className="text-[10px] font-semibold">{hold.profitRate.toFixed(2)}%</div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="border border-dashed border-hairline-soft rounded-2xl p-6 text-center text-steel text-xs bg-surface-soft/10">
                          현재 보유 중인 종목이 없습니다.
                        </div>
                      )}
                    </div>

                    {/* 예약 매수 대기 */}
                    <div className="space-y-3">
                      <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                        <History className="w-4.5 h-4.5 text-amber-500" />
                        예약 매수 대기 ({reservationHoldings.length}종목)
                      </h3>
                      {reservationHoldings.length > 0 ? (
                        <div className="border border-hairline-soft rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-surface-soft/60 border-b border-hairline-soft text-steel font-bold">
                                <th className="px-4 py-2.5">종목명</th>
                                <th className="px-4 py-2.5 text-right">구분</th>
                                <th className="px-4 py-2.5 text-right">예약 목표가</th>
                                <th className="px-4 py-2.5 text-right">현재가</th>
                                <th className="px-4 py-2.5 text-right">상태</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline-soft">
                              {reservationHoldings.map((hold) => {
                                const displayName = resolveStockName(hold.stockCode, hold.stockName).replace(/\s*\(예약\)$/, '');
                                return (
                                  <tr key={hold.id} className="hover:bg-surface-soft/30 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-ink">
                                      <Link href={getStockDetailUrl(hold.stockCode)} className="hover:text-meta-blue hover:underline transition-colors block">
                                        <div>{displayName}</div>
                                        <div className="text-[10px] text-steel font-normal">{hold.stockCode}</div>
                                      </Link>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="bg-amber-500/10 text-amber-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">
                                        예약매수
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-charcoal font-semibold">
                                      {fmt(hold.avgPrice)}원
                                    </td>
                                    <td className="px-4 py-3 text-right text-steel">{fmt(hold.currentPrice)}원</td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                        장개시후 실행
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="border border-dashed border-hairline-soft rounded-2xl p-6 text-center text-steel text-xs bg-surface-soft/10">
                          예약 매수 대기 중인 종목이 없습니다.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order History Section */}
                  <div className="space-y-4">
                    <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                      <History className="w-4.5 h-4.5 text-indigo-500" />
                      자율거래 체결 이력 ({ai.orderHistory?.length ?? 0}건)
                    </h3>
                    {ai.orderHistory && ai.orderHistory.length > 0 ? (
                      <div className="border border-hairline-soft rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface-soft/60 border-b border-hairline-soft text-steel font-bold">
                              <th className="px-4 py-2.5">체결 시간</th>
                              <th className="px-4 py-2.5">구분</th>
                              <th className="px-4 py-2.5">종목명</th>
                              <th className="px-4 py-2.5 text-right">단가/수량</th>
                              <th className="px-4 py-2.5 text-right">체결 금액</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-hairline-soft">
                            {ai.orderHistory.slice(0, 15).map((order) => {
                              const displayName = resolveStockName(order.ticker, order.stockName);
                              return (
                                <Fragment key={order.id}>
                                  <tr className="hover:bg-surface-soft/30 transition-colors">
                                    <td className="px-4 py-3 text-steel whitespace-nowrap">
                                      {formatDateTime(order.createdAt)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        order.orderType === 'BUY'
                                          ? 'bg-market-up/10 text-market-up'
                                          : 'bg-market-down/10 text-market-down'
                                      }`}>
                                        {order.orderType === 'BUY' ? '매수' : '매도'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-ink">
                                      <Link href={getStockDetailUrl(order.ticker)} className="hover:text-meta-blue hover:underline transition-colors block">
                                        <div>{displayName}</div>
                                        <div className="text-[10px] text-steel font-normal">{order.ticker}</div>
                                      </Link>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="text-charcoal font-semibold">{fmt(order.price)}원</div>
                                      <div className="text-steel">{order.quantity}주</div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-charcoal font-bold">
                                      <div>{fmt(order.amount)}원</div>
                                      {order.reason && (
                                        <button
                                          onClick={() => toggleReason(order.id)}
                                          className="mt-1 text-[10px] px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200 transition-all rounded font-bold cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                        >
                                          이유 {expandedReasons[order.id] ? '접기' : '보기'}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                  {order.reason && expandedReasons[order.id] && (
                                    <tr className="bg-indigo-50/5 animate-fadeIn">
                                      <td colSpan={5} className="px-4 py-3.5 bg-indigo-50/20 border-l-4 border-indigo-500">
                                        <div className="flex gap-2">
                                          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                          <div className="text-left">
                                            <p className="font-extrabold text-[10px] text-indigo-900 uppercase tracking-wider mb-0.5">AI 매매 분석 및 판단 이유</p>
                                            <p className="leading-relaxed text-[11px] text-charcoal font-medium">{order.reason}</p>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="border border-dashed border-hairline-soft rounded-2xl p-8 text-center text-steel text-sm bg-surface-soft/10">
                        자율거래 매매 내역이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
