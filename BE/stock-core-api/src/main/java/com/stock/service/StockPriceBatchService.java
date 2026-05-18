package com.stock.service;

import com.stock.infrastructure.dto.kis.StockPriceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockPriceBatchService {

    private static final int MAX_BATCH_SIZE = 50;

    private final StockPriceService stockPriceService;
    private final CacheManager cacheManager;

    public BatchResult getCurrentPrices(List<String> stockCodes) {
        if (stockCodes == null || stockCodes.isEmpty()) {
            throw new IllegalArgumentException("조회할 종목 코드가 필요합니다.");
        }

        Map<String, StockPriceResponse> allResults = new HashMap<>();
        int totalCacheHitCount = 0;
        int totalDbHitCount = 0;

        for (int i = 0; i < stockCodes.size(); i += MAX_BATCH_SIZE) {
            List<String> chunk = stockCodes.subList(i, Math.min(i + MAX_BATCH_SIZE, stockCodes.size()));
            BatchResult chunkResult = processChunk(chunk);
            allResults.putAll(chunkResult.prices());
            totalCacheHitCount += chunkResult.cacheHitCount();
            totalDbHitCount += chunkResult.dbHitCount();
        }

        return new BatchResult(allResults, totalCacheHitCount, totalDbHitCount, stockCodes.size());
    }

    private BatchResult processChunk(List<String> stockCodes) {
        Map<String, StockPriceResponse> result = new HashMap<>();
        Cache cache = cacheManager.getCache("stocks::price");
        int cacheHitCount = 0;

        List<String> cacheMissCodes = new ArrayList<>();

        for (String stockCode : stockCodes) {
            if (cache != null) {
                StockPriceResponse cached = cache.get(stockCode, StockPriceResponse.class);
                if (cached != null) {
                    result.put(stockCode, cached);
                    cacheHitCount++;
                    continue;
                }
            }
            cacheMissCodes.add(stockCode);
        }

        int dbHitCount = 0;
        if (!cacheMissCodes.isEmpty()) {
            for (String stockCode : cacheMissCodes) {
                try {
                    StockPriceResponse price = stockPriceService.getCurrentPrice(stockCode);
                    if (price != null && price.getError() == null) {
                        result.put(stockCode, price);
                        dbHitCount++;
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch price for {}: {}", stockCode, e.getMessage());
                }
            }
        }

        return new BatchResult(result, cacheHitCount, dbHitCount, stockCodes.size());
    }

    public record BatchResult(Map<String, StockPriceResponse> prices, int cacheHitCount, int dbHitCount, int totalCount) {
        public String getCacheStatus() {
            if (cacheHitCount == totalCount) return "HIT";
            if (cacheHitCount > 0) return "PARTIAL";
            return "MISS";
        }
    }
}