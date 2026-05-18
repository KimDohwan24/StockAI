package com.stock.controller;

import com.stock.infrastructure.client.KisWebSocketClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class StockSubscriptionController {

    private final KisWebSocketClient kisWebSocketClient;

    @MessageMapping("/subscribe/price")
    public void subscribePrice(@Payload Map<String, String> payload, SimpMessageHeaderAccessor headerAccessor) {
        String stockCode = payload.get("stockCode");
        String clientId = resolveClientId(headerAccessor);
        if (stockCode != null && !stockCode.isEmpty() && clientId != null) {
            kisWebSocketClient.subscribePrice(clientId, stockCode);
            log.debug("STOMP subscribe price: {} (client: {})", stockCode, clientId);
        }
    }

    @MessageMapping("/unsubscribe/price")
    public void unsubscribePrice(@Payload Map<String, String> payload, SimpMessageHeaderAccessor headerAccessor) {
        String stockCode = payload.get("stockCode");
        String clientId = resolveClientId(headerAccessor);
        if (stockCode != null && !stockCode.isEmpty() && clientId != null) {
            kisWebSocketClient.unsubscribePrice(clientId, stockCode);
            log.debug("STOMP unsubscribe price: {} (client: {})", stockCode, clientId);
        }
    }

    @MessageMapping("/subscribe/orderbook")
    public void subscribeOrderbook(@Payload Map<String, String> payload, SimpMessageHeaderAccessor headerAccessor) {
        String stockCode = payload.get("stockCode");
        String clientId = resolveClientId(headerAccessor);
        if (stockCode != null && !stockCode.isEmpty() && clientId != null) {
            kisWebSocketClient.subscribeOrderbook(clientId, stockCode);
            log.debug("STOMP subscribe orderbook: {} (client: {})", stockCode, clientId);
        }
    }

    @MessageMapping("/unsubscribe/orderbook")
    public void unsubscribeOrderbook(@Payload Map<String, String> payload, SimpMessageHeaderAccessor headerAccessor) {
        String stockCode = payload.get("stockCode");
        String clientId = resolveClientId(headerAccessor);
        if (stockCode != null && !stockCode.isEmpty() && clientId != null) {
            kisWebSocketClient.unsubscribeOrderbook(clientId, stockCode);
            log.debug("STOMP unsubscribe orderbook: {} (client: {})", stockCode, clientId);
        }
    }

    private String resolveClientId(SimpMessageHeaderAccessor headerAccessor) {
        String clientId = headerAccessor.getFirstNativeHeader("X-Client-Id");
        if (clientId != null && !clientId.isEmpty()) return clientId;
        return headerAccessor.getSessionId();
    }
}