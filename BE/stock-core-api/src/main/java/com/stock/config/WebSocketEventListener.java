package com.stock.config;

import com.stock.infrastructure.client.KisWebSocketClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final KisWebSocketClient kisWebSocketClient;

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String clientId = resolveClientId(headerAccessor);
        kisWebSocketClient.registerClient(clientId);
        log.debug("STOMP session connected: {} (clientId: {})", headerAccessor.getSessionId(), clientId);
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String clientId = resolveClientId(headerAccessor);
        kisWebSocketClient.unregisterClient(clientId);
        log.info("STOMP session disconnected, cleaned up subscriptions: {} (clientId: {})", headerAccessor.getSessionId(), clientId);
    }

    private String resolveClientId(SimpMessageHeaderAccessor headerAccessor) {
        String clientId = headerAccessor.getFirstNativeHeader("X-Client-Id");
        if (clientId != null && !clientId.isEmpty()) return clientId;
        return headerAccessor.getSessionId();
    }
}