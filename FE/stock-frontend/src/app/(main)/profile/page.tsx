'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/lib/auth';
import {
  getUserProfile,
  getPortfolio,
  getHoldings,
  updateAiConfig,
  getOrderHistory,
} from '@/lib/api';
import { getOverseasBalance } from '@/services/overseasStockApi';
import {
  User,
  Mail,
  Calendar,
  Shield,
  TrendingUp,
  TrendingDown,
  Edit2,
  Briefcase,
  Layers,
  Globe,
  Cpu,
  ArrowUpDown,
} from 'lucide-react';
import OverseasBalanceTable from '@/components/overseas/OverseasBalanceTable';
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
  });
};

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch profile, portfolio, holdings
  const { data: profile, isLoading: profileLoading } = useSWR(
    isAuthenticated ? 'user-profile' : null,
    getUserProfile,
    { revalidateOnFocus: false, dedupingInterval: 15000 }
  );

  const { data: portfolio, isLoading: portfolioLoading } = useSWR(
    isAuthenticated ? 'user-portfolio' : null,
    getPortfolio,
    { revalidateOnFocus: false, dedupingInterval: 15000 }
  );

  const { data: holdings, isLoading: holdingsLoading } = useSWR(
    isAuthenticated ? 'user-holdings' : null,
    getHoldings,
    { revalidateOnFocus: false, dedupingInterval: 15000 }
  );

  const { data: overseasBalance } = useSWR(
    isAuthenticated ? 'overseas-balance' : null,
    () => getOverseasBalance(),
    { refreshInterval: 30000, dedupingInterval: 10000 }
  );

  const { data: orderHistory, isLoading: orderHistoryLoading } = useSWR(
    isAuthenticated ? 'order-history' : null,
    getOrderHistory,
    { revalidateOnFocus: false, dedupingInterval: 15000 }
  );

  const handleToggleAiTrading = async () => {
    if (!profile) return;
    setIsUpdating(true);
    try {
      const nextEnabled = !profile.aiTradingEnabled;
      await updateAiConfig(nextEnabled, profile.riskProfile);
      mutate('user-profile', { ...profile, aiTradingEnabled: nextEnabled }, false);
      alert(`AI 자동 투자가 ${nextEnabled ? '활성화' : '비활성화'}되었습니다.`);
      mutate('user-profile');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      alert('설정 저장 실패: ' + msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRiskChange = async (newRisk: 'HIGH' | 'MEDIUM' | 'LOW') => {
    if (!profile) return;
    setIsUpdating(true);
    try {
      await updateAiConfig(profile.aiTradingEnabled, newRisk);
      mutate('user-profile', { ...profile, riskProfile: newRisk }, false);
      mutate('user-profile');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      alert('위험도 변경 실패: ' + msg);
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || profileLoading || portfolioLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-meta-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-steel">프로필 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // Calculate return details
  const totalReturn = portfolio ? portfolio.totalAssetValue - portfolio.initialBalance : 0;
  const totalReturnRate = portfolio && portfolio.initialBalance > 0
    ? ((totalReturn / portfolio.initialBalance) * 100).toFixed(2)
    : '0.00';
  const isPositive = totalReturn >= 0;

  // Format creation date
  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">마이페이지</h1>
            <p className="text-steel text-sm mt-1">개인 정보 및 투자 자산 현황을 한눈에 확인할 수 있습니다.</p>
          </div>
          <Link
            href="/profile/edit"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-ink text-white hover:bg-ink/90 transition-colors rounded-meta-full text-sm font-bold shadow-sm self-start md:self-auto"
          >
            <Edit2 className="w-4 h-4" />
            내 정보/자산 수정
          </Link>
        </div>

        {/* User Info & Summary Grid */}
        <div className="grid lg:grid-cols-[380px_1fr] gap-8 items-start">
          {/* Left Column container */}
          <div className="space-y-6 w-full">
            {/* User Info Card */}
            <div className="bg-white border border-hairline-soft rounded-[28px] p-6 shadow-sm w-full">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-hairline-soft">
                <div className="w-14 h-14 bg-meta-blue/10 text-meta-blue rounded-full flex items-center justify-center">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ink">{profile?.name ?? '사용자'}</h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-surface-soft text-steel text-xs font-semibold rounded-full">
                    {profile?.role === 'ADMIN' ? '관리자' : '일반 회원'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate">
                  <Mail className="w-4.5 h-4.5 text-steel flex-shrink-0" />
                  <span className="truncate">{profile?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate">
                  <Calendar className="w-4.5 h-4.5 text-steel flex-shrink-0" />
                  <span>가입일: {joinedDate}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate">
                  <Shield className="w-4.5 h-4.5 text-steel flex-shrink-0" />
                  <span>보안 레벨: 등급 A</span>
                </div>
              </div>
            </div>

            {/* AI Auto Trading Configuration Panel */}
            <div className="bg-white border border-hairline-soft rounded-[28px] p-6 shadow-sm w-full">
              <div className="flex items-center justify-between mb-4 border-b border-hairline-soft pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-meta-blue" />
                  <span className="text-base font-bold text-ink tracking-tight">AI 자율 매매 설정</span>
                </div>
                <button
                  onClick={handleToggleAiTrading}
                  disabled={isUpdating}
                  className={`relative inline-flex h-6 w-11 items-center rounded-meta-full transition-colors cursor-pointer focus:outline-none ${
                    profile?.aiTradingEnabled ? 'bg-meta-blue' : 'bg-hairline'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-meta-full bg-white transition-transform duration-200 ${
                      profile?.aiTradingEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-xs text-steel leading-relaxed">
                  AI가 설정된 위험 등급에 맞춰 자동으로 자산을 배분하고, 칼같은 손절 및 분할 매수를 실행합니다.
                </div>

                <div>
                  <label className="text-xs text-charcoal font-semibold block mb-2">투자 위험도 등급</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'HIGH', label: '상 (고위험)' },
                      { value: 'MEDIUM', label: '중 (일반)' },
                      { value: 'LOW', label: '하 (원금보장)' }
                    ].map((r) => (
                      <button
                        key={r.value}
                        onClick={() => handleRiskChange(r.value as 'HIGH' | 'MEDIUM' | 'LOW')}
                        disabled={isUpdating}
                        className={`py-2 rounded-meta-full text-xs font-bold transition-all border cursor-pointer text-center ${
                          profile?.riskProfile === r.value
                            ? 'bg-meta-blue text-white border-meta-blue-deep'
                            : 'bg-surface-soft text-slate border-transparent hover:bg-hairline-soft'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column with summaries stacked */}
          <div className="w-full space-y-6">
            {/* 내 투자 현황 (Real/Overseas Assets) */}
            <div className="bg-gradient-to-tr from-white to-surface-soft border border-hairline-soft rounded-[28px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-meta-blue" />
                  내 투자 현황
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/60 backdrop-blur-sm border border-hairline-soft rounded-2xl p-5">
                  <p className="text-xs text-steel mb-1">총 평가 금액</p>
                  <p className="text-xl font-bold text-ink">{fmt(overseasBalance?.output2?.totalEvaluatedAmount ?? 0)}원</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm border border-hairline-soft rounded-2xl p-5">
                  <p className="text-xs text-steel mb-1">총 매입 금액</p>
                  <p className="text-xl font-bold text-ink">{fmt(overseasBalance?.output2?.totalPurchaseAmount ?? 0)}원</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm border border-hairline-soft rounded-2xl p-5">
                  <p className="text-xs text-steel mb-1">평가 손익</p>
                  <p className={`text-xl font-bold ${(overseasBalance?.output2?.foreignCurrencyProfitLoss ?? 0) >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                    {(overseasBalance?.output2?.foreignCurrencyProfitLoss ?? 0) >= 0 ? '+' : ''}
                    {fmt(overseasBalance?.output2?.foreignCurrencyProfitLoss ?? 0)}원
                  </p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm border border-hairline-soft rounded-2xl p-5">
                  <p className="text-xs text-steel mb-1">실현 손익</p>
                  <p className={`text-xl font-bold ${(overseasBalance?.output2?.realizedProfitLoss ?? 0) >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                    {(overseasBalance?.output2?.realizedProfitLoss ?? 0) >= 0 ? '+' : ''}
                    {fmt(overseasBalance?.output2?.realizedProfitLoss ?? 0)}원
                  </p>
                </div>
              </div>
            </div>

            {/* 모의 투자 현황 (Domestic Assets) */}
            <div className="bg-gradient-to-tr from-white to-surface-soft border border-hairline-soft rounded-[28px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-meta-blue" />
                  모의 투자 현황
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/60 backdrop-blur-sm border border-hairline-soft rounded-2xl p-5">
                  <p className="text-xs text-steel mb-1">총 자산 평가액</p>
                  <p className="text-xl font-bold text-ink">{fmt(portfolio?.totalAssetValue ?? 0)}원</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm border border-hairline-soft rounded-2xl p-5">
                  <p className="text-xs text-steel mb-1">모의 투자 원금</p>
                  <p className="text-xl font-bold text-ink">{fmt(portfolio?.initialBalance ?? 0)}원</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm border border-hairline-soft rounded-2xl p-5">
                  <p className="text-xs text-steel mb-1">현재 예수금</p>
                  <p className="text-xl font-bold text-ink">{fmt(portfolio?.cashBalance ?? 0)}원</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm border border-hairline-soft rounded-2xl p-5">
                  <p className="text-xs text-steel mb-1">총 수익률</p>
                  <p className={`text-xl font-bold flex items-center gap-1 ${isPositive ? 'text-market-up' : 'text-market-down'}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isPositive ? '+' : ''}{totalReturnRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Holdings Section */}
        <div className="space-y-12">
          {/* 내 투자 보유 종목 (Overseas Holdings) */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-meta-blue" />
              <h3 className="text-2xl font-bold text-ink">내 투자 보유 종목</h3>
            </div>
            <OverseasBalanceTable />
          </section>

          {/* 모의 투자 보유 종목 (Domestic Holdings) */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <Layers className="w-5 h-5 text-meta-blue" />
              <h3 className="text-2xl font-bold text-ink">모의 투자 보유 종목</h3>
            </div>
            
            {holdingsLoading ? (
              <div className="bg-white border border-hairline-soft rounded-[28px] p-8 text-center text-steel animate-pulse">
                보유 종목을 불러오는 중...
              </div>
            ) : !holdings || holdings.length === 0 ? (
              <div className="bg-white border border-hairline-soft rounded-[28px] p-12 text-center text-steel">
                <p className="text-sm font-medium">보유하고 있는 모의 투자 주식이 없습니다.</p>
                <Link href="/stocks" className="inline-block mt-4 text-xs font-bold text-meta-blue hover:underline">
                  주식 보러 가기 &rarr;
                </Link>
              </div>
            ) : (
              <div className="bg-white border border-hairline-soft rounded-[28px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-hairline-soft text-steel text-xs bg-surface-soft/30">
                        <th className="text-left px-6 py-4 font-semibold">종목명</th>
                        <th className="text-right px-6 py-4 font-semibold">보유 수량</th>
                        <th className="text-right px-6 py-4 font-semibold">평균 단가</th>
                        <th className="text-right px-6 py-4 font-semibold">총 구매금액</th>
                        <th className="text-right px-6 py-4 font-semibold">현재가</th>
                        <th className="text-right px-6 py-4 font-semibold">평가 손익</th>
                        <th className="text-right px-6 py-4 font-semibold">수익률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((h) => (
                        <tr key={h.id} className="border-b border-hairline-soft last:border-b-0 hover:bg-surface-soft/40 transition-colors">
                          <td className="px-6 py-4">
                            <Link href={`/stock/${h.stockCode}`} className="hover:text-meta-blue transition-colors group">
                              <p className="font-bold text-ink group-hover:text-meta-blue">
                                {resolveStockName(h.stockCode, h.stockName)}
                              </p>
                              <p className="text-xs text-steel mt-0.5">{h.stockCode}</p>
                            </Link>
                          </td>
                          <td className="text-right px-6 py-4 font-medium text-ink">{fmt(h.quantity)}</td>
                          <td className="text-right px-6 py-4 text-slate">{fmt(h.avgPrice)}원</td>
                          <td className="text-right px-6 py-4 text-slate">{fmt(h.avgPrice * h.quantity)}원</td>
                          <td className="text-right px-6 py-4 text-slate">{fmt(h.currentPrice)}원</td>
                          <td className={`text-right px-6 py-4 font-medium ${h.profitLoss >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                            {h.profitLoss >= 0 ? '+' : ''}{fmt(h.profitLoss)}원
                          </td>
                          <td className={`text-right px-6 py-4 font-bold ${h.profitRate >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                            {h.profitRate >= 0 ? '+' : ''}{h.profitRate.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* 최근 거래 체결 내역 (Order History) */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <ArrowUpDown className="w-5 h-5 text-meta-blue" />
              <h3 className="text-2xl font-bold text-ink">최근 거래 체결 내역</h3>
            </div>
            
            {orderHistoryLoading ? (
              <div className="bg-white border border-hairline-soft rounded-[28px] p-8 text-center text-steel animate-pulse">
                거래 내역을 불러오는 중...
              </div>
            ) : !orderHistory || orderHistory.length === 0 ? (
              <div className="bg-white border border-hairline-soft rounded-[28px] p-12 text-center text-steel">
                <p className="text-sm font-medium">최근 거래 체결 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="bg-white border border-hairline-soft rounded-[28px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-hairline-soft text-steel text-xs bg-surface-soft/30">
                        <th className="text-left px-6 py-4 font-semibold">체결 시각</th>
                        <th className="text-left px-6 py-4 font-semibold">종목명</th>
                        <th className="text-center px-6 py-4 font-semibold">주문 구분</th>
                        <th className="text-right px-6 py-4 font-semibold">체결 수량</th>
                        <th className="text-right px-6 py-4 font-semibold">체결 단가</th>
                        <th className="text-right px-6 py-4 font-semibold">체결 금액</th>
                        <th className="text-center px-6 py-4 font-semibold">주문 주체</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderHistory.map((item) => (
                        <tr key={item.id} className="border-b border-hairline-soft last:border-b-0 hover:bg-surface-soft/40 transition-colors">
                          <td className="px-6 py-4 text-slate text-xs">
                            {formatDateTime(item.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <Link href={`/stock/${item.ticker}`} className="hover:text-meta-blue transition-colors group">
                              <p className="font-bold text-ink group-hover:text-meta-blue">
                                {resolveStockName(item.ticker, item.stockName)}
                              </p>
                              <p className="text-xs text-steel mt-0.5">{item.ticker}</p>
                            </Link>
                          </td>
                          <td className="text-center px-6 py-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                              item.orderType === 'BUY' 
                                ? 'bg-market-up/10 text-market-up' 
                                : 'bg-market-down/10 text-market-down'
                            }`}>
                              {item.orderType === 'BUY' ? '매수' : '매도'}
                            </span>
                          </td>
                          <td className="text-right px-6 py-4 font-medium text-ink">{fmt(item.quantity)}</td>
                          <td className="text-right px-6 py-4 text-slate">{fmt(item.price)}원</td>
                          <td className="text-right px-6 py-4 font-medium text-ink">{fmt(item.amount)}원</td>
                          <td className="text-center px-6 py-4">
                            {item.orderedBy === 'AI' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                🤖 AI
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                사용자
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
