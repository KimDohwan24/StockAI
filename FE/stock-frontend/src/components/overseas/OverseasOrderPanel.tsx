'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { buyOverseasStock, sellOverseasStock, getOverseasBalance } from '@/services/overseasStockApi';
import { useAuth } from '@/lib/auth';
import type { ExchangeCode } from '@/types/overseasStock';

interface OverseasOrderPanelProps {
  ticker: string;
  exchangeCode: ExchangeCode;
  currentPrice: number;
  currency: string;
}

export default function OverseasOrderPanel({
  ticker,
  exchangeCode,
  currentPrice,
  currency,
}: OverseasOrderPanelProps) {
  const { isAuthenticated } = useAuth();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(currentPrice > 0 ? currentPrice : 0);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMsg, setOrderMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: balanceData } = useSWR(
    isAuthenticated ? 'overseas-balance' : null,
    () => getOverseasBalance(),
    { refreshInterval: 30000, dedupingInterval: 10000 }
  );

  const userHolding = useMemo(
    () => balanceData?.output1?.find((h) => h.ticker === ticker && h.exchangeCode === exchangeCode) ?? null,
    [balanceData, ticker, exchangeCode]
  );

  const clampQuantity = useCallback(
    (val: number, currentSide: 'buy' | 'sell') => {
      const maxQty = currentSide === 'sell' ? (userHolding?.quantity ?? 0) : Infinity;
      const minQty = currentSide === 'sell' && (userHolding?.quantity ?? 0) === 0 ? 0 : 1;
      return Math.max(minQty, Math.min(val, maxQty));
    },
    [userHolding]
  );

  useEffect(() => {
    setQuantity((prev) => clampQuantity(prev, side));
  }, [clampQuantity, side]);

  const totalAmount = price * quantity;

  const handleOrder = async () => {
    if (quantity <= 0) return;
    setOrderLoading(true);
    setOrderMsg(null);
    try {
      if (side === 'buy') {
        await buyOverseasStock({ ticker, exchangeCode, quantity, price });
      } else {
        await sellOverseasStock({ ticker, exchangeCode, quantity, price });
      }
      setOrderMsg({
        type: 'success',
        text: `${side === 'buy' ? '매수' : '매도'} 완료: ${ticker} ${quantity}주 @ ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}`,
      });
      mutate('overseas-balance');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '주문에 실패했습니다.';
      setOrderMsg({ type: 'error', text: msg });
    } finally {
      setOrderLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white border border-hairline-soft rounded-[24px] p-6 shadow-sm">
        <h3 className="font-bold text-ink text-lg mb-3">해외 주식 거래</h3>
        <p className="text-slate text-sm mb-2">로그인 후 해외 주식 매수·매도를 이용할 수 있습니다.</p>
        <a href="/login" className="meta-button-buy inline-block text-center w-full">
          로그인
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white border border-hairline-soft rounded-[24px] p-6 shadow-sm space-y-5">
      <h3 className="font-bold text-ink text-lg">해외 주문</h3>

      <div className="bg-surface-soft rounded-meta-xl px-4 py-3 text-sm">
        <span className="text-steel">거래소: </span>
        <span className="font-bold text-ink">{exchangeCode}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-colors ${
            side === 'buy'
              ? 'bg-market-up text-white'
              : 'bg-surface-soft text-steel hover:text-ink'
          }`}
        >
          매수
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-colors ${
            side === 'sell'
              ? 'bg-meta-blue text-white'
              : 'bg-surface-soft text-steel hover:text-ink'
          }`}
        >
          매도
        </button>
      </div>

      {userHolding && (
        <div className="bg-surface-soft rounded-meta-xl px-4 py-3 text-sm">
          <span className="text-steel">보유: </span>
          <span className="font-bold text-ink">{userHolding.quantity}주</span>
          <span className="text-steel ml-2">평균단가: </span>
          <span className="font-bold text-ink">
            {userHolding.avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
          </span>
        </div>
      )}

      <div>
        <label className="block text-xs text-steel mb-1.5">수량</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuantity(clampQuantity(quantity - 1, side))}
            className="w-10 h-10 rounded-meta-xl bg-surface-soft text-ink font-bold hover:bg-hairline-soft transition-colors"
          >
            -
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setQuantity(clampQuantity(val, side));
            }}
            min={side === 'sell' && (userHolding?.quantity ?? 0) === 0 ? 0 : 1}
            className="flex-1 text-center px-4 py-2.5 border border-hairline-soft rounded-meta-xl text-sm font-bold focus:outline-none focus:border-meta-blue transition-colors"
          />
          <button
            onClick={() => setQuantity(clampQuantity(quantity + 1, side))}
            className="w-10 h-10 rounded-meta-xl bg-surface-soft text-ink font-bold hover:bg-hairline-soft transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-steel mb-1.5">주문단가 ({currency})</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
          step={0.01}
          min={0}
          className="w-full text-right px-4 py-2.5 border border-hairline-soft rounded-meta-xl text-sm font-bold focus:outline-none focus:border-meta-blue transition-colors"
        />
        <p className="text-xs text-stone mt-1">
          0 입력 시 시장가 주문 (거래소 지원 시)
        </p>
      </div>

      <div className="bg-surface-soft rounded-meta-xl px-4 py-3">
        <div className="flex justify-between text-sm">
          <span className="text-steel">현재가</span>
          <span className="font-bold text-ink">
            {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-steel">주문 금액</span>
          <span className="font-bold text-ink">
            {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
          </span>
        </div>
      </div>

      {orderMsg && (
        <div
          className={`text-sm rounded-meta-xl px-4 py-3 ${
            orderMsg.type === 'success'
              ? 'bg-market-up/5 text-market-up border border-market-up/20'
              : 'bg-market-down/5 text-market-down border border-market-down/20'
          }`}
        >
          {orderMsg.text}
        </div>
      )}

      <button
        onClick={handleOrder}
        disabled={orderLoading || quantity <= 0}
        className={`w-full py-3 rounded-full font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          side === 'buy'
            ? 'bg-market-up text-white active:bg-red-700'
            : 'bg-meta-blue text-white active:bg-meta-blue-deep'
        }`}
      >
        {orderLoading
          ? '주문 중...'
          : `${side === 'buy' ? '매수' : '매도'} ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}`}
      </button>
    </div>
  );
}