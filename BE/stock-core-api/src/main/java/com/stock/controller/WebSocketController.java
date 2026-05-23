package com.stock.controller;

import com.stock.infrastructure.client.KisWebSocketClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ws")
@RequiredArgsConstructor
public class WebSocketController {

    private final KisWebSocketClient kisWebSocketClient;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @RequestHeader(value = "X-Client-Id", required = false) String clientId) {
        clientId = resolveClientId(clientId);
        kisWebSocketClient.registerClient(clientId);
        log.debug("Registered WS client: {}", clientId);
        return ResponseEntity.ok(Map.of(
                "clientId", clientId,
                "subscribed", true
        ));
    }

    @DeleteMapping("/register")
    public ResponseEntity<Map<String, Object>> unregister(
            @RequestHeader(value = "X-Client-Id", required = false) String clientId,
            @RequestParam(value = "stompSessionId", required = false) String stompSessionId) {
        clientId = resolveClientId(clientId, stompSessionId);
        kisWebSocketClient.unregisterClient(clientId);
        log.debug("Unregistered WS client: {}", clientId);
        return ResponseEntity.ok(Map.of(
                "clientId", clientId,
                "subscribed", false
        ));
    }

    @PostMapping("/subscribe/price/{stockCode}")
    public ResponseEntity<Map<String, Object>> subscribePrice(
            @PathVariable String stockCode,
            @RequestHeader(value = "X-Client-Id", required = false) String clientId,
            @RequestParam(value = "stompSessionId", required = false) String stompSessionId) {
        clientId = resolveClientId(clientId, stompSessionId);
        kisWebSocketClient.subscribePrice(clientId, stockCode);
        return ResponseEntity.ok(Map.of(
                "stockCode", stockCode,
                "type", "price",
                "subscribed", true,
                "totalSubscriptions", kisWebSocketClient.getSubscriptionCount(),
                "connected", kisWebSocketClient.isConnected()
        ));
    }

    @PostMapping("/unsubscribe/price/{stockCode}")
    public ResponseEntity<Map<String, Object>> unsubscribePrice(
            @PathVariable String stockCode,
            @RequestHeader(value = "X-Client-Id", required = false) String clientId,
            @RequestParam(value = "stompSessionId", required = false) String stompSessionId) {
        clientId = resolveClientId(clientId, stompSessionId);
        kisWebSocketClient.unsubscribePrice(clientId, stockCode);
        return ResponseEntity.ok(Map.of(
                "stockCode", stockCode,
                "type", "price",
                "subscribed", false,
                "totalSubscriptions", kisWebSocketClient.getSubscriptionCount(),
                "connected", kisWebSocketClient.isConnected()
        ));
    }

    @PostMapping("/subscribe/orderbook/{stockCode}")
    public ResponseEntity<Map<String, Object>> subscribeOrderbook(
            @PathVariable String stockCode,
            @RequestHeader(value = "X-Client-Id", required = false) String clientId,
            @RequestParam(value = "stompSessionId", required = false) String stompSessionId) {
        clientId = resolveClientId(clientId, stompSessionId);
        kisWebSocketClient.subscribeOrderbook(clientId, stockCode);
        return ResponseEntity.ok(Map.of(
                "stockCode", stockCode,
                "type", "orderbook",
                "subscribed", true,
                "totalSubscriptions", kisWebSocketClient.getSubscriptionCount(),
                "connected", kisWebSocketClient.isConnected()
        ));
    }

    @PostMapping("/unsubscribe/orderbook/{stockCode}")
    public ResponseEntity<Map<String, Object>> unsubscribeOrderbook(
            @PathVariable String stockCode,
            @RequestHeader(value = "X-Client-Id", required = false) String clientId,
            @RequestParam(value = "stompSessionId", required = false) String stompSessionId) {
        clientId = resolveClientId(clientId, stompSessionId);
        kisWebSocketClient.unsubscribeOrderbook(clientId, stockCode);
        return ResponseEntity.ok(Map.of(
                "stockCode", stockCode,
                "type", "orderbook",
                "subscribed", false,
                "totalSubscriptions", kisWebSocketClient.getSubscriptionCount(),
                "connected", kisWebSocketClient.isConnected()
        ));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "connected", kisWebSocketClient.isConnected(),
                "totalSubscriptions", kisWebSocketClient.getSubscriptionCount()
        ));
    }

    private String resolveClientId(String xClientId, String... fallbacks) {
        if (xClientId != null && !xClientId.isEmpty()) return xClientId;
        for (String fb : fallbacks) {
            if (fb != null && !fb.isEmpty()) return fb;
        }
        return "anonymous-" + System.nanoTime();
    }
}