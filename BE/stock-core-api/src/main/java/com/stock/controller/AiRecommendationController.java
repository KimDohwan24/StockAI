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
import java.util.List;
import java.util.ArrayList;
import com.stock.infrastructure.dto.ai.StockNewsItem;

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

    private static final List<String> ALL_STOCKS = List.of(
            "005930", "000660", "035420", "035720", "005380", "373220", "068270", "000270",
            "AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "NFLX"
    );

    private static final Map<String, String> STOCK_NAME_MAP = Map.ofEntries(
            Map.entry("005930", "삼성전자"),
            Map.entry("000660", "SK하이닉스"),
            Map.entry("035420", "NAVER"),
            Map.entry("035720", "카카오"),
            Map.entry("005380", "현대차"),
            Map.entry("373220", "LG에너지솔루션"),
            Map.entry("068270", "셀트리온"),
            Map.entry("000270", "기아"),
            Map.entry("AAPL", "애플"),
            Map.entry("TSLA", "테슬라"),
            Map.entry("MSFT", "마이크로소프트"),
            Map.entry("NVDA", "엔비디아"),
            Map.entry("AMZN", "아마존"),
            Map.entry("GOOGL", "알파벳"),
            Map.entry("META", "메타"),
            Map.entry("NFLX", "넷플릭스")
    );

    @GetMapping("/news")
    public Mono<ResponseEntity<List<StockNewsItem>>> getAggregatedNews() {
        return Mono.fromCallable(() -> {
            List<StockNewsItem> aggregatedNews = new ArrayList<>();
            for (String stockCode : ALL_STOCKS) {
                String cacheKey = "ai::analysis::" + stockCode;
                String cachedJson = redisTemplate.opsForValue().get(cacheKey);
                if (cachedJson != null) {
                    try {
                        StockAiAnalysisResponse response = objectMapper.readValue(cachedJson, StockAiAnalysisResponse.class);
                        if (response.getNews() != null) {
                            String stockName = STOCK_NAME_MAP.getOrDefault(stockCode, stockCode);
                            for (StockNewsItem item : response.getNews()) {
                                item.setStockCode(stockCode);
                                item.setStockName(stockName);
                                aggregatedNews.add(item);
                            }
                        }
                    } catch (JsonProcessingException e) {
                        log.error("Failed to parse cached ai-analysis json for stockCode={}", stockCode, e);
                    }
                }
            }
            
            // Sort by pubDate descending (strings are sorted lexicographically, but usually pubDates have a fixed format or we can just try sorting)
            aggregatedNews.sort((a, b) -> {
                if (a.getPubDate() == null || b.getPubDate() == null) return 0;
                return b.getPubDate().compareTo(a.getPubDate());
            });
            
            return ResponseEntity.ok(aggregatedNews);
        }).subscribeOn(Schedulers.boundedElastic());
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
