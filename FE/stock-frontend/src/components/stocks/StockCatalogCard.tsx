import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { Star, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { toggleFavorite, getFavoriteStatus, addBasketItem, deleteBasketItem, getBasketItems } from '@/lib/api';
import StockPriceBadge from './StockPriceBadge';
import { useInView } from '@/hooks/useInView';
import type { StockCatalogItem, StockCatalogWithPrice } from '@/types/stock';
import type { MappedStockPrice } from '@/lib/api';

interface StockCatalogCardProps {
  item: StockCatalogItem;
  price?: MappedStockPrice;
}

export default function StockCatalogCard({ item, price }: StockCatalogCardProps) {
  const { ref, isInView } = useInView({ rootMargin: '300px', triggerOnce: true });
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const { data: favoriteData, mutate: mutateFavorite } = useSWR(
    isAuthenticated && item.stockCode ? `favorite-status-${item.stockCode}` : null,
    () => getFavoriteStatus(item.stockCode),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  const isFavorite = favoriteData?.favorited ?? false;
  const [favoriteToggleLoading, setFavoriteToggleLoading] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    setFavoriteToggleLoading(true);
    try {
      const res = await toggleFavorite(item.stockCode);
      mutateFavorite({ favorited: res.favorited }, false);
      mutate('user-favorites');
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setFavoriteToggleLoading(false);
    }
  };

  const { data: basketItems } = useSWR(
    isAuthenticated ? 'user-basket-items' : null,
    getBasketItems,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );
  const basketItem = basketItems?.find((b) => b.stockCode === item.stockCode);
  const isInBasket = !!basketItem;
  const [basketToggleLoading, setBasketToggleLoading] = useState(false);

  const handleToggleBasket = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;
    setBasketToggleLoading(true);
    try {
      if (isInBasket) {
        if (confirm('장바구니에서 이 종목을 삭제하시겠습니까?')) {
          await deleteBasketItem(basketItem.id);
          mutate('user-basket-items', basketItems?.filter((b) => b.id !== basketItem.id) || [], false);
          mutate('user-basket-items');
        }
      } else {
        const rawPrice = price?.price || (item as StockCatalogWithPrice).currentPrice;
        const targetPrice = rawPrice ? parseFloat(String(rawPrice)) : 0;
        const defaultWeight = 10;
        
        await addBasketItem(item.stockCode, targetPrice, defaultWeight);
        mutate('user-basket-items');
        
        if (confirm('장바구니에 추가되었습니다. 장바구니 페이지로 이동하시겠습니까?')) {
          router.push('/basket');
        }
      }
    } catch (err) {
      console.error('Failed to toggle basket:', err);
      alert('장바구니 처리에 실패했습니다.');
    } finally {
      setBasketToggleLoading(false);
    }
  };

  return (
    <div ref={ref}>
      <Link
        href={`/stock/${item.stockCode}`}
        className="bg-white border border-hairline-soft rounded-[32px] p-6 hover:shadow-lg transition-shadow cursor-pointer group block"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <h4 className="font-bold text-lg truncate group-hover:text-meta-blue transition-colors">
              {item.name}
            </h4>
            <span className="text-sm text-steel font-medium flex-shrink-0">({item.stockCode})</span>
            {isAuthenticated && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={handleToggleFavorite}
                  disabled={favoriteToggleLoading}
                  className="p-1 rounded-full hover:bg-surface-soft/80 text-steel hover:text-yellow-500 transition-colors cursor-pointer"
                  title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                >
                  <Star
                    className={`w-4 h-4 transition-transform active:scale-125 ${
                      isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-stone hover:text-yellow-500'
                    }`}
                  />
                </button>
                <button
                  onClick={handleToggleBasket}
                  disabled={basketToggleLoading}
                  className="p-1 rounded-full hover:bg-surface-soft/80 text-steel hover:text-meta-blue transition-colors cursor-pointer"
                  title={isInBasket ? '장바구니에서 해제' : '장바구니에 담기'}
                >
                  <ShoppingCart
                    className={`w-4 h-4 transition-transform active:scale-125 ${
                      isInBasket ? 'text-meta-blue fill-meta-blue/20' : 'text-stone hover:text-meta-blue'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
          <span className={`ml-2 flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
            item.marketType === 'KOSPI'
              ? 'bg-surface-soft text-ink'
              : 'bg-meta-blue/5 text-meta-blue'
          }`}>
            {item.marketType}
          </span>
        </div>

        {isInView ? (
          <StockPriceBadge price={price} />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold animate-pulse bg-surface-soft rounded w-20 h-6" />
              <span className="text-xs animate-pulse bg-surface-soft rounded w-10 h-4" />
            </div>
            <div className="text-xs animate-pulse bg-surface-soft rounded w-16 h-3" />
          </div>
        )}
      </Link>
    </div>
  );
}