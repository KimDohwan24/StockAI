package com.stock.service;

import com.stock.config.KisConfig;
import com.stock.domain.entity.User;
import com.stock.domain.portfolio.Portfolio;
import com.stock.domain.portfolio.PortfolioRepository;
import com.stock.domain.repository.UserRepository;
import com.stock.domain.stock.StockMaster;
import com.stock.domain.stock.StockMasterRepository;
import com.stock.infrastructure.client.KisApiClient;
import com.stock.infrastructure.dto.kis.OrderRequest;
import com.stock.infrastructure.dto.kis.OrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StockOrderService {

    private final KisApiClient kisApiClient;
    private final KisConfig kisConfig;
    private final UserRepository userRepository;
    private final PortfolioRepository portfolioRepository;
    private final StockMasterRepository stockMasterRepository;

    @Transactional
    public OrderResponse buy(String email, String stockCode, int quantity, int price) {
        // 1. Fetch User and calculate order amount
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));
        double orderAmount = (double) price * quantity;

        if (user.getCashBalance() < orderAmount) {
            throw new IllegalArgumentException("잔액이 부족합니다. (현재 주문 금액: " + (long) orderAmount + "원, 잔액: " + (long) user.getCashBalance() + "원)");
        }

        // 2. Perform external KIS Mock Order call
        OrderRequest request = OrderRequest.forMockBuy(
                kisConfig.getAccountNo(),
                kisConfig.getAccountProductCode(),
                stockCode,
                quantity,
                price
        );
        OrderResponse response = kisApiClient.buyStock(request);

        // 3. Deduct cash balance and update/create local holding
        user.setCashBalance(user.getCashBalance() - orderAmount);
        userRepository.save(user);

        Portfolio holding = portfolioRepository.findByUserIdAndTicker(user.getId(), stockCode).orElse(null);
        if (holding != null) {
            int newQty = holding.getQuantity() + quantity;
            double newAvg = ((holding.getAvgPrice() * holding.getQuantity()) + (price * quantity)) / newQty;
            holding.setQuantity(newQty);
            holding.setAvgPrice(newAvg);
            portfolioRepository.save(holding);
        } else {
            String stockName = stockMasterRepository.findByStockCode(stockCode)
                    .map(StockMaster::getName)
                    .orElse(stockCode);
            Portfolio newHolding = new Portfolio(user.getId(), stockCode, stockName, quantity, price, null);
            portfolioRepository.save(newHolding);
        }

        return response;
    }

    @Transactional
    public OrderResponse sell(String email, String stockCode, int quantity, int price) {
        // 1. Fetch User and check existing holding quantity
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));
        Portfolio holding = portfolioRepository.findByUserIdAndTicker(user.getId(), stockCode)
                .orElseThrow(() -> new IllegalArgumentException("보유 중인 주식이 아닙니다: " + stockCode));

        if (holding.getQuantity() < quantity) {
            throw new IllegalArgumentException("보유 수량이 부족합니다. (보유 수량: " + holding.getQuantity() + "주, 매도 요청: " + quantity + "주)");
        }

        // 2. Perform external KIS Mock Order call
        OrderRequest request = OrderRequest.forMockSell(
                kisConfig.getAccountNo(),
                kisConfig.getAccountProductCode(),
                stockCode,
                quantity,
                price
        );
        OrderResponse response = kisApiClient.sellStock(request);

        // 3. Increase cash balance and update/remove local holding
        double sellAmount = (double) price * quantity;
        user.setCashBalance(user.getCashBalance() + sellAmount);
        userRepository.save(user);

        if (holding.getQuantity() == quantity) {
            portfolioRepository.delete(holding);
        } else {
            holding.setQuantity(holding.getQuantity() - quantity);
            portfolioRepository.save(holding);
        }

        return response;
    }
}
