package com.stock.service;

import com.stock.controller.dto.OverseasPriceBatchRequest;
import com.stock.domain.overseas.ExchangeCode;
import com.stock.domain.overseas.OverseasStockMaster;
import com.stock.domain.overseas.OverseasStockMasterRepository;
import com.stock.infrastructure.dto.kis.OverseasStockPriceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OverseasStockPriceBatchService {

    private static final int MAX_BATCH_SIZE = 50;

    private final OverseasStockMasterRepository overseasStockMasterRepository;
    private final CacheManager cacheManager;

    public OverseasBatchResult getCurrentPrices(List<OverseasPriceBatchRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("조회할 종목이 필요합니다.");
        }

        Map<String, OverseasStockPriceResponse> allResults = new HashMap<>();
        int totalCacheHitCount = 0;
        int totalDbHitCount = 0;

        for (int i = 0; i < requests.size(); i += MAX_BATCH_SIZE) {
            List<OverseasPriceBatchRequest> chunk = requests.subList(i, Math.min(i + MAX_BATCH_SIZE, requests.size()));
            OverseasBatchResult chunkResult = processChunk(chunk);
            allResults.putAll(chunkResult.prices());
            totalCacheHitCount += chunkResult.cacheHitCount();
            totalDbHitCount += chunkResult.dbHitCount();
        }

        return new OverseasBatchResult(allResults, totalCacheHitCount, totalDbHitCount, requests.size());
    }

    private OverseasBatchResult processChunk(List<OverseasPriceBatchRequest> requests) {
        Map<String, OverseasStockPriceResponse> result = new HashMap<>();
        Cache cache = cacheManager.getCache("overseas::price");
        int cacheHitCount = 0;

        List<OverseasPriceBatchRequest> cacheMissRequests = new ArrayList<>();

        for (OverseasPriceBatchRequest req : requests) {
            String key = req.ticker() + "_" + req.exchangeCode();
            if (cache != null) {
                OverseasStockPriceResponse cached = cache.get(key, OverseasStockPriceResponse.class);
                if (cached != null) {
                    result.put(key, cached);
                    cacheHitCount++;
                    continue;
                }
            }
            cacheMissRequests.add(req);
        }

        int dbHitCount = 0;
        if (!cacheMissRequests.isEmpty()) {
            Map<String, OverseasStockPriceResponse> dbPrices = fetchFromDb(cacheMissRequests);

            for (OverseasPriceBatchRequest req : cacheMissRequests) {
                String key = req.ticker() + "_" + req.exchangeCode();
                OverseasStockPriceResponse dbPrice = dbPrices.get(key);
                if (dbPrice != null) {
                    result.put(key, dbPrice);
                    dbHitCount++;
                    if (cache != null) {
                        cache.put(key, dbPrice);
                    }
                }
            }
        }

        return new OverseasBatchResult(result, cacheHitCount, dbHitCount, requests.size());
    }

    private Map<String, OverseasStockPriceResponse> fetchFromDb(List<OverseasPriceBatchRequest> requests) {
        try {
            Map<String, OverseasStockPriceResponse> results = new HashMap<>();
            Map<String, OverseasPriceBatchRequest> requestMap = new HashMap<>();
            for (OverseasPriceBatchRequest req : requests) {
                requestMap.put(req.ticker() + "_" + req.exchangeCode(), req);
            }

            List<String> tickers = requests.stream().map(OverseasPriceBatchRequest::ticker).distinct().toList();
            Set<ExchangeCode> exchangeCodes = requests.stream()
                    .map(req -> ExchangeCode.valueOf(req.exchangeCode()))
                    .collect(Collectors.toSet());

            List<OverseasStockMaster> stocks = overseasStockMasterRepository
                    .findAllByTickerInAndExchangeCodeIn(tickers, exchangeCodes);

            for (OverseasStockMaster stock : stocks) {
                if (stock.getCurrentPrice() != null) {
                    String key = stock.getTicker() + "_" + stock.getExchangeCode().name();
                    results.put(key, toResponse(stock));
                }
            }
            return results;
        } catch (Exception e) {
            log.warn("Failed to fetch overseas prices from DB: {}", e.getMessage());
            return Map.of();
        }
    }

    private OverseasStockPriceResponse toResponse(OverseasStockMaster stock) {
        OverseasStockPriceResponse response = new OverseasStockPriceResponse();
        response.setLast(stock.getCurrentPrice());
        response.setPrdy_vs(stock.getChangeValue());
        response.setPrdy_clss_code(stock.getChangeSign());
        response.setOvrs_nic_prdy_vs(stock.getChangeRate());
        response.setTr_vol(stock.getVolume());
        return response;
    }

    public record OverseasBatchResult(Map<String, OverseasStockPriceResponse> prices,
                                      int cacheHitCount, int dbHitCount, int totalCount) {
        public String getCacheStatus() {
            if (cacheHitCount == totalCount) return "HIT";
            if (cacheHitCount > 0) return "PARTIAL";
            return "MISS";
        }
    }
}