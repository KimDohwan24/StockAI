import type { WebSocketConnectionState } from '@/types/websocket';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

type MessageHandler = (message: IMessage) => void;

const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 3000;

class WebSocketManager {
  private client: Client | null = null;
  private clientId: string = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
  private connectionState: WebSocketConnectionState = 'disconnected';
  private subscriptionIdCounter = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSubscriptions = new Map<string, { destination: string; handler: MessageHandler }>();
  private activeSubscriptions = new Map<string, { id: string; destination: string; handler: MessageHandler; unsubscribe: () => void }>();
  private stateListeners = new Set<(state: WebSocketConnectionState) => void>();
  private subscribedBeCodes = new Set<string>();

  getClientId(): string {
    return this.clientId;
  }

  getState(): WebSocketConnectionState {
    return this.connectionState;
  }

  onStateChange(listener: (state: WebSocketConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private setState(state: WebSocketConnectionState) {
    this.connectionState = state;
    this.stateListeners.forEach((l) => l(state));
  }

  connect(): void {
    if (this.client?.active) return;
    this.suspended = false;
    this.clearReconnectTimer();
    this.setState('connecting');

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: { 'X-Client-Id': this.clientId },
      reconnectDelay: 0,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.setState('connected');
        this.reconnectAttempts = 0;
        this.resubscribePending();
        this.registerClient();
        this.resubscribeBePrices();
      },
      onDisconnect: () => {
        this.setState('disconnected');
      },
      onStompError: (frame) => {
        console.error('[STOMP Error]', frame.headers?.message, frame.body);
      },
      onWebSocketClose: () => {
        if (this.connectionState !== 'disconnected' && !this.suspended) {
          this.setState('disconnected');
          this.scheduleReconnect();
        }
      },
    });

    this.client = client;
    client.activate();
  }

  private suspended = false;

  suspend(): void {
    this.suspended = true;
    if (this.client?.active) {
      for (const [subId, active] of this.activeSubscriptions) {
        this.pendingSubscriptions.set(subId, {
          destination: active.destination,
          handler: active.handler,
        });
      }
      this.activeSubscriptions.clear();
      this.client.deactivate();
    }
  }

  disconnect(): void {
    this.suspended = false;
    this.clearReconnectTimer();
    this.unregisterClient();
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    for (const [subId, active] of this.activeSubscriptions) {
      this.pendingSubscriptions.set(subId, {
        destination: active.destination,
        handler: active.handler,
      });
    }
    this.activeSubscriptions.clear();
    this.subscribedBeCodes.clear();
    this.setState('disconnected');
  }

  subscribe(destination: string, handler: MessageHandler): string {
    const subId = `sub-${++this.subscriptionIdCounter}`;

    if (this.connectionState === 'connected' && this.client?.active) {
      const stompSub = this.client.subscribe(destination, handler);
      this.activeSubscriptions.set(subId, {
        id: stompSub.id,
        destination,
        handler,
        unsubscribe: () => stompSub.unsubscribe(),
      });
    } else {
      this.pendingSubscriptions.set(subId, { destination, handler });
    }

    return subId;
  }

  unsubscribe(subId: string): void {
    const active = this.activeSubscriptions.get(subId);
    if (active) {
      active.unsubscribe();
      this.activeSubscriptions.delete(subId);
    }
    this.pendingSubscriptions.delete(subId);
  }

  async subscribeBePrice(stockCode: string): Promise<void> {
    if (this.subscribedBeCodes.has(stockCode)) return;
    this.subscribedBeCodes.add(stockCode);
    try {
      await fetch('/api/ws/subscribe/price/' + stockCode, {
        method: 'POST',
        headers: { 'X-Client-Id': this.clientId },
      });
    } catch {
      this.subscribedBeCodes.delete(stockCode);
    }
  }

  async unsubscribeBePrice(stockCode: string): Promise<void> {
    if (!this.subscribedBeCodes.has(stockCode)) return;
    this.subscribedBeCodes.delete(stockCode);
    try {
      await fetch('/api/ws/unsubscribe/price/' + stockCode, {
        method: 'POST',
        headers: { 'X-Client-Id': this.clientId },
      });
    } catch {
      // best-effort
    }
  }

  getSubscribedBeCodes(): Set<string> {
    return new Set(this.subscribedBeCodes);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private resubscribePending() {
    for (const [subId, { destination, handler }] of this.pendingSubscriptions) {
      if (this.client?.active) {
        const stompSub = this.client.subscribe(destination, handler);
        this.activeSubscriptions.set(subId, {
          id: stompSub.id,
          destination,
          handler,
          unsubscribe: () => stompSub.unsubscribe(),
        });
      }
    }
    this.pendingSubscriptions.clear();
  }

  private registerClient() {
    fetch('/api/ws/register', {
      method: 'POST',
      headers: { 'X-Client-Id': this.clientId },
    }).catch(() => {});
  }

  private unregisterClient() {
    fetch('/api/ws/register', {
      method: 'DELETE',
      headers: { 'X-Client-Id': this.clientId },
      keepalive: true,
    }).catch(() => {});
  }

  private resubscribeBePrices() {
    for (const stockCode of this.subscribedBeCodes) {
      fetch('/api/ws/subscribe/price/' + stockCode, {
        method: 'POST',
        headers: { 'X-Client-Id': this.clientId },
      }).catch(() => {});
    }
  }
}

export const wsManager = new WebSocketManager();