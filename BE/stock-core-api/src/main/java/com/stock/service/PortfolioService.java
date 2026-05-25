package com.stock.service;

import com.stock.controller.dto.HoldingResponse;
import com.stock.controller.dto.PortfolioResponse;
import com.stock.domain.entity.User;
import com.stock.domain.portfolio.Portfolio;
import com.stock.domain.portfolio.PortfolioRepository;
import com.stock.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final UserRepository userRepository;
    private final StockPriceService stockPriceService;
    private final OverseasStockPriceService overseasStockPriceService;

    @Transactional(readOnly = true)
    public PortfolioResponse getPortfolioSummary(String email) {
        User user = getUser(email);
        List<Portfolio> holdings = portfolioRepository.findByUserId(user.getId());

        double totalHoldingsValue = 0.0;
        for (Portfolio p : holdings) {
            double currentPrice = getCurrentPrice(p);
            totalHoldingsValue += currentPrice * p.getQuantity();
        }

        double totalAssetValue = user.getCashBalance() + totalHoldingsValue;

        return new PortfolioResponse(
                user.getId(),
                user.getId(),
                user.getInitialBalance(),
                user.getCashBalance(),
                totalAssetValue,
                user.getCreatedAt()
        );
    }

    @Transactional
    public PortfolioResponse createPortfolio(String email, double initialBalance) {
        User user = getUser(email);
        user.setInitialBalance(initialBalance);
        user.setCashBalance(initialBalance);
        userRepository.save(user);

        // Reset holdings on onboarding
        List<Portfolio> holdings = portfolioRepository.findByUserId(user.getId());
        portfolioRepository.deleteAll(holdings);

        return new PortfolioResponse(
                user.getId(),
                user.getId(),
                initialBalance,
                initialBalance,
                initialBalance,
                user.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<HoldingResponse> getHoldings(String email) {
        User user = getUser(email);
        List<Portfolio> holdings = portfolioRepository.findByUserId(user.getId());

        return holdings.stream().map(p -> {
            double currentPrice = getCurrentPrice(p);
            double profitLoss = (currentPrice - p.getAvgPrice()) * p.getQuantity();
            double profitRate = p.getAvgPrice() > 0 ? ((currentPrice - p.getAvgPrice()) / p.getAvgPrice()) * 100.0 : 0.0;

            return new HoldingResponse(
                    p.getId(),
                    p.getTicker(),
                    p.getStockName(),
                    p.getQuantity(),
                    p.getAvgPrice(),
                    currentPrice,
                    profitLoss,
                    profitRate
            );
        }).toList();
    }

    private double getCurrentPrice(Portfolio p) {
        String ticker = p.getTicker();
        String exchangeCode = p.getExchangeCode();

        if (exchangeCode != null && !exchangeCode.trim().isEmpty()) {
            // Overseas Stock
            try {
                var priceResponse = overseasStockPriceService.getOverseasPrice(ticker, exchangeCode);
                if (priceResponse != null && priceResponse.getLast() != null) {
                    return Double.parseDouble(priceResponse.getLast());
                }
            } catch (Exception e) {
                log.warn("Failed to get current price for overseas stock {}: {}", ticker, e.getMessage());
            }
        } else {
            // Domestic Stock
            try {
                var priceResponse = stockPriceService.getCurrentPrice(ticker);
                if (priceResponse != null && priceResponse.getStck_prpr() != null) {
                    return Double.parseDouble(priceResponse.getStck_prpr());
                }
            } catch (Exception e) {
                log.warn("Failed to get current price for domestic stock {}: {}", ticker, e.getMessage());
            }
        }
        return p.getAvgPrice(); // Fallback
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));
    }
}