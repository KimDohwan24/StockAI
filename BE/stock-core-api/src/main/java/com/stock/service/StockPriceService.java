package com.stock.service;

import com.stock.domain.stock.StockMasterRepository;
import com.stock.infrastructure.client.KisApiClient;
import com.stock.infrastructure.dto.kis.DailyPriceItem;
import com.stock.infrastructure.dto.kis.MinutePriceItem;
import com.stock.infrastructure.dto.kis.OverseasDailyPriceItem;
import com.stock.infrastructure.dto.kis.StockPriceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StockPriceService {

    private final KisApiClient kisApiClient;
    private final StockMasterRepository stockMasterRepository;

    private static final java.util.Map<String, String> STOCK_NAME_FALLBACK = java.util.Map.ofEntries(
            java.util.Map.entry("005930", "삼성전자"),
            java.util.Map.entry("000660", "SK하이닉스"),
            java.util.Map.entry("035420", "네이버"),
            java.util.Map.entry("035720", "카카오"),
            java.util.Map.entry("005380", "현대차"),
            java.util.Map.entry("373220", "LG에너지솔루션"),
            java.util.Map.entry("068270", "셀트리온"),
            java.util.Map.entry("000270", "기아"),
            java.util.Map.entry("AAPL", "애플"),
            java.util.Map.entry("TSLA", "테슬라"),
            java.util.Map.entry("MSFT", "마이크로소프트"),
            java.util.Map.entry("NVDA", "엔비디아"),
            java.util.Map.entry("AMZN", "아마존"),
            java.util.Map.entry("GOOGL", "구글"),
            java.util.Map.entry("META", "메타"),
            java.util.Map.entry("NFLX", "넷플릭스")
    );

    @Cacheable(value = "stocks::price", key = "#stockCode")
    public StockPriceResponse getCurrentPrice(String stockCode) {
        StockPriceResponse response = kisApiClient.getStockPrice(stockCode);
        if (response != null) {
            String name = response.getHts_kor_isnm();
            if (name == null || name.trim().isEmpty() || name.equals(stockCode)) {
                String resolvedName = stockMasterRepository.findByStockCode(stockCode)
                        .map(com.stock.domain.stock.StockMaster::getName)
                        .orElseGet(() -> STOCK_NAME_FALLBACK.getOrDefault(stockCode, stockCode));
                response.setHts_kor_isnm(resolvedName);
            }
        }
        return response;
    }

    @Cacheable(value = "stocks::daily", key = "#stockCode + '-' + #period + '-' + #startDate + '-' + #endDate")
    public List<DailyPriceItem> getDailyPrices(String stockCode, String period, String startDate, String endDate) {
        return kisApiClient.getDailyPrices(stockCode, period, startDate, endDate);
    }

    @Cacheable(value = "stocks::minute", key = "#stockCode")
    public List<MinutePriceItem> getMinutePrices(String stockCode) {
        return kisApiClient.getMinutePrices(stockCode);
    }

    @Cacheable(value = "overseas::daily", key = "#ticker + '-' + #exchangeCode + '-' + #period + '-' + #startDate + '-' + #endDate")
    public List<OverseasDailyPriceItem> getOverseasDailyPrices(String ticker, String exchangeCode,
                                                                 String period, String startDate, String endDate) {
        return kisApiClient.getOverseasDailyPrices(ticker, exchangeCode, period, startDate, endDate);
    }
}