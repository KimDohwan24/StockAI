package com.stock.infrastructure.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stock.config.KisConfig;
import com.stock.infrastructure.dto.kis.RealtimeOrderbookDto;
import com.stock.infrastructure.dto.kis.RealtimeStockPriceDto;
import com.stock.infrastructure.dto.kis.StockPriceResponse;
import com.stock.service.KisAuthService;
import com.stock.service.StockMasterPriceUpdater;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Component
public class KisWebSocketClient {

    private static final String TR_ID_PRICE = "H0STASP0";
    private static final String TR_ID_ORDERBOOK = "H0STAS0";
    private static final String SUBSCRIBE = "1";
    private static final String UNSUBSCRIBE = "0";
    private static final int MAX_SUBSCRIPTIONS = 40;
    private static final int PING_INTERVAL_MS = 20000;
    private static final int RECONNECT_DELAY_MS = 5000;
    private static final int MAX_RECONNECT_ATTEMPTS = 10;

    private final KisConfig kisConfig;
    private final KisAuthService kisAuthService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final CacheManager cacheManager;
    private final StockMasterPriceUpdater stockMasterPriceUpdater;

    private volatile KisWsClient wsClient;
    private volatile boolean running = false;
    private volatile boolean connected = false;
    private final AtomicInteger reconnectAttempts = new AtomicInteger(0);

    private final Set<String> priceSubscriptions = ConcurrentHashMap.newKeySet();
    private final Set<String> orderbookSubscriptions = ConcurrentHashMap.newKeySet();
    private final Map<String, Long> subscriptionTime = new ConcurrentHashMap<>();

    private final Map<String, Set<String>> clientPriceSubscriptions = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> clientOrderbookSubscriptions = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> priceRefCount = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> orderbookRefCount = new ConcurrentHashMap<>();
    private final Set<String> activeClients = ConcurrentHashMap.newKeySet();

    private Thread pingThread;

    public KisWebSocketClient(KisConfig kisConfig,
                              KisAuthService kisAuthService,
                              SimpMessagingTemplate messagingTemplate,
                              ObjectMapper objectMapper,
                              CacheManager cacheManager,
                              StockMasterPriceUpdater stockMasterPriceUpdater) {
        this.kisConfig = kisConfig;
        this.kisAuthService = kisAuthService;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
        this.cacheManager = cacheManager;
        this.stockMasterPriceUpdater = stockMasterPriceUpdater;
    }

    @PostConstruct
    public void init() {
        running = true;
        connect();
    }

    @PreDestroy
    public void destroy() {
        running = false;
        disconnect();
    }

    public void connect() {
        try {
            String wsUrl = kisConfig.getWebsocketUrl();
            if (wsUrl == null || wsUrl.isEmpty()) {
                log.warn("KIS WebSocket URL not configured, skipping connection");
                return;
            }

            String approvalKey = kisAuthService.issueWebSocketKey();

            wsClient = new KisWsClient(URI.create(wsUrl), approvalKey);
            wsClient.connectBlocking();
        } catch (Exception e) {
            log.error("Failed to connect KIS WebSocket", e);
            scheduleReconnect();
        }
    }

    public void disconnect() {
        running = false;
        stopPing();
        try {
            if (wsClient != null) {
                wsClient.closeBlocking();
            }
        } catch (Exception e) {
            log.error("Error closing KIS WebSocket", e);
        }
        connected = false;
    }

    public synchronized void registerClient(String clientId) {
        activeClients.add(clientId);
    }

    public synchronized void unregisterClient(String clientId) {
        activeClients.remove(clientId);
        cleanupClient(clientId);
    }

    public synchronized void subscribePrice(String clientId, String stockCode) {
        clientPriceSubscriptions.computeIfAbsent(clientId, k -> ConcurrentHashMap.newKeySet());
        if (!clientPriceSubscriptions.get(clientId).add(stockCode)) return;

        AtomicInteger refCount = priceRefCount.computeIfAbsent(stockCode, k -> new AtomicInteger(0));
        if (refCount.getAndIncrement() == 0) {
            if (priceSubscriptions.size() + orderbookSubscriptions.size() >= MAX_SUBSCRIPTIONS) {
                refCount.decrementAndGet();
                clientPriceSubscriptions.get(clientId).remove(stockCode);
                log.warn("Max WebSocket subscriptions reached, cannot subscribe to {}", stockCode);
                return;
            }
            priceSubscriptions.add(stockCode);
            subscriptionTime.put(stockCode, System.currentTimeMillis());
            if (connected) {
                sendSubscribe(TR_ID_PRICE, stockCode);
            }
        }
    }

    public synchronized void unsubscribePrice(String clientId, String stockCode) {
        Set<String> clientSubs = clientPriceSubscriptions.get(clientId);
        if (clientSubs == null || !clientSubs.remove(stockCode)) return;

        AtomicInteger refCount = priceRefCount.get(stockCode);
        if (refCount != null && refCount.decrementAndGet() == 0) {
            priceRefCount.remove(stockCode);
            priceSubscriptions.remove(stockCode);
            subscriptionTime.remove(stockCode);
            if (connected) {
                sendUnsubscribe(TR_ID_PRICE, stockCode);
            }
        }
    }

