'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  User,
  ShoppingCart,
  Globe,
  LogOut,
  ChevronDown,
  Briefcase,
  Cpu,
} from 'lucide-react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth';
import { getSystemConfig } from '@/lib/api';
import StockSearchBar from '@/components/stocks/StockSearchBar';
import OverseasStockSearchBar from '@/components/overseas/OverseasStockSearchBar';

type SearchTab = 'domestic' | 'overseas';

export default function Navbar() {
  const { isAuthenticated, clearAuth, user } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: systemConfig } = useSWR('system-config', getSystemConfig, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  });

  const mockOrderEnabled = systemConfig?.mockOrderEnabled ?? null;

  const isDomestic = pathname === '/stocks' || pathname.startsWith('/stock/');
  const isOverseas = pathname === '/overseas-stocks' || pathname.startsWith('/overseas-stocks/');

  const searchTab: SearchTab = isOverseas ? 'overseas' : 'domestic';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setDropdownOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-hairline-soft h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold tracking-tight text-meta-blue">StockAI</Link>
            {mockOrderEnabled !== null && (
              mockOrderEnabled ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-meta-blue/10 text-meta-blue border border-meta-blue/20 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-meta-blue animate-pulse" />
                  한투 모의투자 연동
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-market-up/10 text-market-up border border-market-up/20 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-market-up animate-pulse" />
                  로컬 가상 모드 (24H)
                </span>
              )
            )}
          </div>
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/stocks"
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isDomestic
                  ? 'bg-ink text-white'
                  : 'text-steel hover:bg-surface-soft'
              }`}
            >
              국내 주식
            </Link>
            {/* 해외 주식 (추후 오픈 예정)
            <Link
              href="/overseas-stocks"
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${
                isOverseas
                  ? 'bg-ink text-white'
                  : 'text-steel hover:bg-surface-soft'
              }`}
            >
              <Globe className="w-3 h-3" />
              해외 주식
            </Link>
            */}
          </div>
          <div className="hidden md:block">
            <div className="relative w-96">
              <div className="flex items-center bg-surface-soft pl-2 pr-4 py-1 rounded-full">
                {/* 해외 주식 (추후 오픈 예정)
                <button
                  onClick={() => setSearchTab('domestic')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors flex-shrink-0 ${
                    searchTab === 'domestic'
                      ? 'bg-ink text-white'
                      : 'text-steel hover:text-ink'
                  }`}
                >
                  국내
                </button>
                <button
                  onClick={() => setSearchTab('overseas')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors flex items-center gap-0.5 flex-shrink-0 ${
                    searchTab === 'overseas'
                      ? 'bg-ink text-white'
                      : 'text-steel hover:text-ink'
                  }`}
                >
                  <Globe className="w-2.5 h-2.5" />
                  해외
                </button>
                <span className="w-px h-4 bg-hairline-soft mx-2 flex-shrink-0" />
                */}
                <StockSearchBar inline />

              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-steel active:text-ink transition-colors">
            <Bell className="w-5 h-5" />
          </button>

          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-meta-full bg-surface-soft hover:bg-hairline-soft transition-colors text-sm font-medium"
              >
                <User className="w-4 h-4" />
                <span>{user?.name ?? '사용자'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-steel" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-hairline-soft rounded-xl shadow-lg z-50 min-w-[180px] py-1">
                  {user?.role === 'ADMIN' && (
                    <Link
                      href="/admin/ai-monitoring"
                      className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-surface-soft transition-colors text-sm font-bold text-meta-blue border-b border-hairline-soft"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Cpu className="w-4 h-4 text-meta-blue" />
                      AI 전체 모니터링
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-surface-soft transition-colors text-sm"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Briefcase className="w-4 h-4 text-steel" />
                    마이페이지
                  </Link>
                  <Link
                    href="/profile/ai-history"
                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-surface-soft transition-colors text-sm"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Cpu className="w-4 h-4 text-indigo-500" />
                    AI 투자 레포지토리
                  </Link>
                  <Link
                    href="/profile/edit"
                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-surface-soft transition-colors text-sm border-b border-hairline-soft"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User className="w-4 h-4 text-steel" />
                    자산 설정
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-surface-soft transition-colors text-sm text-market-down"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-steel bg-surface-soft px-3 py-1 rounded-meta-full font-medium">게스트</span>
              <Link href="/login" className="meta-button-buy text-sm px-6 py-2">
                로그인
              </Link>
            </div>
          )}

          {isAuthenticated && (
            <Link href="/" className="p-2 text-steel active:text-ink transition-colors relative">
              <ShoppingCart className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}