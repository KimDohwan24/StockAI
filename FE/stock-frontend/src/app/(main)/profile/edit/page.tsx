'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import { useAuth } from '@/lib/auth';
import { getUserProfile, updateUserProfile } from '@/lib/api';
import { ArrowLeft, User, DollarSign, Save } from 'lucide-react';
import Link from 'next/link';

export default function ProfileEditPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, updateUser } = useAuth();
  const { mutate } = useSWRConfig();

  // Fetch current profile details to pre-populate form
  const { data: profile, isLoading: profileLoading } = useSWR(
    isAuthenticated ? 'user-profile' : null,
    getUserProfile,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const [name, setName] = useState(profile?.name || '');
  const [initialBalance, setInitialBalance] = useState<number | ''>(profile?.initialBalance ?? '');
  const [cashBalance, setCashBalance] = useState<number | ''>(profile?.cashBalance ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('이름은 필수 항목입니다.');
      return;
    }
    if (initialBalance === '' || initialBalance < 0) {
      setErrorMsg('모의 투자 원금은 0원 이상이어야 합니다.');
      return;
    }
    if (cashBalance === '' || cashBalance < 0) {
      setErrorMsg('예수금은 0원 이상이어야 합니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const updated = await updateUserProfile(name, Number(initialBalance), Number(cashBalance));
      
      // Update Auth context user name
      updateUser({ name: updated.name });

      // Refresh SWR caches
      mutate('user-profile', updated, true);
      mutate('user-portfolio'); // This will trigger fetcher to get updated totalAssetValue etc
      mutate('dashboard-portfolio');

      setSuccessMsg('프로필 및 자산 정보가 성공적으로 저장되었습니다!');
      setTimeout(() => {
        router.push('/profile');
      }, 1500); // 1.5 seconds later, redirect
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      setErrorMsg(msg || '정보 수정 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-meta-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-steel">사용자 정보를 가져오는 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Back Link */}
        <Link href="/profile" className="inline-flex items-center gap-2 text-steel hover:text-ink text-sm font-semibold mb-6 group transition-colors">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          마이페이지로 돌아가기
        </Link>

        <h1 className="text-3xl font-bold mb-2">내 정보 / 자산 설정</h1>
        <p className="text-steel text-sm mb-10">이름과 모의투자 원금을 변경할 수 있습니다.</p>

        <div className="bg-white border border-hairline-soft rounded-[28px] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <div className="p-4 bg-market-down/5 border border-market-down/20 text-market-down text-sm rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-xl font-medium">
                {successMsg}
              </div>
            )}

            {/* Email (Readonly) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-steel uppercase tracking-wider">이메일 계정 (수정 불가)</label>
              <input
                type="text"
                value={profile?.email || ''}
                disabled
                className="w-full px-4 py-3 bg-surface-soft text-slate border border-hairline-soft rounded-xl text-sm font-medium focus:outline-none cursor-not-allowed"
              />
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label htmlFor="name-input" className="text-xs font-bold text-steel uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                이름 (닉네임)
              </label>
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-3 bg-white text-ink border border-hairline-soft focus:border-meta-blue focus:ring-1 focus:ring-meta-blue/20 rounded-xl text-sm font-medium focus:outline-none transition-colors"
                maxLength={20}
                required
              />
            </div>

            {/* Initial Balance Input */}
            <div className="space-y-2">
              <label htmlFor="initial-balance-input" className="text-xs font-bold text-steel uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                모의 투자 원금 (KRW)
              </label>
              <div className="relative">
                <input
                  id="initial-balance-input"
                  type="number"
                  value={initialBalance}
                  onChange={(e) => {
                    const newVal = e.target.value === '' ? '' : Number(e.target.value);
                    setInitialBalance(newVal);
                    if (newVal !== '' && profile) {
                      const diff = newVal - profile.initialBalance;
                      setCashBalance(Math.max(0, profile.cashBalance + diff));
                    }
                  }}
                  placeholder="모의 투자 원금을 입력하세요"
                  className="w-full pl-4 pr-12 py-3 bg-white text-ink border border-hairline-soft focus:border-meta-blue focus:ring-1 focus:ring-meta-blue/20 rounded-xl text-sm font-medium focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min={0}
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-steel">원</span>
              </div>
              <p className="text-[11px] text-steel">모의투자를 시작할 때 설정한 총 투자 자산 기준 금액입니다.</p>
            </div>

            {/* Cash Balance Input */}
            <div className="space-y-2">
              <label htmlFor="cash-balance-input" className="text-xs font-bold text-steel uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                예수금 (현금 잔액 - KRW)
              </label>
              <div className="relative">
                <input
                  id="cash-balance-input"
                  type="number"
                  value={cashBalance}
                  onChange={(e) => setCashBalance(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="예수금을 입력하세요"
                  className="w-full pl-4 pr-12 py-3 bg-white text-ink border border-hairline-soft focus:border-meta-blue focus:ring-1 focus:ring-meta-blue/20 rounded-xl text-sm font-medium focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min={0}
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-steel">원</span>
              </div>
              <p className="text-[11px] text-steel">현재 거래 가능한 실제 현금 잔액입니다.</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-ink hover:bg-ink/90 active:bg-ink text-white disabled:bg-surface-soft disabled:text-steel disabled:cursor-not-allowed rounded-xl text-sm font-bold shadow-md transition-colors mt-8"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-steel border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  설정 저장하기
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