    public synchronized void subscribeOrderbook(String clientId, String stockCode) {
        clientOrderbookSubscriptions.computeIfAbsent(clientId, k -> ConcurrentHashMap.newKeySet());
        if (!clientOrderbookSubscriptions.get(clientId).add(stockCode)) return;

        AtomicInteger refCount = orderbookRefCount.computeIfAbsent(stockCode, k -> new AtomicInteger(0));
        if (refCount.getAndIncrement() == 0) {
            if (priceSubscriptions.size() + orderbookSubscriptions.size() >= MAX_SUBSCRIPTIONS) {
                refCount.decrementAndGet();
                clientOrderbookSubscriptions.get(clientId).remove(stockCode);
                log.warn("Max WebSocket subscriptions reached, cannot subscribe orderbook for {}", stockCode);
                return;
            }
            orderbookSubscriptions.add(stockCode);
            if (connected) {
                sendSubscribe(TR_ID_ORDERBOOK, stockCode);
            }
        }
    }

    public synchronized void unsubscribeOrderbook(String clientId, String stockCode) {
        Set<String> clientSubs = clientOrderbookSubscriptions.get(clientId);
        if (clientSubs == null || !clientSubs.remove(stockCode)) return;

        AtomicInteger refCount = orderbookRefCount.get(stockCode);
        if (refCount != null && refCount.decrementAndGet() == 0) {
            orderbookRefCount.remove(stockCode);
            orderbookSubscriptions.remove(stockCode);
            if (connected) {
                sendUnsubscribe(TR_ID_ORDERBOOK, stockCode);
            }
        }
    }

    public synchronized void cleanupClient(String clientId) {
        Set<String> priceSubs = clientPriceSubscriptions.remove(clientId);
        if (priceSubs != null) {
            for (String stockCode : priceSubs) {
                AtomicInteger refCount = priceRefCount.get(stockCode);
                if (refCount != null && refCount.decrementAndGet() == 0) {
                    priceRefCount.remove(stockCode);
                    priceSubscriptions.remove(stockCode);
                    subscriptionTime.remove(stockCode);
                    if (connected) {
                        sendUnsubscribe(TR_ID_PRICE, stockCode);
                    }
                }
            }
        }

        Set<String> orderbookSubs = clientOrderbookSubscriptions.remove(clientId);
        if (orderbookSubs != null) {
            for (String stockCode : orderbookSubs) {
                AtomicInteger refCount = orderbookRefCount.get(stockCode);
                if (refCount != null && refCount.decrementAndGet() == 0) {
                    orderbookRefCount.remove(stockCode);
                    orderbookSubscriptions.remove(stockCode);
                    if (connected) {
                        sendUnsubscribe(TR_ID_ORDERBOOK, stockCode);
                    }
                }
            }
        }

        log.debug("Cleaned up subscriptions for client {}. Remaining: {} price, {} orderbook",
                clientId, priceSubscriptions.size(), orderbookSubscriptions.size());
    }

    public boolean isConnected() {
        return connected;
    }

    public int getSubscriptionCount() {
        return priceSubscriptions.size() + orderbookSubscriptions.size();
    }

    private void sendSubscribe(String trId, String trKey) {
        try {
            String msg = String.format(
                    "{\"header\":{\"approval_key\":\"%s\",\"custtype\":\"P\",\"tr_type\":\"%s\",\"tr_id\":\"%s\"},\"body\":{\"input\":{\"tr_key\":\"%s\"}}}",
                    kisAuthService.issueWebSocketKey(), SUBSCRIBE, trId, trKey
            );
            wsClient.send(msg);
            log.debug("Subscribed {} for {}", trId, trKey);
        } catch (Exception e) {
            log.error("Failed to send subscribe for {}: {}", trKey, e.getMessage());
        }
    }

    private void sendUnsubscribe(String trId, String trKey) {
        try {
            String msg = String.format(
                    "{\"header\":{\"approval_key\":\"%s\",\"custtype\":\"P\",\"tr_type\":\"%s\",\"tr_id\":\"%s\"},\"body\":{\"input\":{\"tr_key\":\"%s\"}}}",
                    kisAuthService.issueWebSocketKey(), UNSUBSCRIBE, trId, trKey
            );
            wsClient.send(msg);
            log.debug("Unsubscribed {} for {}", trId, trKey);
        } catch (Exception e) {
            log.error("Failed to send unsubscribe for {}: {}", trKey, e.getMessage());
        }
    }

    private void resubscribeAll() {
        for (String code : priceSubscriptions) {
            sendSubscribe(TR_ID_PRICE, code);
        }
        for (String code : orderbookSubscriptions) {
            sendSubscribe(TR_ID_ORDERBOOK, code);
        }
        log.info("Resubscribed {} price + {} orderbook subscriptions",
                priceSubscriptions.size(), orderbookSubscriptions.size());
    }

