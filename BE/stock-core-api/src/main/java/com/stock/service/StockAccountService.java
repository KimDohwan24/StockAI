package com.stock.service;

import com.stock.infrastructure.client.KisApiClient;
import com.stock.infrastructure.dto.kis.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StockAccountService {

    private final KisApiClient kisApiClient;

    public List<BalanceItem> getBalance() {
        BalanceResponse response = kisApiClient.getBalance();
        return response.getOutput1();
    }

    public BalanceSummary getBalanceSummary() {
        BalanceResponse response = kisApiClient.getBalance();
        return response.getOutput2();
    }

    public List<RealizedProfitItem> getRealizedProfit() {
        KisApiResponse<List<RealizedProfitItem>> response = kisApiClient.getRealizedProfit();
        return response.getOutput1() != null ? response.getOutput1() : response.getOutput();
    }

    public BuyingPowerResponse getBuyingPower(String stockCode) {
        return kisApiClient.getBuyingPower(stockCode);
    }
}
