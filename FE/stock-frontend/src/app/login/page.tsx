'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { login as loginApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginApi(email, password);
      const name = email.split('@')[0];
      setAuth(res.accessToken, { email, name });
      router.push('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '로그인에 실패했습니다.';
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
          <p className="text-slate">모의 투자를 시작하려면 로그인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full px-4 py-3 border border-hairline-soft rounded-meta-xl text-sm focus:outline-none focus:border-meta-blue transition-colors"
              placeholder="비밀번호를 입력하세요"
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
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-sm text-slate mt-6">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-meta-blue font-bold hover:underline">
            회원가입
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
          <Eye className="w-4 h-4" />
          게스트로 둘러보기
        </Link>
      </div>
    </div>
  );
}