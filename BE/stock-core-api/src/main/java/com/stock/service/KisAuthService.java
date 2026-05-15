package com.stock.service;

import com.stock.config.KisConfig;
import com.stock.infrastructure.dto.kis.KisTokenRequest;
import com.stock.infrastructure.dto.kis.KisTokenResponse;
import com.stock.infrastructure.dto.kis.KisWebSocketKeyRequest;
import com.stock.infrastructure.dto.kis.KisWebSocketKeyResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class KisAuthService {

    private static final String REDIS_TOKEN_KEY = "kis:access_token";
    private static final String REDIS_TOKEN_EXPIRE_KEY = "kis:access_token:expires_in";

    // Redis fallback: in-memory cache when Redis is unavailable
    private static final ConcurrentHashMap<String, String> localCache = new ConcurrentHashMap<>();

    private final KisConfig kisConfig;
    private final StringRedisTemplate redisTemplate;

    private WebClient getOAuthClient() {
        return WebClient.builder()
                .baseUrl(kisConfig.getOauthUrl())
                .build();
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

    /**
     * 접근토큰을 반환합니다. 캐시에 있으면 사용하고, 없으면 발급받습니다.
     */
    public String getAccessToken() {
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
        return issueAccessToken();
    }

    /**
     * KIS OAuth 서버에서 접근토큰을 새로 발급받고 캐시에 저장합니다.
     */
    public String issueAccessToken() {
        log.info("Issuing new KIS access token...");

        KisTokenRequest request = new KisTokenRequest();
        request.setAppkey(kisConfig.getAppkey());
        request.setAppsecret(kisConfig.getAppsecret());

        KisTokenResponse response = getOAuthClient()
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

    /**
     * 실시간 (웹소켓) 접속키를 발급받습니다.
     */
    public String issueWebSocketKey() {
        log.info("Issuing KIS WebSocket approval key...");

        KisWebSocketKeyRequest request = new KisWebSocketKeyRequest();
        request.setAppkey(kisConfig.getAppkey());
        request.setSecretkey(kisConfig.getAppsecret());

        KisWebSocketKeyResponse response = getOAuthClient()
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

        log.info("KIS WebSocket approval key issued successfully");
        return response.getApproval_key();
    }

    /**
     * 강제로 토큰을 폐기하고 캐시에서 삭제합니다.
     */
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
