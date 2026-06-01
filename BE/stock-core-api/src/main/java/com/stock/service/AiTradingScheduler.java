package com.stock.service;

import com.stock.domain.entity.User;
import com.stock.domain.favorite.FavoriteStock;
import com.stock.domain.favorite.FavoriteStockRepository;
import com.stock.domain.portfolio.Portfolio;
import com.stock.domain.portfolio.PortfolioRepository;
import com.stock.domain.repository.UserRepository;
import com.stock.domain.stock.StockMaster;
import com.stock.domain.stock.StockMasterRepository;
import com.stock.domain.overseas.OverseasStockMaster;
import com.stock.domain.overseas.OverseasStockMasterRepository;
import com.stock.domain.basket.BasketItem;
import com.stock.domain.basket.BasketRepository;
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
import java.util.ArrayList;
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
    private final FavoriteStockRepository favoriteStockRepository;
    private final StockOrderService stockOrderService;
    private final StockPriceService stockPriceService;
    private final AiServerClient aiServerClient;
    private final StockMasterRepository stockMasterRepository;
    private final OverseasStockMasterRepository overseasStockMasterRepository;
    private final BasketRepository basketRepository;

    @Scheduled(fixedDelayString = "${app.ai-trading.interval-ms:60000}")
    public void runAiTradingTick() {
        log.info("Starting AI Autotrading tick execution with dynamic news-based stocks...");
        List<User> activeUsers = userRepository.findAllByAiTradingEnabled(true);
        if (activeUsers.isEmpty()) {
            log.info("No active users with AI autotrading enabled.");
            return;
        }

        // 1. Fetch recent news from AI server
        List<com.stock.infrastructure.dto.ai.StockNewsItem> recentNews = new ArrayList<>();
        try {
            recentNews = aiServerClient.searchNews("특징주", 30);
            log.info("Fetched {} news articles for autotrading scan.", recentNews.size());
        } catch (Exception e) {
            log.error("Failed to fetch news for autotrading scan: {}", e.getMessage());
        }

        // 2. Fetch all registered stock masters to match mentions
        List<StockMaster> domesticMasters = stockMasterRepository.findAll();
        List<OverseasStockMaster> overseasMasters = overseasStockMasterRepository.findAll();

        Map<String, String> stockNameMap = new HashMap<>(); // stockCode/ticker -> name
        Set<String> newsMentionedStocks = new HashSet<>();

        for (StockMaster s : domesticMasters) {
            stockNameMap.put(s.getStockCode(), s.getName());
        }
        for (OverseasStockMaster o : overseasMasters) {
            stockNameMap.put(o.getTicker(), o.getName());
        }

        // 3. Scan news for stock mentions
        if (!recentNews.isEmpty()) {
            for (com.stock.infrastructure.dto.ai.StockNewsItem news : recentNews) {
                String title = news.getTitle() != null ? news.getTitle() : "";
                String desc = news.getDescription() != null ? news.getDescription() : "";
                String searchTarget = (title + " " + desc).toLowerCase();

                // Match domestic stocks
                for (StockMaster s : domesticMasters) {
                    String sName = s.getName().toLowerCase();
                    String sCode = s.getStockCode();
                    if (searchTarget.contains(sName) || searchTarget.contains(sCode)) {
                        newsMentionedStocks.add(sCode);
                    }
                }
                // Match overseas stocks
                for (OverseasStockMaster o : overseasMasters) {
                    String oName = o.getName().toLowerCase();
                    String oTicker = o.getTicker().toLowerCase();
                    if (searchTarget.contains(oName)) {
                        newsMentionedStocks.add(o.getTicker());
                    } else {
                        // Check if oTicker matches as a whole word to prevent false positive matching on substrings (e.g. 'hy' in 'why')
                        if (searchTarget.matches(".*\\b" + java.util.regex.Pattern.quote(oTicker) + "\\b.*")) {
                            newsMentionedStocks.add(o.getTicker());
                        }
                    }
                }
            }
            log.info("Dynamically identified {} stocks in news: {}", newsMentionedStocks.size(), newsMentionedStocks);
        }

        // 4. Perform actions for each active user
        for (User user : activeUsers) {
            try {
                if (user.isMockOrderEnabled() && !isMarketHours()) {
                    log.info("Market is closed. Evaluating autotrading signals for mock-linked User={} to check for reservations...", user.getEmail());
                }

                // Gather holdings and favorites for this user
                List<Portfolio> holdings = portfolioRepository.findByUserId(user.getId());
                List<FavoriteStock> favorites = favoriteStockRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());

                // Build consolidated target stocks: (news-mentioned) + (user holdings) + (user favorites)
                Set<String> targetStocks = new HashSet<>(newsMentionedStocks);
                for (Portfolio h : holdings) {
                    targetStocks.add(h.getTicker());
                }
                for (FavoriteStock f : favorites) {
                    targetStocks.add(f.getStockCode());
                }

                // If completely empty, fallback to a small default list
                if (targetStocks.isEmpty()) {
                    targetStocks.addAll(List.of("005930", "000660"));
                }

                // Assign model based on user ID
                int modelIndex = (int) (Math.abs(user.getId()) % 5);
                List<String> freeModels = List.of(
                        "google/gemma-2-9b-it:free",
                        "meta-llama/llama-3-8b-instruct:free",
                        "qwen/qwen-2.5-7b-instruct:free",
                        "mistralai/mistral-7b-instruct:free",
                        "microsoft/phi-3-mini-128k-instruct:free" // Note: can use mistral or phi-3
                );
                // Correct model IDs
                List<String> actualFreeModels = List.of(
                        "google/gemma-2-9b-it:free",
                        "meta-llama/llama-3-8b-instruct:free",
                        "qwen/qwen-2.5-7b-instruct:free",
                        "mistralai/mistral-7b-instruct:free",
                        "microsoft/phi-3-mini-128k-instruct:free"
                );
                String assignedModel = actualFreeModels.get(modelIndex);
                log.info("User={} (ID={}) using AI Model: {} to evaluate {} stocks", 
                        user.getEmail(), user.getId(), assignedModel, targetStocks.size());

                // Gather current prices and AI signals specifically for this user and model
                Map<String, StockAiAnalysisResponse> aiSignals = new HashMap<>();
                Map<String, Integer> stockPrices = new HashMap<>();

                for (String stockCode : targetStocks) {
                    try {
                        String stockName = stockNameMap.get(stockCode);
                        StockAiAnalysisResponse analysis = aiServerClient.getAiAnalysis(stockCode, assignedModel, stockName).block();
                        if (analysis != null) {
                            aiSignals.put(stockCode, analysis);
                        }

                        StockPriceResponse priceResp = stockPriceService.getCurrentPrice(stockCode);
                        if (priceResp != null && priceResp.getStck_prpr() != null) {
                            stockPrices.put(stockCode, Integer.parseInt(priceResp.getStck_prpr().trim()));
                        }
                    } catch (Exception e) {
                        log.error("Error gathering AI data/price for User={}, stockCode={} using model={}: {}", 
                                user.getEmail(), stockCode, assignedModel, e.getMessage());
                    }
                }

                // Calculate stock value and total assets
                double stockValue = 0;
                for (Portfolio h : holdings) {
                    if (h.getTicker().equalsIgnoreCase("HY") || h.getQuantity() >= 2147483647 || h.getQuantity() <= 0) {
                        continue;
                    }
                    Integer currentPrice = stockPrices.get(h.getTicker());
                    if (currentPrice != null && currentPrice > 0) {
                        stockValue += currentPrice * h.getQuantity();
                    } else {
                        stockValue += h.getAvgPrice() * h.getQuantity();
                    }
                }
                double totalAssets = user.getCashBalance() + stockValue;

                // Risk profile variables
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

                // 2. Stop-loss execution
                Set<String> soldTickers = new HashSet<>();
                for (Portfolio h : holdings) {
                    if (h.getTicker().equalsIgnoreCase("HY") || h.getQuantity() >= 2147483647 || h.getQuantity() <= 0) {
                        continue;
                    }
                    Integer price = stockPrices.get(h.getTicker());
                    if (price == null || price <= 0) continue;

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

                // 3. Trade signals execution
                for (String stockCode : targetStocks) {
                    if (soldTickers.contains(stockCode)) continue;

                    StockAiAnalysisResponse analysis = aiSignals.get(stockCode);
                    Integer price = stockPrices.get(stockCode);
                    if (analysis == null || price == null || price <= 0) continue;

                    String signal = analysis.getSignal();
                    Portfolio holding = holdings.stream()
                            .filter(h -> h.getTicker().equals(stockCode))
                            .findFirst()
                            .orElse(null);

                    try {
                        if ("BUY".equals(signal)) {
                            // Total allocation check
                            if (stockValue >= totalAssets * targetAllocationPct) {
                                log.info("AI Skip BUY (Total Allocation Limit Exceeded): User={}, Stock={}, stockValue={}, Limit={}", 
                                        user.getEmail(), stockCode, stockValue, totalAssets * targetAllocationPct);
                                continue;
                            }

                            // Single stock allocation check
                            double currentHoldingValue = holding != null ? price * holding.getQuantity() : 0;
                            if (currentHoldingValue >= totalAssets * singleStockCapPct) {
                                log.info("AI Skip BUY (Single Stock Cap Exceeded): User={}, Stock={}, currentHoldingValue={}, CapLimit={}", 
                                        user.getEmail(), stockCode, currentHoldingValue, totalAssets * singleStockCapPct);
                                continue;
                            }

                            // Calculate buy qty
                            double buyAmountMoney = totalAssets * buyAmtPct;
                            int buyQty = (int) (buyAmountMoney / price);
                            if (buyQty < 1) {
                                log.info("AI Qty Adjustment: Calculated buyQty is 0 (buyAmountMoney={}, price={}). Force set to 1.", buyAmountMoney, price);
                                buyQty = 1;
                            }

                            // Check and adjust for cap limits
                            double newExpectedValue = currentHoldingValue + (price * buyQty);
                            if (newExpectedValue > totalAssets * singleStockCapPct) {
                                int oldQty = buyQty;
                                buyQty = (int) ((totalAssets * singleStockCapPct - currentHoldingValue) / price);
                                log.info("AI Qty Adjusted for Cap limit: User={}, Stock={}, adjusted from {} to {} due to singleStockCapPct limit ({})", 
                                        user.getEmail(), stockCode, oldQty, buyQty, totalAssets * singleStockCapPct);
                            }

                            if (buyQty <= 0) {
                                log.info("AI Skip BUY (Qty <= 0 after adjustment): User={}, Stock={}, price={}", 
                                        user.getEmail(), stockCode, price);
                                continue;
                            }

                            double totalCost = (double) price * buyQty;
                            if (user.getCashBalance() < totalCost) {
                                log.info("AI Skip BUY (Insufficient Cash): User={}, Stock={}, CashBalance={}, Required={}", 
                                        user.getEmail(), stockCode, user.getCashBalance(), totalCost);
                            }
                            if (user.getCashBalance() >= totalCost) {
                                if (user.isMockOrderEnabled() && !isMarketHours()) {
                                    // 장외 시간대이므로 예약 매수로 등록
                                    if (!basketRepository.existsByUserIdAndStockCode(user.getId(), stockCode)) {
                                        String stockName = stockNameMap.get(stockCode);
                                        if (stockName == null) stockName = stockCode;
                                        BasketItem reservation = new BasketItem(
                                                user.getId(),
                                                stockCode,
                                                stockName,
                                                price,
                                                10,
                                                "BUY",
                                                true,
                                                buyQty
                                        );
                                        reservation.setActive(true);
                                        basketRepository.save(reservation);
                                        log.info("AI Auto-Reservation BUY (Outside Market Hours): User={}, Stock={}, Qty={}, TargetPrice={} using model={}", 
                                                user.getEmail(), stockCode, buyQty, price, assignedModel);
                                    }
                                } else {
                                    log.info("AI Auto-Buy: User={}, Stock={}, Qty={}, Price={}, TotalCost={} using model={}", 
                                            user.getEmail(), stockCode, buyQty, price, totalCost, assignedModel);
                                    stockOrderService.buy(user.getEmail(), stockCode, buyQty, price, "AI", analysis.getReason());
                                    stockValue += totalCost;
                                }
                            }
                        } else if ("SELL".equals(signal)) {
                            if (holding != null && holding.getQuantity() > 0) {
                                if (user.isMockOrderEnabled() && !isMarketHours()) {
                                    // 장외 시간대이므로 예약 매도로 등록
                                    if (!basketRepository.existsByUserIdAndStockCode(user.getId(), stockCode)) {
                                        String stockName = stockNameMap.get(stockCode);
                                        if (stockName == null) stockName = stockCode;
                                        BasketItem reservation = new BasketItem(
                                                user.getId(),
                                                stockCode,
                                                stockName,
                                                price,
                                                10,
                                                "SELL",
                                                true,
                                                holding.getQuantity()
                                        );
                                        reservation.setActive(true);
                                        basketRepository.save(reservation);
                                        log.info("AI Auto-Reservation SELL (Outside Market Hours): User={}, Stock={}, Qty={}, TargetPrice={} using model={}", 
                                                user.getEmail(), stockCode, holding.getQuantity(), price, assignedModel);
                                    }
                                } else {
                                    log.info("AI Auto-Sell (Signal): User={}, Stock={}, Qty={}, Price={} using model={}", 
                                            user.getEmail(), stockCode, holding.getQuantity(), price, assignedModel);
                                    stockOrderService.sell(user.getEmail(), stockCode, holding.getQuantity(), price, "AI", analysis.getReason());
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.error("AI Auto-Trade execution failed for User={}, Stock={}, Signal={} using model={}: {}", 
                                user.getEmail(), stockCode, signal, assignedModel, e.getMessage());
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
