package com.stock.service;

import com.stock.infrastructure.client.KisApiClient;
import com.stock.infrastructure.dto.kis.DailyPriceItem;
import com.stock.infrastructure.dto.kis.MinutePriceItem;
import com.stock.infrastructure.dto.kis.StockPriceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StockPriceService {

    private final KisApiClient kisApiClient;

    public StockPriceResponse getCurrentPrice(String stockCode) {
        return kisApiClient.getStockPrice(stockCode);
    }

    public List<DailyPriceItem> getDailyPrices(String stockCode, String period, String startDate, String endDate) {
        return kisApiClient.getDailyPrices(stockCode, period, startDate, endDate);
    }

    public List<MinutePriceItem> getMinutePrices(String stockCode) {
        return kisApiClient.getMinutePrices(stockCode);
    }
}
