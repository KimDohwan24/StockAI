package com.stock.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stock.config.KisConfig;
import com.stock.domain.favorite.FavoriteStockRepository;
import com.stock.domain.portfolio.PortfolioRepository;
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

import com.stock.domain.stock.StockMasterRepository;
import com.stock.domain.overseas.OverseasStockMasterRepository;

@Slf4j
@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
public class AiRecommendationController {

    private final AiServerClient aiServerClient;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final KisConfig kisConfig;
    private final PortfolioRepository portfolioRepository;
    private final FavoriteStockRepository favoriteStockRepository;
    private final StockMasterRepository stockMasterRepository;
    private final OverseasStockMasterRepository overseasStockMasterRepository;

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



    @GetMapping("/news")
    public Mono<ResponseEntity<List<StockNewsItem>>> getAggregatedNews() {
        return Mono.fromCallable(() -> {
            List<StockNewsItem> aggregatedNews = new ArrayList<>();
            
            // 1. Scan Redis for all dynamic cached keys (supports all models)
            java.util.Set<String> keys = redisTemplate.keys("ai::analysis::*");
            
            // 2. Gather dynamic target stocks from DB as fallback/filter
            java.util.Set<String> activeStockCodes = new java.util.HashSet<>();
            for (com.stock.domain.portfolio.Portfolio p : portfolioRepository.findAll()) {
                activeStockCodes.add(p.getTicker());
            }
            for (com.stock.domain.favorite.FavoriteStock f : favoriteStockRepository.findAll()) {
                activeStockCodes.add(f.getStockCode());
            }

            // Fallback default list if database is empty
            if (activeStockCodes.isEmpty()) {
                stockMasterRepository.findAll().forEach(s -> activeStockCodes.add(s.getStockCode()));
                overseasStockMasterRepository.findAll().forEach(o -> activeStockCodes.add(o.getTicker()));
            }

            java.util.Set<String> targetKeys = new java.util.HashSet<>();
            if (keys != null && !keys.isEmpty()) {
                targetKeys.addAll(keys);
            }

            // Make sure we explicitly search for standard key forms
            for (String stockCode : activeStockCodes) {
                targetKeys.add("ai::analysis::" + stockCode);
            }

            // Build dynamic stock name lookup from DB
            java.util.Map<String, String> dynamicStockNameMap = new java.util.HashMap<>();
            stockMasterRepository.findAll().forEach(s -> dynamicStockNameMap.put(s.getStockCode(), s.getName()));
            overseasStockMasterRepository.findAll().forEach(o -> dynamicStockNameMap.put(o.getTicker(), o.getName()));

            for (String cacheKey : targetKeys) {
                String cachedJson = redisTemplate.opsForValue().get(cacheKey);
                if (cachedJson != null) {
                    try {
                        StockAiAnalysisResponse response = objectMapper.readValue(cachedJson, StockAiAnalysisResponse.class);
                        if (response.getNews() != null) {
                            String[] parts = cacheKey.split("::");
                            String stockCode = parts.length > 2 ? parts[2] : "";
                            if (stockCode.isBlank()) continue;

                            String stockName = dynamicStockNameMap.getOrDefault(stockCode, stockCode);
                            for (StockNewsItem item : response.getNews()) {
                                item.setStockCode(stockCode);
                                item.setStockName(stockName);
                                aggregatedNews.add(item);
                            }
                        }
                    } catch (JsonProcessingException e) {
                        log.error("Failed to parse cached ai-analysis json for cacheKey={}", cacheKey, e);
                    }
                }
            }

            // Remove duplicate news to keep aggregator neat
            java.util.Set<String> seenNews = new java.util.HashSet<>();
            List<StockNewsItem> uniqueNews = new ArrayList<>();
            for (StockNewsItem item : aggregatedNews) {
                String uniqKey = item.getTitle() + "::" + item.getSource();
                if (!seenNews.contains(uniqKey)) {
                    seenNews.add(uniqKey);
                    uniqueNews.add(item);
                }
            }
            
            // Sort by pubDate descending
            uniqueNews.sort((a, b) -> {
                if (a.getPubDate() == null || b.getPubDate() == null) return 0;
                return b.getPubDate().compareTo(a.getPubDate());
            });
            
            return ResponseEntity.ok(uniqueNews);
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
