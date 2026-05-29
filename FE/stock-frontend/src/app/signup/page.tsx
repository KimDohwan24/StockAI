'use client';

import { signup as signupApi } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signupApi(email, password, name);
      router.push('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '회원가입에 실패했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-meta-blue mb-2">StockAI</h1>
          <p className="text-slate">계정을 만들고 모의 투자를 시작하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-ink mb-1.5">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-hairline-soft rounded-meta-xl text-sm focus:outline-none focus:border-meta-blue transition-colors"
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-1.5">이메일 또는 아이디</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-hairline-soft rounded-meta-xl text-sm focus:outline-none focus:border-meta-blue transition-colors"
              placeholder="이메일 또는 아이디를 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-hairline-soft rounded-meta-xl text-sm focus:outline-none focus:border-meta-blue transition-colors"
              placeholder="6자 이상 입력하세요"
            />
          </div>

          {error && (
            <div className="text-market-down text-sm bg-market-down/5 border border-market-down/20 rounded-meta-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full meta-button-buy disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="text-center text-sm text-slate mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-meta-blue font-bold hover:underline">
            로그인
          </Link>
        </p>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-hairline-soft" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-canvas px-3 text-steel">또는</span>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-hairline-soft rounded-meta-full text-sm font-bold text-ink transition-colors hover:border-meta-blue hover:text-meta-blue"
        >
          게스트로 둘러보기
        </Link>
      </div>
    </div>
  );
}