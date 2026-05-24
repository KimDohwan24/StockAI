package com.stock.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stock.config.KisConfig;
import com.stock.infrastructure.client.AiServerClient;
import com.stock.infrastructure.dto.ai.DashboardRecommendationsResponse;
import com.stock.infrastructure.dto.ai.StockAiAnalysisResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
public class AiRecommendationController {

    private final AiServerClient aiServerClient;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final KisConfig kisConfig;

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getSystemConfig() {
        return ResponseEntity.ok(Map.of("mockOrderEnabled", kisConfig.isMockOrderEnabled()));
    }

    @GetMapping("/{stockCode}/ai-analysis")
    public Mono<ResponseEntity<StockAiAnalysisResponse>> getAiAnalysis(@PathVariable String stockCode) {
        String cacheKey = "ai::analysis::" + stockCode;

        return Mono.fromCallable(() -> Optional.ofNullable(redisTemplate.opsForValue().get(cacheKey)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> {
                    if (optional.isPresent()) {
                        try {
                            StockAiAnalysisResponse cachedResponse = objectMapper.readValue(optional.get(), StockAiAnalysisResponse.class);
                            log.debug("Cache hit for ai-analysis stockCode={}", stockCode);
                            return Mono.just(ResponseEntity.ok()
                                    .header("X-Cache", "HIT")
                                    .body(cachedResponse));
                        } catch (JsonProcessingException e) {
                            log.error("Failed to parse cached ai-analysis json", e);
                        }
                    }
                    
                    return aiServerClient.getAiAnalysis(stockCode)
                            .flatMap(response -> Mono.fromRunnable(() -> {
                                try {
                                    String json = objectMapper.writeValueAsString(response);
                                    long ttl = isMarketHours() ? 120 : 3600; // 장중 2분, 장외 1시간
                                    redisTemplate.opsForValue().set(cacheKey, json, Duration.ofSeconds(ttl));
                                } catch (JsonProcessingException e) {
                                    log.error("Failed to serialize ai-analysis to json", e);
                                }
                            }).subscribeOn(Schedulers.boundedElastic())
                            .thenReturn(ResponseEntity.ok()
                                    .header("X-Cache", "MISS")
                                    .body(response)));
                });
    }

    @GetMapping("/recommendations")
    public Mono<ResponseEntity<DashboardRecommendationsResponse>> getRecommendations(
            @RequestParam(defaultValue = "domestic") String market) {
        String cacheKey = "ai::dashboard::" + market.toLowerCase();

        return Mono.fromCallable(() -> Optional.ofNullable(redisTemplate.opsForValue().get(cacheKey)))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(optional -> {
                    if (optional.isPresent()) {
                        try {
                            DashboardRecommendationsResponse cachedResponse = objectMapper.readValue(optional.get(), DashboardRecommendationsResponse.class);
                            log.debug("Cache hit for recommendations market={}", market);
                            return Mono.just(ResponseEntity.ok()
                                    .header("X-Cache", "HIT")
                                    .body(cachedResponse));
                        } catch (JsonProcessingException e) {
                            log.error("Failed to parse cached recommendations json", e);
                        }
                    }

                    return aiServerClient.getDashboardRecommendations(market)
                            .flatMap(response -> Mono.fromRunnable(() -> {
                                try {
                                    String json = objectMapper.writeValueAsString(response);
                                    redisTemplate.opsForValue().set(cacheKey, json, Duration.ofMinutes(30)); // 30분 캐싱
                                } catch (JsonProcessingException e) {
                                    log.error("Failed to serialize recommendations to json", e);
                                }
                            }).subscribeOn(Schedulers.boundedElastic())
                            .thenReturn(ResponseEntity.ok()
                                    .header("X-Cache", "MISS")
                                    .body(response)));
                });
    }

    private boolean isMarketHours() {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        DayOfWeek day = now.getDayOfWeek();
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
            return false;
        }
        LocalTime time = now.toLocalTime();
        return !time.isBefore(LocalTime.of(9, 0)) && !time.isAfter(LocalTime.of(15, 30));
    }
}
