package com.stock.service;

import com.stock.domain.overseas.OverseasStockMaster;
import com.stock.domain.overseas.OverseasStockMasterRepository;
import com.stock.domain.stock.StockMaster;
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
    private final OverseasStockMasterRepository overseasStockMasterRepository;

    @Cacheable(value = "stocks::price", key = "#stockCode")
    public StockPriceResponse getCurrentPrice(String stockCode) {
        StockPriceResponse response = kisApiClient.getStockPrice(stockCode);
        if (response != null) {
            String name = response.getHts_kor_isnm();
            if (name == null || name.trim().isEmpty() || name.equals(stockCode)) {
                String resolvedName = stockMasterRepository.findByStockCode(stockCode)
                        .map(StockMaster::getName)
                        .or(() -> overseasStockMasterRepository.findFirstByTicker(stockCode)
                                .map(OverseasStockMaster::getName))
                        .orElse(stockCode);
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