    private void handleMessage(String message) {
        try {
            if (message.startsWith("{")) {
                JsonNode root = objectMapper.readTree(message);
                JsonNode header = root.path("header");
                String trId = header.path("tr_id").asText("");
                String trKey = header.path("tr_key").asText("");
                String body = root.path("body").asText("");

                if (body.isEmpty()) return;

                switch (trId) {
                    case TR_ID_PRICE -> handlePriceMessage(trKey, body);
                    case TR_ID_ORDERBOOK -> handleOrderbookMessage(trKey, body);
                }
            } else if (message.contains("|")) {
                String[] parts = message.split("\\|", 4);
                if (parts.length >= 4) {
                    String trId = parts[1];
                    String data = parts[3];
                    String trKey = data.contains("^") ? data.split("\\^")[0] : "";

                    switch (trId) {
                        case TR_ID_PRICE -> handlePriceMessage(trKey, data);
                        case TR_ID_ORDERBOOK -> handleOrderbookMessage(trKey, data);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error handling KIS WebSocket message: {}", e.getMessage());
        }
    }

    private void handlePriceMessage(String stockCode, String data) {
        try {
            RealtimeStockPriceDto dto = RealtimeStockPriceDto.fromPipeDelimited(stockCode, data);
            if (dto == null) return;

            messagingTemplate.convertAndSend("/topic/price/" + stockCode, dto);

            Cache priceCache = cacheManager.getCache("stocks::price");
            if (priceCache != null) {
                StockPriceResponse response = dto.toStockPriceResponse();
                priceCache.put(stockCode, response);

                stockMasterPriceUpdater.submitPriceUpdate(
                        stockCode,
                        response.getStck_prpr(),
                        response.getPrdy_vrss(),
                        response.getPrdy_vrss_sign(),
                        response.getPrdy_ctrt(),
                        response.getAcml_vol(),
                        response.getHts_avls()
                );
            }

            log.trace("Broadcast price update for {}: {}", stockCode, dto.getStckPrpr());
        } catch (Exception e) {
            log.error("Error handling price message for {}: {}", stockCode, e.getMessage());
        }
    }

    private void handleOrderbookMessage(String stockCode, String data) {
        try {
            RealtimeOrderbookDto dto = RealtimeOrderbookDto.fromKrxData(stockCode, data);
            if (dto == null) return;

            messagingTemplate.convertAndSend("/topic/orderbook/" + stockCode, dto);
        } catch (Exception e) {
            log.error("Error handling orderbook message for {}: {}", stockCode, e.getMessage());
        }
    }

    private void startPing() {
        stopPing();
        pingThread = new Thread(() -> {
            while (running && connected) {
                try {
                    Thread.sleep(PING_INTERVAL_MS);
                    if (wsClient != null && wsClient.isOpen()) {
                        wsClient.send("{\"header\":\"ping\"}");
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }, "kis-ws-ping");
        pingThread.setDaemon(true);
        pingThread.start();
    }

    private void stopPing() {
        if (pingThread != null) {
            pingThread.interrupt();
            pingThread = null;
        }
    }

    @Scheduled(fixedDelay = 300000)
    public void cleanupStaleClients() {
        Set<String> knownClients = new HashSet<>(clientPriceSubscriptions.keySet());
        knownClients.addAll(clientOrderbookSubscriptions.keySet());

        for (String clientId : knownClients) {
            if (!activeClients.contains(clientId)) {
                log.warn("Cleaning up stale client not in active set: {}", clientId);
                cleanupClient(clientId);
            }
        }
    }

    private void scheduleReconnect() {
        if (!running) return;

        int attempt = reconnectAttempts.incrementAndGet();
        if (attempt > MAX_RECONNECT_ATTEMPTS) {
            log.error("Max reconnection attempts reached for KIS WebSocket");
            return;
        }

        long delay = RECONNECT_DELAY_MS * Math.min(attempt, 5);
        log.info("Scheduling KIS WebSocket reconnect in {}ms (attempt {})", delay, attempt);

        Thread reconnectThread = new Thread(() -> {
            try {
                Thread.sleep(delay);
                if (running) connect();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "kis-ws-reconnect");
        reconnectThread.setDaemon(true);
        reconnectThread.start();
    }

    private class KisWsClient extends WebSocketClient {

        private final String approvalKey;

        public KisWsClient(URI serverUri, String approvalKey) {
            super(serverUri);
            this.approvalKey = approvalKey;
            this.addHeader("approval_key", approvalKey);
            this.addHeader("custtype", "P");
        }

        @Override
        public void onOpen(ServerHandshake handshake) {
            log.info("KIS WebSocket connected");
            connected = true;
            reconnectAttempts.set(0);
            resubscribeAll();
            startPing();
        }

        @Override
        public void onMessage(String message) {
            handleMessage(message);
        }

        @Override
        public void onClose(int code, String reason, boolean remote) {
            log.warn("KIS WebSocket closed: code={}, reason={}, remote={}", code, reason, remote);
            connected = false;
            stopPing();
            scheduleReconnect();
        }

        @Override
        public void onError(Exception ex) {
            log.error("KIS WebSocket error", ex);
            connected = false;
        }
    }
}