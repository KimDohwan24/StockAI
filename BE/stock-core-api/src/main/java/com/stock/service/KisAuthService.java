package com.stock.service;

import com.stock.config.KisConfig;
import com.stock.infrastructure.dto.kis.KisTokenRequest;
import com.stock.infrastructure.dto.kis.KisTokenResponse;
import com.stock.infrastructure.dto.kis.KisWebSocketKeyRequest;
import com.stock.infrastructure.dto.kis.KisWebSocketKeyResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class KisAuthService {

    private static final String REDIS_TOKEN_KEY = "kis:access_token";
    private static final String REDIS_TOKEN_EXPIRE_KEY = "kis:access_token:expires_in";
    private static final String REDIS_WS_KEY = "kis:websocket_approval_key";
    private static final Duration WS_KEY_TTL = Duration.ofHours(23);

    private static final ConcurrentHashMap<String, String> localCache = new ConcurrentHashMap<>();

    private final KisConfig kisConfig;
    private final StringRedisTemplate redisTemplate;
    private final WebClient oAuthWebClient;

    public KisAuthService(KisConfig kisConfig,
                          StringRedisTemplate redisTemplate,
                          @Qualifier("kisOAuthWebClient") WebClient oAuthWebClient) {
        this.kisConfig = kisConfig;
        this.redisTemplate = redisTemplate;
        this.oAuthWebClient = oAuthWebClient;
    }

    private String getFromCache(String key) {
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.warn("Redis unavailable, using local cache for key={}", key);
            return localCache.get(key);
        }
    }

    private void setToCache(String key, String value, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(key, value, ttl);
        } catch (Exception e) {
            log.warn("Redis unavailable, using local cache for key={}", key);
            localCache.put(key, value);
        }
    }

    private void deleteFromCache(String key) {
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            localCache.remove(key);
        }
    }

    public synchronized String getAccessToken() {
        String token = getFromCache(REDIS_TOKEN_KEY);
        if (token != null && !token.isEmpty()) {
            String expireStr = getFromCache(REDIS_TOKEN_EXPIRE_KEY);
            if (expireStr != null) {
                long remaining = Long.parseLong(expireStr) - (System.currentTimeMillis() / 1000);
                if (remaining > 300) {
                    log.debug("Using cached KIS access token");
                    return token;
                }
            } else {
                return token;
            }
        }
        return doIssueAccessToken();
    }

    private String doIssueAccessToken() {
        log.info("Issuing new KIS access token...");

        KisTokenRequest request = new KisTokenRequest();
        request.setAppkey(kisConfig.getAppkey());
        request.setAppsecret(kisConfig.getAppsecret());

        KisTokenResponse response = oAuthWebClient
                .post()
                .uri("/oauth2/tokenP")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(errorBody -> Mono.error(new RuntimeException("KIS Token issuance failed: " + errorBody))))
                .bodyToMono(KisTokenResponse.class)
                .block();

        if (response == null || response.getAccess_token() == null) {
            throw new RuntimeException("KIS access token response is empty");
        }

        String token = "Bearer " + response.getAccess_token();
        long expiresIn = response.getExpires_in() != null ? response.getExpires_in() : 86400L;

        long redisTtl = Math.max(expiresIn - 300, 60);
        setToCache(REDIS_TOKEN_KEY, token, Duration.ofSeconds(redisTtl));
        setToCache(REDIS_TOKEN_EXPIRE_KEY,
                String.valueOf(System.currentTimeMillis() / 1000 + expiresIn), Duration.ofSeconds(redisTtl));

        log.info("KIS access token issued successfully, expiresIn={}s", expiresIn);
        return token;
    }

    public String issueAccessToken() {
        return doIssueAccessToken();
    }

    public synchronized String issueWebSocketKey() {
        String cachedKey = getFromCache(REDIS_WS_KEY);
        if (cachedKey != null && !cachedKey.isEmpty()) {
            log.debug("Using cached KIS WebSocket approval key");
            return cachedKey;
        }

        log.info("Issuing KIS WebSocket approval key...");

        KisWebSocketKeyRequest request = new KisWebSocketKeyRequest();
        request.setAppkey(kisConfig.getAppkey());
        request.setSecretkey(kisConfig.getAppsecret());

        KisWebSocketKeyResponse response = oAuthWebClient
                .post()
                .uri("/oauth2/Approval")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(errorBody -> Mono.error(new RuntimeException("KIS WebSocket key issuance failed: " + errorBody))))
                .bodyToMono(KisWebSocketKeyResponse.class)
                .block();

        if (response == null || response.getApproval_key() == null) {
            throw new RuntimeException("KIS WebSocket key response is empty");
        }

        setToCache(REDIS_WS_KEY, response.getApproval_key(), WS_KEY_TTL);
        log.info("KIS WebSocket approval key issued and cached successfully");
        return response.getApproval_key();
    }

    public void revokeToken() {
        String token = getFromCache(REDIS_TOKEN_KEY);
        if (token == null || token.isEmpty()) {
            log.warn("No cached token to revoke");
            return;
        }
        deleteFromCache(REDIS_TOKEN_KEY);
        deleteFromCache(REDIS_TOKEN_EXPIRE_KEY);
        log.info("KIS access token revoked from cache");
    }
}