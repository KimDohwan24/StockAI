'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { IMessage } from '@stomp/stompjs';
import { wsManager } from '@/lib/websocket';
import { useVisibility } from '@/hooks/useVisibility';
import type { WebSocketConnectionState } from '@/types/websocket';

interface WebSocketActionsValue {
  subscribe: (destination: string, handler: (msg: IMessage) => void) => string;
  unsubscribe: (subId: string) => void;
  subscribeBePrice: (stockCode: string) => Promise<void>;
  unsubscribeBePrice: (stockCode: string) => Promise<void>;
}

const WebSocketStateContext = createContext<WebSocketConnectionState>('disconnected');
const WebSocketActionsContext = createContext<WebSocketActionsValue | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const isVisible = useVisibility();
  const [wsState, setWsState] = useState<WebSocketConnectionState>(() => wsManager.getState() || 'disconnected');

  useEffect(() => {
    const unsub = wsManager.onStateChange((state) => {
      setWsState(state);
    });

    wsManager.connect();

    return () => {
      unsub();
      wsManager.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      if (!wsManager.getState() || wsManager.getState() === 'disconnected') {
        wsManager.connect();
      }
    } else {
      wsManager.suspend();
    }
  }, [isVisible]);

  const subscribe = useCallback((destination: string, handler: (msg: IMessage) => void) => {
    return wsManager.subscribe(destination, handler);
  }, []);

  const unsubscribe = useCallback((subId: string) => {
    wsManager.unsubscribe(subId);
  }, []);

  const subscribeBePrice = useCallback(async (stockCode: string) => {
    await wsManager.subscribeBePrice(stockCode);
  }, []);

  const unsubscribeBePrice = useCallback(async (stockCode: string) => {
    await wsManager.unsubscribeBePrice(stockCode);
  }, []);

  const actions = useMemo<WebSocketActionsValue>(
    () => ({ subscribe, unsubscribe, subscribeBePrice, unsubscribeBePrice }),
    [subscribe, unsubscribe, subscribeBePrice, unsubscribeBePrice],
  );

  return (
    <WebSocketStateContext.Provider value={wsState}>
      <WebSocketActionsContext.Provider value={actions}>
        {children}
      </WebSocketActionsContext.Provider>
    </WebSocketStateContext.Provider>
  );
}

export function useWebSocketConnectionState(): WebSocketConnectionState {
  return useContext(WebSocketStateContext);
}

export function useWebSocketActions(): WebSocketActionsValue {
  const ctx = useContext(WebSocketActionsContext);
  if (!ctx) {
    throw new Error('useWebSocketActions must be used within a WebSocketProvider');
  }
  return ctx;
}

export function useWebSocketContext() {
  return useWebSocketActions();
}