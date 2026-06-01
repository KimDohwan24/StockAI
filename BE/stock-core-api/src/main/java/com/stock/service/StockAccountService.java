package com.stock.service;

import com.stock.infrastructure.client.KisApiClient;
import com.stock.infrastructure.dto.kis.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StockAccountService {

    private final KisApiClient kisApiClient;

    @Cacheable(value = "accountBalance", key = "'balance'")
    public BalanceResponse getBalanceFull() {
        return kisApiClient.getBalance();
    }

    public List<BalanceItem> getBalance() {
        return getBalanceFull().getOutput1();
    }

    public BalanceSummary getBalanceSummary() {
        List<BalanceSummary> output2 = getBalanceFull().getOutput2();
        if (output2 == null || output2.isEmpty()) {
            return new BalanceSummary();
        }
        return output2.get(0);
    }

    public List<RealizedProfitItem> getRealizedProfit() {
        KisApiResponse<List<RealizedProfitItem>> response = kisApiClient.getRealizedProfit();
        return response.getOutput1() != null ? response.getOutput1() : response.getOutput();
    }

    public BuyingPowerResponse getBuyingPower(String stockCode) {
        return kisApiClient.getBuyingPower(stockCode);
    }
}