'use client';

import { Activity, ShieldCheck, AlertCircle } from 'lucide-react';

interface AiDecisionGaugeProps {
  score: number; // -100 ~ 100
  signal: 'BUY' | 'HOLD' | 'SELL';
  reason: string;
  isLoading?: boolean;
}

export default function AiDecisionGauge({ score, signal, reason, isLoading }: AiDecisionGaugeProps) {
  // -100 ~ 100의 점수를 -90 ~ 90도의 회전 각도로 변환
  const needleAngle = Math.min(Math.max(score, -100), 100) * 0.9;

  const getSignalMeta = (sig: typeof signal) => {
    switch (sig) {
      case 'BUY':
        return {
          label: '강력 매수',
          colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800/30',
          gaugeColor: '#10b981',
          bgGradient: 'from-emerald-50/40 to-transparent',
        };
      case 'SELL':
        return {
          label: '적극 매도',
          colorClass: 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/30 dark:border-rose-800/30',
          gaugeColor: '#f43f5e',
          bgGradient: 'from-rose-50/40 to-transparent',
        };
      case 'HOLD':
      default:
        return {
          label: '관망 (HOLD)',
          colorClass: 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800/30 dark:border-slate-700/30',
          gaugeColor: '#64748b',
          bgGradient: 'from-slate-50/40 to-transparent',
        };
    }
  };

  const meta = getSignalMeta(signal);

  if (isLoading) {
    return (
      <div className="bg-white border border-hairline-soft rounded-[24px] p-6 shadow-sm space-y-6 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-surface-soft rounded-full" />
          <div className="h-5 bg-surface-soft rounded w-28" />
        </div>
        <div className="flex flex-col items-center py-4">
          <div className="w-48 h-24 bg-surface-soft rounded-t-full" />
          <div className="h-6 bg-surface-soft rounded w-20 mt-4" />
          <div className="h-8 bg-surface-soft rounded w-24 mt-2" />
        </div>
        <div className="space-y-2.5 pt-4 border-t border-hairline-soft/40">
          <div className="h-4 bg-surface-soft rounded w-1/4" />
          <div className="h-4 bg-surface-soft rounded w-full" />
          <div className="h-4 bg-surface-soft rounded w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-hairline-soft rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-b ${meta.bgGradient}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-meta-blue" />
          <h3 className="font-bold text-ink text-base">AI 투자 매력도</h3>
        </div>
        <div className="flex items-center gap-1 text-slate text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>실시간 연산됨</span>
        </div>
      </div>

      {/* Gauge and Score Info */}
      <div className="flex flex-col items-center py-2">
        <div className="relative w-[220px] h-[120px] flex justify-center items-end select-none">
          {/* SVG Gauge */}
          <svg className="w-full h-full" viewBox="0 0 200 110">
            <defs>
              {/* 반원 그라데이션 */}
              <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />   {/* SELL (적색) */}
                <stop offset="50%" stopColor="#cbd5e1" />  {/* HOLD (회색) */}
                <stop offset="100%" stopColor="#10b981" /> {/* BUY (녹색) */}
              </linearGradient>
              <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* 게이지 트랙 배경 (아주 얇게 깔아줌) */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* 게이지 실선 (그라데이션) */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#gauge-grad)"
              strokeWidth="12"
              strokeLinecap="round"
            />

            {/* 눈금 눈감아주고 텍스트 추가 */}
            <text x="15" y="112" fontSize="9" fontWeight="bold" fill="#f43f5e" textAnchor="middle">매도</text>
            <text x="100" y="15" fontSize="9" fontWeight="bold" fill="#64748b" textAnchor="middle">HOLD</text>
            <text x="185" y="112" fontSize="9" fontWeight="bold" fill="#10b981" textAnchor="middle">매수</text>

            {/* 회전하는 지침 바늘 */}
            <g transform={`rotate(${needleAngle}, 100, 100)`} className="transition-transform duration-1000 ease-out" filter="url(#shadow)">
              {/* 바늘 침 */}
              <path
                d="M 97 100 L 100 25 L 103 100 Z"
                fill="#1e293b"
              />
              <circle cx="100" cy="100" r="7" fill="#1e293b" />
              <circle cx="100" cy="100" r="3.5" fill="#f8fafc" />
            </g>
          </svg>
        </div>

        {/* 점수 및 신호 뱃지 */}
        <div className="text-center mt-3 space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${meta.colorClass}`}>
              {meta.label}
            </span>
            <span className="text-2xl font-black text-ink tracking-tight">
              {score > 0 ? `+${score}` : score}
            </span>
            <span className="text-xs text-steel font-medium">점</span>
          </div>
          <p className="text-[10px] text-steel">지표 범위: -100(매도) ~ +100(매수)</p>
        </div>
      </div>

      {/* AI 판단 근거 박스 */}
      <div className="mt-5 pt-4 border-t border-hairline-soft/50 space-y-2">
        <h4 className="text-xs text-steel font-bold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-meta-blue" />
          AI 종합 판단 근거
        </h4>
        <div className="bg-surface-soft/60 rounded-xl p-3.5 text-xs text-slate leading-relaxed border border-hairline-soft/30">
          {reason}
        </div>
      </div>
    </div>
  );
}
