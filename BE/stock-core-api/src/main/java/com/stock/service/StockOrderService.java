package com.stock.service;

import com.stock.config.KisConfig;
import com.stock.infrastructure.client.KisApiClient;
import com.stock.infrastructure.dto.kis.OrderRequest;
import com.stock.infrastructure.dto.kis.OrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StockOrderService {

    private final KisApiClient kisApiClient;
    private final KisConfig kisConfig;

    public OrderResponse buy(String stockCode, int quantity, int price) {
        OrderRequest request = OrderRequest.forMockBuy(
                kisConfig.getAccountNo(),
                kisConfig.getAccountProductCode(),
                stockCode,
                quantity,
                price
        );
        return kisApiClient.buyStock(request);
    }

    public OrderResponse sell(String stockCode, int quantity, int price) {
        OrderRequest request = OrderRequest.forMockSell(
                kisConfig.getAccountNo(),
                kisConfig.getAccountProductCode(),
                stockCode,
                quantity,
                price
        );
        return kisApiClient.sellStock(request);
    }
}
