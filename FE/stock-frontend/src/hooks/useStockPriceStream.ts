'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { IMessage } from '@stomp/stompjs';
import { useWebSocketContext } from '@/provider/WebSocketProvider';
import type { RealtimeStockPriceDto } from '@/types/websocket';
import type { MappedStockPrice } from '@/lib/api';
import { num, parseSign } from '@/lib/fetcher';

const STATIC_KEYS: (keyof MappedStockPrice)[] = [
  'upperLimit', 'lowerLimit', 'basePrice',
  'w52High', 'w52Low', 'per', 'pbr', 'eps', 'bps',
  'marketCap', 'marketName', 'stockName',
];

function mergeDefined<T>(target: T, incoming: Partial<T>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const [key, val] of Object.entries(incoming as Record<string, unknown>)) {
    if (val !== undefined) result[key] = val;
  }
  return result as T;
}

function restoreStaticFields(current: MappedStockPrice, initial: MappedStockPrice): MappedStockPrice {
  const result: Record<string, unknown> = { ...current };
  for (const key of STATIC_KEYS) {
    if (initial[key] !== undefined) result[key] = initial[key];
  }
  return result as unknown as MappedStockPrice;
}

function mapRealtimeToMapped(dto: RealtimeStockPriceDto): Partial<MappedStockPrice> {
  const signInfo = parseSign(dto.prdyVrssSign);
  const rawChange = num(dto.prdyVrss);
  const rawChangeRate = num(dto.prdyCtrt);
  const change = signInfo.isDown ? -Math.abs(rawChange) : Math.abs(rawChange);
  const changeRate = signInfo.isDown ? -Math.abs(rawChangeRate) : Math.abs(rawChangeRate);

  return {
    price: num(dto.stckPrpr),
    change,
    changeRate,
    open: num(dto.stckOprc),
    high: num(dto.stckHgpr),
    low: num(dto.stckLwpr),
    volume: num(dto.acmlVol),
    volumeValue: num(dto.acmlTrPbmn),
    sign: dto.prdyVrssSign ?? '',
    ...signInfo,
  };
}

export function useStockPriceStream(
  stockCode: string,
  initialPrice?: MappedStockPrice | null,
): {
  price: MappedStockPrice | null;
  lastUpdated: Date | null;
  reconnect: () => void;
} {
  const { subscribe, unsubscribe, subscribeBePrice, unsubscribeBePrice } = useWebSocketContext();
  const [price, setPrice] = useState<MappedStockPrice | null>(initialPrice ?? null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const subIdRef = useRef<string | null>(null);
  const mergedRef = useRef<MappedStockPrice | null>(initialPrice ?? null);
  const initialPriceRef = useRef<MappedStockPrice | null>(initialPrice ?? null);

  const handleMessageRef = useRef<(message: IMessage) => void>(() => {});
  handleMessageRef.current = (message: IMessage) => {
    try {
      const dto: RealtimeStockPriceDto = JSON.parse(message.body);
      const mapped = mapRealtimeToMapped(dto);

      if (mergedRef.current) {
        mergedRef.current = mergeDefined(mergedRef.current, mapped);
      } else if (initialPriceRef.current) {
        mergedRef.current = mergeDefined(initialPriceRef.current, mapped);
      } else {
        mergedRef.current = mapped as MappedStockPrice;
      }

      setPrice({ ...mergedRef.current });
      setLastUpdated(new Date());
    } catch {
      // ignore parse errors
    }
  };

  const stableHandler = useCallback((message: IMessage) => {
    handleMessageRef.current?.(message);
  }, []);

  const reconnect = useCallback(() => {
    setReconnectCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!stockCode) return;

    const destination = `/topic/price/${stockCode}`;
    const subId = subscribe(destination, stableHandler);
    subIdRef.current = subId;

    subscribeBePrice(stockCode);

    return () => {
      if (subIdRef.current) {
        unsubscribe(subIdRef.current);
        subIdRef.current = null;
      }
      unsubscribeBePrice(stockCode);
    };
  }, [stockCode, reconnectCount, subscribe, unsubscribe, subscribeBePrice, unsubscribeBePrice, stableHandler]);

  useEffect(() => {
    if (!initialPrice) return;
    initialPriceRef.current = initialPrice;

    if (mergedRef.current) {
      mergedRef.current = restoreStaticFields(mergedRef.current, initialPrice);
    } else {
      mergedRef.current = { ...initialPrice };
    }

    setPrice({ ...mergedRef.current });
  }, [initialPrice]);

  return useMemo(() => ({ price, lastUpdated, reconnect }), [price, lastUpdated, reconnect]);
}

export function useStockPriceStreamBatch(
  stockCodes: string[],
  initialPrices?: Record<string, MappedStockPrice>,
): Record<string, MappedStockPrice> {
  const { subscribe, unsubscribe, subscribeBePrice, unsubscribeBePrice } = useWebSocketContext();
  const [prices, setPrices] = useState<Record<string, MappedStockPrice>>({});
  const subIdsRef = useRef<Map<string, string>>(new Map());
  const mergedRef = useRef<Record<string, MappedStockPrice>>({});

  const stableCodesKey = useMemo(() => [...stockCodes].sort().join(','), [stockCodes]);

  useEffect(() => {
    const currentCodes = new Set(stockCodes);
    const prevCodes = new Set(subIdsRef.current.keys());

    if ([...currentCodes].sort().join(',') === [...prevCodes].sort().join(',')) return;

    for (const [code, subId] of subIdsRef.current) {
      if (!currentCodes.has(code)) {
        unsubscribe(subId);
        unsubscribeBePrice(code);
        subIdsRef.current.delete(code);
      }
    }

    for (const code of stockCodes) {
      if (subIdsRef.current.has(code)) continue;

      const handlerRef = { current: (message: IMessage) => {
        try {
          const dto: RealtimeStockPriceDto = JSON.parse(message.body);
          const mapped = mapRealtimeToMapped(dto);

          if (mergedRef.current[code]) {
            mergedRef.current = {
              ...mergedRef.current,
              [code]: mergeDefined(mergedRef.current[code], mapped),
            };
          } else {
            mergedRef.current = { ...mergedRef.current, [code]: mapped as MappedStockPrice };
          }

          setPrices({ ...mergedRef.current });
        } catch {
          // ignore
        }
      }};

      const destination = `/topic/price/${code}`;
      const subId = subscribe(destination, (message: IMessage) => handlerRef.current(message));

      subIdsRef.current.set(code, subId);
      subscribeBePrice(code);
    }

    return () => {
      for (const [code, subId] of subIdsRef.current) {
        unsubscribe(subId);
        unsubscribeBePrice(code);
      }
      subIdsRef.current.clear();
    };
  }, [stableCodesKey, subscribe, unsubscribe, subscribeBePrice, unsubscribeBePrice]);

  useEffect(() => {
    if (!initialPrices || Object.keys(initialPrices).length === 0) return;

    const updated = { ...mergedRef.current };
    let changed = false;

    for (const [code, price] of Object.entries(initialPrices)) {
      if (!updated[code]) {
        updated[code] = price;
        changed = true;
      } else {
        updated[code] = restoreStaticFields(updated[code], price);
        changed = true;
      }
    }

    if (changed) {
      mergedRef.current = updated;
      setPrices({ ...mergedRef.current });
    }
  }, [initialPrices]);

  return prices;
}