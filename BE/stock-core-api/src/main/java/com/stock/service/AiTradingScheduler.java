package com.stock.service;

import com.stock.domain.entity.User;
import com.stock.domain.portfolio.Portfolio;
import com.stock.domain.portfolio.PortfolioRepository;
import com.stock.domain.repository.UserRepository;
import com.stock.infrastructure.client.AiServerClient;
import com.stock.infrastructure.dto.ai.StockAiAnalysisResponse;
import com.stock.infrastructure.dto.kis.StockPriceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiTradingScheduler {

    private final UserRepository userRepository;
    private final PortfolioRepository portfolioRepository;
    private final StockOrderService stockOrderService;
    private final StockPriceService stockPriceService;
    private final AiServerClient aiServerClient;

    private static final List<String> TARGET_STOCKS = List.of(
            "005930", "000660", "035420", "035720", "005380", "373220", "068270", "000270"
    );

    @Scheduled(fixedDelayString = "${app.ai-trading.interval-ms:60000}")
    public void runAiTradingTick() {
        log.info("Starting AI Autotrading tick execution...");
        List<User> activeUsers = userRepository.findAllByAiTradingEnabled(true);
        if (activeUsers.isEmpty()) {
            log.info("No active users with AI autotrading enabled.");
            return;
        }



        // 1. Gather current prices and AI sentiment signals
        Map<String, StockAiAnalysisResponse> aiSignals = new HashMap<>();
        Map<String, Integer> stockPrices = new HashMap<>();

        for (String stockCode : TARGET_STOCKS) {
            try {
                StockAiAnalysisResponse analysis = aiServerClient.getAiAnalysis(stockCode).block();
                if (analysis != null) aiSignals.put(stockCode, analysis);

                StockPriceResponse priceResp = stockPriceService.getCurrentPrice(stockCode);
                if (priceResp != null && priceResp.getStck_prpr() != null) {
                    stockPrices.put(stockCode, Integer.parseInt(priceResp.getStck_prpr().trim()));
                }
            } catch (Exception e) {
                log.error("Error gathering AI data/price for stockCode={}: {}", stockCode, e.getMessage());
            }
        }

        // 2. Perform actions for each active user
        for (User user : activeUsers) {
            try {
                if (user.isMockOrderEnabled() && !isMarketHours()) {
                    log.info("Market is closed. Skipping AI autotrading tick for User={}", user.getEmail());
                    continue;
                }
                // Fetch holdings
                List<Portfolio> holdings = portfolioRepository.findByUserId(user.getId());
                double stockValue = 0;
                for (Portfolio h : holdings) {
                    Integer currentPrice = stockPrices.get(h.getTicker());
                    if (currentPrice != null) {
                        stockValue += currentPrice * h.getQuantity();
                    } else {
                        stockValue += h.getAvgPrice() * h.getQuantity();
                    }
                }
                double totalAssets = user.getCashBalance() + stockValue;

                // Risk profiles variables
                double targetAllocationPct; // max stock allocation limit
                double singleStockCapPct;    // max allocation limit per stock
                double buyAmtPct = user.getAiTradingAllocationRatio(); // buy size per trade (user custom ratio)
                double stopLossPct;          // stop-loss threshold

                switch (user.getRiskProfile()) {
                    case HIGH:
                        targetAllocationPct = 0.80;
                        singleStockCapPct = 0.30;
                        stopLossPct = -50.0;
                        break;
                    case LOW:
                        targetAllocationPct = 0.20;
                        singleStockCapPct = 0.05;
                        stopLossPct = -3.0;
                        break;
                    case MEDIUM:
                    default:
                        targetAllocationPct = 0.50;
                        singleStockCapPct = 0.15;
                        stopLossPct = -15.0;
                        break;
                }

                // 3. Stop-loss execution
                Set<String> soldTickers = new HashSet<>();
                for (Portfolio h : holdings) {
                    Integer price = stockPrices.get(h.getTicker());
                    if (price == null) continue;

                    double profitRate = ((price - h.getAvgPrice()) / h.getAvgPrice()) * 100;
                    if (profitRate <= stopLossPct) {
                        log.info("AI Stop-Loss Triggered: User={}, Stock={}, profitRate={}%, Executing SELL", 
                                user.getEmail(), h.getTicker(), String.format("%.2f", profitRate));
                        String stopLossReason = String.format("[AI 신호: 손절매(Stop-Loss)] 주가가 설정된 손절 기준 비율(Stop-loss: %.1f%%) 이하로 하락하여 원금 보존을 위해 전량 매도를 자동 실행했습니다. (현재 수익률: %.2f%%)", stopLossPct, profitRate);
                        try {
                            stockOrderService.sell(user.getEmail(), h.getTicker(), h.getQuantity(), price, "AI", stopLossReason);
                            stockValue -= price * h.getQuantity();
                            soldTickers.add(h.getTicker());
                        } catch (Exception e) {
                            log.error("AI Stop-Loss execution failed for User={}, Stock={}: {}", user.getEmail(), h.getTicker(), e.getMessage());
                        }
                    }
                }

                // Recalculate total assets if stop loss occurred
                totalAssets = user.getCashBalance() + stockValue;

                // 4. Trade signals execution
                for (String stockCode : TARGET_STOCKS) {
                    if (soldTickers.contains(stockCode)) continue;

                    StockAiAnalysisResponse analysis = aiSignals.get(stockCode);
                    Integer price = stockPrices.get(stockCode);
                    if (analysis == null || price == null) continue;

                    String signal = analysis.getSignal();
                    Portfolio holding = holdings.stream()
                            .filter(h -> h.getTicker().equals(stockCode))
                            .findFirst()
                            .orElse(null);

                    try {
                        if ("BUY".equals(signal)) {
                            // Total allocation check
                            if (stockValue >= totalAssets * targetAllocationPct) continue;

                            // Single stock allocation check
                            double currentHoldingValue = holding != null ? price * holding.getQuantity() : 0;
                            if (currentHoldingValue >= totalAssets * singleStockCapPct) continue;

                            // Calculate buy qty
                            double buyAmountMoney = totalAssets * buyAmtPct;
                            int buyQty = (int) (buyAmountMoney / price);
                            if (buyQty < 1) buyQty = 1;

                            // Check and adjust for cap limits
                            double newExpectedValue = currentHoldingValue + (price * buyQty);
                            if (newExpectedValue > totalAssets * singleStockCapPct) {
                                buyQty = (int) ((totalAssets * singleStockCapPct - currentHoldingValue) / price);
                            }

                            if (buyQty <= 0) continue;

                            double totalCost = (double) price * buyQty;
                            if (user.getCashBalance() >= totalCost) {
                                log.info("AI Auto-Buy: User={}, Stock={}, Qty={}, Price={}, TotalCost={}", 
                                        user.getEmail(), stockCode, buyQty, price, totalCost);
                                stockOrderService.buy(user.getEmail(), stockCode, buyQty, price, "AI", analysis.getReason());
                                stockValue += totalCost;
                            }
                        } else if ("SELL".equals(signal)) {
                            if (holding != null && holding.getQuantity() > 0) {
                                log.info("AI Auto-Sell (Signal): User={}, Stock={}, Qty={}, Price={}", 
                                        user.getEmail(), stockCode, holding.getQuantity(), price);
                                stockOrderService.sell(user.getEmail(), stockCode, holding.getQuantity(), price, "AI", analysis.getReason());
                            }
                        }
                    } catch (Exception e) {
                        log.error("AI Auto-Trade execution failed for User={}, Stock={}, Signal={}: {}", 
                                user.getEmail(), stockCode, signal, e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.error("Error running AI autotrading for User {}: {}", user.getEmail(), e.getMessage());
            }
        }
    }

    private boolean isMarketHours() {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        DayOfWeek day = now.getDayOfWeek();
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) return false;
        LocalTime time = now.toLocalTime();
        return !time.isBefore(LocalTime.of(9, 0)) && !time.isAfter(LocalTime.of(15, 30));
    }
}
