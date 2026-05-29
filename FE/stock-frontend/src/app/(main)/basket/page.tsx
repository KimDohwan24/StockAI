'use client';

import {
  deleteBasketItem,
  getBasketItems,
  runBacktest,
  toggleBasketItemActive,
  updateBasketItem,
  type BacktestResponse
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  AlertCircle,
  Cpu,
  Play,
  ShoppingCart,
  Trash2,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';


export default function BasketPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const { data: basketItems, isLoading: itemsLoading } = useSWR(
    isAuthenticated ? 'user-basket-items' : null,
    getBasketItems,
    { revalidateOnFocus: false }
  );

  // 로컬 편집 상태 보관 (id -> { targetPrice, weight })
  const [editStates, setEditStates] = useState<Record<number, { targetPrice: number; weight: number }>>({});
  const [backtestResult, setBacktestResult] = useState<BacktestResponse | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // 데이터 로드 시 초기 에디트 스테이트 설정
  useEffect(() => {
    if (basketItems) {
      const initial: Record<number, { targetPrice: number; weight: number }> = {};
      basketItems.forEach((item) => {
        initial[item.id] = {
          targetPrice: item.targetPrice,
          weight: item.weight,
        };
      });
      setTimeout(() => {
        setEditStates(initial);
      }, 0);
    }
  }, [basketItems]);

  if (authLoading || itemsLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-meta-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-steel">장바구니 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleInputChange = (id: number, field: 'targetPrice' | 'weight', val: number) => {
    setEditStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: val,
      },
    }));
    if (saveStatus === 'saved') setSaveStatus('idle');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 장바구니에서 삭제하시겠습니까?')) return;
    try {
      await deleteBasketItem(id);
      mutate('user-basket-items', basketItems?.filter(item => item.id !== id), false);
      mutate('user-basket-items');
    } catch (err) {
      console.error('Delete failed:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const updated = await toggleBasketItemActive(id);
      mutate('user-basket-items', basketItems?.map(item => item.id === id ? updated : item), false);
      mutate('user-basket-items');
    } catch (err) {
      console.error('Toggle active failed:', err);
      alert('예약 대기 설정에 실패했습니다.');
    }
  };

  // 장바구니 설정 저장
  const handleSaveSettings = async () => {
    if (!basketItems) return false;
    setSaveStatus('saving');
    setErrorMsg(null);
    try {
      await Promise.all(
        basketItems.map(async (item) => {
          const edit = editStates[item.id];
          if (edit) {
            await updateBasketItem(item.id, edit.targetPrice, edit.weight);
          }
        })
      );
      setSaveStatus('saved');
      mutate('user-basket-items');
      return true;
    } catch (err) {
      console.error('Save failed:', err);
      setErrorMsg('설정 저장 중 오류가 발생했습니다.');
      setSaveStatus('idle');
      return false;
    }
  };

  // 백테스팅 실행
  const handleRunBacktest = async () => {
    if (!basketItems || basketItems.length === 0) return;
    
    // 1. 먼저 설정 저장
    const saved = await handleSaveSettings();
    if (!saved) return;

    setIsTesting(true);
    setErrorMsg(null);
    try {
      const reqItems = basketItems.map((item) => {
        const edit = editStates[item.id];
        return {
          stockCode: item.stockCode,
          targetPrice: edit ? edit.targetPrice : item.targetPrice,
          weight: edit ? edit.weight : item.weight,
        };
      });

      const res = await runBacktest(reqItems);
      setBacktestResult(res);
    } catch (err) {
      console.error('Backtest failed:', err);
      const message = err instanceof Error ? err.message : '백테스팅 수행 중 오류가 발생했습니다.';
      setErrorMsg(message);
    } finally {
      setIsTesting(false);
    }
  };

  // 총 비중 합 계산
  const totalWeight = basketItems
    ? basketItems.reduce((acc, item) => acc + (editStates[item.id]?.weight ?? item.weight), 0)
    : 0;

  // ─── SVG 차트 계산 도우미 ───
  const renderSvgChart = () => {
    if (!backtestResult || !backtestResult.chartData || backtestResult.chartData.length === 0) return null;
    const data = backtestResult.chartData;
    const w = 600;
    const h = 250;
    const padding = 40;

    const values = data.map((d) => d.returnValue);
    const minVal = Math.min(...values, 0); // 0%를 기준축으로 포함
    const maxVal = Math.max(...values, 10); // 최소 상한 10%

    const valRange = maxVal - minVal;

    const getX = (index: number) => padding + (index / (data.length - 1)) * (w - padding * 2);
    const getY = (val: number) => h - padding - ((val - minVal) / valRange) * (h - padding * 2);

    // Path Line
    let pathD = `M ${getX(0)} ${getY(data[0].returnValue)}`;
    for (let i = 1; i < data.length; i++) {
      pathD += ` L ${getX(i)} ${getY(data[i].returnValue)}`;
    }

    // Area Fill Path
    const areaD = `${pathD} L ${getX(data.length - 1)} ${getY(minVal)} L ${getX(0)} ${getY(minVal)} Z`;

    const zeroY = getY(0);

    return (
      <svg className="w-full h-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0064e0" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0064e0" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* 가로 그리드선 */}
        <line x1={padding} y1={getY(maxVal)} x2={w - padding} y2={getY(maxVal)} stroke="#e2e8f0" strokeDasharray="3,3" />
        <line x1={padding} y1={getY(minVal)} x2={w - padding} y2={getY(minVal)} stroke="#e2e8f0" strokeDasharray="3,3" />

        {/* 0% 기준선 */}
        {zeroY >= padding && zeroY <= h - padding && (
          <line x1={padding} y1={zeroY} x2={w - padding} y2={zeroY} stroke="#cbd5e1" strokeWidth="1.5" />
        )}

        {/* 영역 채우기 */}
        <path d={areaD} fill="url(#chartGrad)" />

        {/* 선 그리기 */}
        <path d={pathD} fill="none" stroke="#0064e0" strokeWidth="2.5" strokeLinecap="round" />

        {/* 시작 및 끝 노드 포인트 */}
        <circle cx={getX(0)} cy={getY(data[0].returnValue)} r="4" fill="#0064e0" />
        <circle cx={getX(data.length - 1)} cy={getY(data[data.length - 1].returnValue)} r="5" fill="#e41e3f" />

        {/* 좌측 Y축 텍스트 */}
        <text x={padding - 10} y={getY(maxVal) + 4} textAnchor="end" className="text-[10px] font-bold fill-steel">
          {maxVal.toFixed(0)}%
        </text>
        <text x={padding - 10} y={zeroY + 4} textAnchor="end" className="text-[10px] font-bold fill-slate">
          0%
        </text>
        <text x={padding - 10} y={getY(minVal) + 4} textAnchor="end" className="text-[10px] font-bold fill-steel">
          {minVal.toFixed(0)}%
        </text>

        {/* 하단 날짜 표시 */}
        <text x={padding} y={h - 10} textAnchor="start" className="text-[9px] fill-steel font-semibold">
          {data[0].date}
        </text>
        <text x={w - padding} y={h - 10} textAnchor="end" className="text-[9px] fill-steel font-semibold">
          {data[data.length - 1].date}
        </text>
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-10">
        
        {/* Header */}
        <div className="border-b border-hairline-soft pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-meta-blue/10 text-meta-blue rounded-2xl flex items-center justify-center shadow-inner">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-ink">스마트 투자 장바구니</h1>
              <p className="text-steel text-sm mt-0.5">
                원하는 목표가와 비중을 설정하고, AI 백테스팅 검증 후 자동 예약 주문을 가동하세요.
              </p>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 빈 화면 핸들링 */}
        {!basketItems || basketItems.length === 0 ? (
          <div className="bg-white border border-hairline-soft rounded-[32px] p-16 text-center space-y-4 shadow-sm">
            <ShoppingCart className="w-16 h-16 text-hairline mx-auto" />
            <h3 className="text-xl font-bold text-ink">장바구니에 담긴 종목이 없습니다.</h3>
            <p className="text-steel text-sm max-w-md mx-auto">
              국내 주식 조회 페이지에서 관심 있는 종목 카드의 별 아이콘 옆에 있는 장바구니 기능을 사용하여 종목을 담아보세요.
            </p>
            <Link href="/stocks" className="meta-button-buy inline-block px-8 py-2.5">
              국내 주식 구경하러 가기
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_450px] gap-8 items-start">
            
            {/* 왼쪽: 장바구니 목록 & 제어 슬라이더 */}
            <div className="space-y-6">
              <div className="bg-white border border-hairline-soft rounded-[28px] p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-hairline-soft pb-4">
                  <h3 className="font-bold text-lg text-ink">포트폴리오 종목 리스트</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-steel font-medium">총 비중 합:</span>
                    <span className={`text-sm font-black px-2.5 py-0.5 rounded-full ${
                      totalWeight === 100 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {totalWeight}% {totalWeight !== 100 && '(100% 권장)'}
                    </span>
                  </div>
                </div>

                <div className="space-y-6 divide-y divide-hairline-soft">
                  {basketItems.map((item, idx) => {
                    const edit = editStates[item.id] || { targetPrice: item.targetPrice, weight: item.weight };
                    return (
                      <div key={item.id} className={`pt-6 ${idx === 0 ? 'pt-0' : ''} space-y-4`}>
                        {/* 헤더: 이름 & 상태 */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-[10px] text-steel font-bold tracking-wider uppercase block">{item.stockCode}</span>
                            <span className="text-base font-bold text-ink">{item.stockName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* 예약 매수 활성화 토글 */}
                            <button
                              onClick={() => handleToggleActive(item.id)}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                                item.active
                                  ? 'bg-meta-blue text-white border-meta-blue-deep shadow-sm'
                                  : 'bg-surface-soft text-steel border-transparent hover:bg-hairline-soft'
                              }`}
                            >
                              {item.active ? '🟢 자동 예약 가동중' : '⚪ 자동 예약 대기'}
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-stone hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </div>

                        {/* 가격 및 비중 조절 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* 목표 매수가 인풋 */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-steel font-semibold block">목표 매수가 (원)</label>
                            <input
                              type="number"
                              min="0"
                              value={edit.targetPrice}
                              onChange={(e) => handleInputChange(item.id, 'targetPrice', parseFloat(e.target.value) || 0)}
                              className="w-full bg-surface-soft border border-hairline focus:border-meta-blue rounded-xl px-3 py-2 text-sm text-ink font-bold focus:outline-none"
                            />
                          </div>

                          {/* 비중 조절 슬라이더 */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-xs text-steel font-semibold">투자 비중 (%)</label>
                              <span className="text-xs text-meta-blue font-bold">{edit.weight}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={edit.weight}
                                onChange={(e) => handleInputChange(item.id, 'weight', parseInt(e.target.value) || 0)}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-meta-blue"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 저장 및 백테스트 실행 패널 */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={saveStatus === 'saving' || isTesting}
                  className="px-6 py-2.5 bg-surface-soft text-slate border border-hairline hover:bg-hairline-soft rounded-meta-full text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saveStatus === 'saving' ? '저장 중...' : saveStatus === 'saved' ? '✓ 저장 완료' : '포트폴리오 비중 저장'}
                </button>
                <button
                  onClick={handleRunBacktest}
                  disabled={isTesting}
                  className="meta-button-buy flex items-center gap-2 px-8 py-2.5 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isTesting ? 'AI 시뮬레이션 중...' : 'AI 과거 백테스팅 실행'}</span>
                </button>
              </div>
            </div>

            {/* 오른쪽: AI 백테스팅 리포트 */}
            <div className="space-y-6">
              {/* 백테스팅 미실행 가이드 */}
              {!backtestResult ? (
                <div className="bg-white border border-hairline-soft rounded-[28px] p-8 text-center space-y-4 shadow-sm h-full flex flex-col justify-center items-center py-20">
                  <Cpu className="w-12 h-12 text-meta-blue/20 animate-bounce" />
                  <h4 className="font-bold text-base text-ink">AI 시뮬레이터 대기 중</h4>
                  <p className="text-xs text-steel leading-relaxed max-w-[280px]">
                    포트폴리오 비중과 목표가를 맞춘 후 왼쪽의 **[AI 과거 백테스팅 실행]**을 눌러보세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 주요 수익 및 리스크 요약 */}
                  <div className="bg-white border border-hairline-soft rounded-[28px] p-6 shadow-sm space-y-6">
                    <h3 className="font-bold text-lg text-ink flex items-center gap-2 pb-3 border-b border-hairline-soft">
                      <TrendingUp className="w-5 h-5 text-meta-blue" />
                      시뮬레이션 분석 리포트
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-soft/60 border border-hairline-soft rounded-2xl p-4">
                        <p className="text-[10px] text-steel font-bold uppercase">과거 6개월 수익률</p>
                        <p className={`text-2xl font-black mt-1 ${
                          backtestResult.finalReturn >= 0 ? 'text-market-up' : 'text-market-down'
                        }`}>
                          {backtestResult.finalReturn >= 0 ? '+' : ''}
                          {backtestResult.finalReturn.toFixed(2)}%
                        </p>
                      </div>
                      <div className="bg-surface-soft/60 border border-hairline-soft rounded-2xl p-4">
                        <p className="text-[10px] text-steel font-bold uppercase">최대 낙폭 (MDD)</p>
                        <p className="text-2xl font-black text-ink mt-1">
                          -{backtestResult.mdd.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {/* SVG 시계열 차트 영역 */}
                    <div className="h-[260px] bg-surface-soft/30 rounded-2xl p-3 border border-hairline-soft flex items-center justify-center">
                      {renderSvgChart()}
                    </div>
                  </div>

                  {/* AI 코멘트 카드 */}
                  <div className="bg-gradient-to-tr from-white to-surface-soft border border-meta-blue/20 rounded-[28px] p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-meta-blue flex items-center gap-2">
                      <Cpu className="w-4.5 h-4.5" />
                      🤖 AI 진단 및 피드백
                    </h3>
                    <p className="text-xs text-slate leading-relaxed font-medium">
                      {backtestResult.aiAdvice}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
