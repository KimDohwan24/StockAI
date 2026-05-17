'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortfolio } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const MIN_BALANCE = 1_000_000;
const MAX_BALANCE = 10_000_000_000;

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setHasPortfolio } = useAuth();
  const [balance, setBalance] = useState(100_000_000);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBalance(Number(e.target.value));
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const val = raw ? Number(raw) : 0;
    setBalance(Math.min(val, MAX_BALANCE));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (balance < MIN_BALANCE || balance > MAX_BALANCE) {
      setError('초기 자본은 1백만원 ~ 100억원 사이여야 합니다.');
      return;
    }

    setLoading(true);
    try {
      await createPortfolio(balance);
      setHasPortfolio(true);
      router.push('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '포트폴리오 생성에 실패했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const profitRate = 0;
  const totalAsset = balance;

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-meta-blue mb-2">모의 투자 시작하기</h1>
          <p className="text-slate">초기 자본을 설정하고 가상 투자를 시작하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white border border-hairline-soft rounded-meta-xxl p-8 shadow-sm">
            <label className="block text-sm font-bold text-ink mb-2">초기 자본 설정</label>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={fmt(balance)}
                onChange={handleInput}
                className="w-full px-4 py-3 border border-hairline-soft rounded-meta-xl text-lg font-bold focus:outline-none focus:border-meta-blue transition-colors"
              />
              <span className="text-ink font-bold text-lg shrink-0">원</span>
            </div>

            <input
              type="range"
              min={MIN_BALANCE}
              max={MAX_BALANCE}
              step={1_000_000}
              value={balance}
              onChange={handleSlider}
              className="w-full h-2 bg-surface-soft rounded-full appearance-none cursor-pointer accent-meta-blue"
            />
            <div className="flex justify-between text-xs text-steel mt-2">
              <span>1백만원</span>
              <span>100억원</span>
            </div>
          </div>

          <div className="bg-white border border-hairline-soft rounded-meta-xxl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-ink mb-4">포트폴리오 요약</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-steel">초기 자본</p>
                <p className="text-lg font-bold text-ink">{fmt(balance)}원</p>
              </div>
              <div>
                <p className="text-xs text-steel">현금</p>
                <p className="text-lg font-bold text-ink">{fmt(balance)}원</p>
              </div>
              <div>
                <p className="text-xs text-steel">총자산</p>
                <p className="text-lg font-bold text-ink">{fmt(totalAsset)}원</p>
              </div>
              <div>
                <p className="text-xs text-steel">수익률</p>
                <p className="text-lg font-bold text-market-neutral">{profitRate.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-market-down text-sm bg-market-down/5 border border-market-down/20 rounded-meta-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || balance < MIN_BALANCE}
            className="w-full meta-button-buy disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '생성 중...' : '포트폴리오 생성하기'}
          </button>
        </form>
      </div>
    </div>
  );
}