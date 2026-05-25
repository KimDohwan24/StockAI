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
  Star,
  X,
} from 'lucide-react';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/lib/auth';
import {
  getSystemConfig,
  getFavorites,
  toggleFavorite,
  getNotifications,
  getUnreadNotificationCount,
  readAllNotifications,
  getBasketItems,
} from '@/lib/api';
import StockSearchBar from '@/components/stocks/StockSearchBar';
import OverseasStockSearchBar from '@/components/overseas/OverseasStockSearchBar';

type SearchTab = 'domestic' | 'overseas';

function fmt(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ko-KR');
}

export default function Navbar() {
  const { isAuthenticated, clearAuth, user } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [favDropdownOpen, setFavDropdownOpen] = useState(false);
  const favDropdownRef = useRef<HTMLDivElement>(null);

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure light mode is active since dark mode button is removed
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  const { data: systemConfig } = useSWR('system-config', getSystemConfig, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  });

  const { data: favorites, isLoading: favoritesLoading } = useSWR(
    isAuthenticated ? 'user-favorites' : null,
    getFavorites,
    { revalidateOnFocus: false, dedupingInterval: 15000 }
  );

  const { data: unreadData, mutate: mutateUnread } = useSWR(
    isAuthenticated ? 'user-unread-notification-count' : null,
    getUnreadNotificationCount,
    { revalidateOnFocus: true, refreshInterval: 15000 }
  );
  const unreadCount = unreadData?.count ?? 0;

  const { data: notifications, isLoading: notificationsLoading, mutate: mutateNotifications } = useSWR(
    isAuthenticated ? 'user-notifications' : null,
    getNotifications,
    { revalidateOnFocus: true, refreshInterval: 15000 }
  );

  const { data: basketItems } = useSWR(
    isAuthenticated ? 'user-basket-items' : null,
    getBasketItems,
    { revalidateOnFocus: true, refreshInterval: 30000 }
  );
  const basketCount = basketItems?.length ?? 0;

  const handleRemoveFavorite = async (e: React.MouseEvent, stockCode: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleFavorite(stockCode);
      if (favorites) {
        mutate('user-favorites', favorites.filter(fav => fav.stockCode !== stockCode), false);
      }
      mutate('user-favorites');
      mutate(`favorite-status-${stockCode}`);
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const mockOrderEnabled = systemConfig?.mockOrderEnabled ?? null;

  const isDomestic = pathname === '/stocks' || pathname.startsWith('/stock/');
  const isOverseas = pathname === '/overseas-stocks' || pathname.startsWith('/overseas-stocks/');

  const searchTab: SearchTab = isOverseas ? 'overseas' : 'domestic';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (favDropdownRef.current && !favDropdownRef.current.contains(e.target as Node)) {
        setFavDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setDropdownOpen(false);
  };

  const handleOpenNotifDropdown = async () => {
    const nextOpen = !notifDropdownOpen;
    setNotifDropdownOpen(nextOpen);
    if (nextOpen && isAuthenticated) {
      try {
        await readAllNotifications();
        mutateUnread({ count: 0 }, false);
        if (notifications) {
          mutateNotifications(notifications.map(n => ({ ...n, read: true })), false);
        }
        mutateUnread();
        mutateNotifications();
      } catch (err) {
        console.error('Failed to read all notifications:', err);
      }
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-hairline-soft h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold tracking-tight text-meta-blue">StockAI</Link>
            {mockOrderEnabled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-meta-blue/10 text-meta-blue border border-meta-blue/20 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-meta-blue animate-pulse" />
                한투 모의투자 연동
              </span>
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
            <Link
              href="/ai-news"
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                pathname === '/ai-news'
                  ? 'bg-ink text-white'
                  : 'text-steel hover:bg-surface-soft'
              }`}
            >
              뉴스
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
          {/* 1. 즐겨찾기 (Favorites dropdown) */}
          {isAuthenticated && (
            <div className="relative" ref={favDropdownRef}>
              <button
                onClick={() => setFavDropdownOpen(!favDropdownOpen)}
                className="p-2 text-steel hover:text-yellow-500 transition-colors cursor-pointer relative"
                title="즐겨찾는 종목"
              >
                <Star className={`w-5 h-5 ${favorites && favorites.length > 0 ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                {favorites && favorites.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>
              {favDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-hairline-soft rounded-xl shadow-lg z-50 min-w-[280px] py-3 px-4 max-h-[360px] overflow-y-auto">
                  <h4 className="text-xs font-bold text-slate mb-3 flex items-center justify-between border-b border-hairline-soft pb-2">
                    <span>즐겨찾는 종목</span>
                    <span className="text-[10px] text-steel font-normal">총 {favorites?.length ?? 0}개</span>
                  </h4>
                  {favoritesLoading ? (
                    <p className="text-xs text-steel text-center py-4">불러오는 중...</p>
                  ) : !favorites || favorites.length === 0 ? (
                    <p className="text-xs text-steel text-center py-4">즐겨찾는 종목이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {favorites.map((fav) => {
                        const price = parseFloat(fav.currentPrice) || 0;
                        const changeRate = parseFloat(fav.changeRate) || 0;
                        const sign = fav.changeSign;
                        const isUp = sign === '1' || sign === '2';
                        const isDown = sign === '4' || sign === '5';
                        const colorClass = isUp ? 'text-market-up' : isDown ? 'text-market-down' : 'text-market-neutral';

                        return (
                          <div key={fav.stockCode} className="flex items-center justify-between py-1.5 hover:bg-surface-soft/50 rounded-lg px-2 -mx-2 transition-colors">
                            <Link
                              href={`/stock/${fav.stockCode}`}
                              onClick={() => setFavDropdownOpen(false)}
                              className="min-w-0 flex-1 flex flex-col"
                            >
                              <span className="text-xs font-bold text-ink truncate">{fav.stockName}</span>
                              <span className="text-[10px] text-steel">{fav.stockCode}</span>
                            </Link>
                            <div className="flex items-center gap-2 text-right">
                              <div>
                                <p className="text-xs font-bold text-ink">{fmt(price)}원</p>
                                <p className={`text-[10px] font-semibold ${colorClass}`}>
                                  {isUp ? '+' : ''}{changeRate.toFixed(2)}%
                                </p>
                              </div>
                              <button
                                onClick={(e) => handleRemoveFavorite(e, fav.stockCode)}
                                className="p-0.5 rounded-full text-stone hover:text-red-500 hover:bg-white transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. 알림 아이콘 (Notification) */}
          <div className="relative" ref={notifDropdownRef}>
            <button
              onClick={handleOpenNotifDropdown}
              className="p-2 text-steel hover:text-meta-blue transition-colors cursor-pointer relative"
              title="알림"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {notifDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-hairline-soft rounded-xl shadow-lg z-50 min-w-[320px] py-3 px-4 max-h-[360px] overflow-y-auto">
                <h4 className="text-xs font-bold text-slate mb-3 flex items-center justify-between border-b border-hairline-soft pb-2">
                  <span>알림 내역</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] text-red-500 font-bold">신규 알림 {unreadCount}개</span>
                  )}
                </h4>
                {notificationsLoading ? (
                  <p className="text-xs text-steel text-center py-4">불러오는 중...</p>
                ) : !notifications || notifications.length === 0 ? (
                  <p className="text-xs text-steel text-center py-4">알림이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`py-2 rounded-lg px-2 -mx-2 transition-colors text-left flex flex-col gap-1 ${
                          !notif.read ? 'bg-meta-blue/5' : 'hover:bg-surface-soft/50'
                        }`}
                      >
                        <p className="text-xs text-ink font-medium leading-relaxed">{notif.message}</p>
                        <span className="text-[9px] text-steel">
                          {new Date(notif.createdAt).toLocaleString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. 장바구니 (Shopping Cart) */}
          {isAuthenticated && (
            <Link href="/basket" className="p-2 text-steel active:text-ink hover:text-meta-blue transition-colors relative" title="장바구니">
              <ShoppingCart className="w-5 h-5" />
              {basketCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-meta-blue text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {basketCount}
                </span>
              )}
            </Link>
          )}

          {/* 4. 내정보 (User dropdown) */}
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
        </div>
      </div>
    </nav>
  );
}