package com.stock.service;

import com.stock.controller.dto.AdminAiStatusResponse;
import com.stock.controller.dto.HoldingResponse;
import com.stock.controller.dto.PortfolioResponse;
import com.stock.controller.dto.UserProfileResponse;
import com.stock.domain.portfolio.PortfolioRepository;
import com.stock.domain.repository.OrderHistoryRepository;
import com.stock.domain.repository.UserRepository;
import com.stock.infrastructure.client.AiServerClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final PortfolioService portfolioService;
    private final OrderHistoryRepository orderHistoryRepository;
    private final PortfolioRepository portfolioRepository;
    private final StringRedisTemplate redisTemplate;
    private final AiServerClient aiServerClient;

    private static final List<String> DOMESTIC_STOCKS = List.of(
            "005930", "000660", "035420", "035720", "005380", "373220", "068270", "000270"
    );

    private static final List<String> OVERSEAS_STOCKS = List.of(
            "AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "NFLX"
    );


    @Transactional(readOnly = true)
    public List<AdminAiStatusResponse> getAiMonitoringData() {
        List<String> aiEmails = List.of(
                "high@stockai.com", "medium@stockai.com", "low@stockai.com",
                "kis_high@stockai.com", "kis_medium@stockai.com", "kis_low@stockai.com"
        );
        List<AdminAiStatusResponse> results = new ArrayList<>();

        for (String email : aiEmails) {
            userRepository.findByEmail(email).ifPresent(user -> {
                UserProfileResponse profile = new UserProfileResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getName(),
                        user.getRole().name(),
                        user.getCreatedAt(),
                        user.getInitialBalance(),
                        user.getCashBalance(),
                        user.isAiTradingEnabled(),
                        user.getRiskProfile().name(),
                        user.getAiTradingAllocationRatio(),
                        user.isMockOrderEnabled()
                );

                PortfolioResponse portfolio = null;
                try {
                    portfolio = portfolioService.getPortfolioSummary(email);
                } catch (Exception e) {
                    // Fallback in case portfolio doesn't exist
                    portfolio = new PortfolioResponse(
                            user.getId(),
                            user.getId(),
                            user.getInitialBalance(),
                            user.getCashBalance(),
                            user.getCashBalance(), // total asset = cash if no holdings
                            user.getCreatedAt()
                    );
                }

                List<HoldingResponse> holdings = List.of();
                try {
                    holdings = portfolioService.getHoldings(email);
                } catch (Exception e) {
                    // Ignore
                }

                var orderHistory = orderHistoryRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());

                results.add(new AdminAiStatusResponse(profile, portfolio, holdings, orderHistory));
            });
        }

        return results;
    }

    @Transactional
    public void resetAiAccounts() {
        List<String> aiEmails = List.of(
                "high@stockai.com", "medium@stockai.com", "low@stockai.com",
                "kis_high@stockai.com", "kis_medium@stockai.com", "kis_low@stockai.com"
        );
        for (String email : aiEmails) {
            userRepository.findByEmail(email).ifPresent(user -> {
                user.setInitialBalance(100000000.0);
                user.setCashBalance(100000000.0);
                user.setAiTradingEnabled(true);
                userRepository.save(user);

                // Delete portfolios
                var portfolios = portfolioRepository.findByUserId(user.getId());
                portfolioRepository.deleteAll(portfolios);

                // Delete order histories
                var orderHistories = orderHistoryRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
                orderHistoryRepository.deleteAll(orderHistories);
            });
        }
    }

    @Transactional
    public void toggleUserMockOrder(String email, boolean enabled) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setMockOrderEnabled(enabled);
            userRepository.save(user);
        });
    }

    @Transactional
    public void toggleUserAiTrading(String email, boolean enabled) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setAiTradingEnabled(enabled);
            userRepository.save(user);
        });
    }

    @Transactional
    public void updateUserInitialBalance(String email, double balance) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setInitialBalance(balance);
            user.setCashBalance(balance);
            userRepository.save(user);
        });
    }

    @Transactional
    public int syncNaverNews() {
        log.info("Starting Naver News sync and AI analysis refresh...");
        
        // 1. Clear individual stock analysis caches
        for (String stockCode : DOMESTIC_STOCKS) {
            redisTemplate.delete("ai::analysis::" + stockCode);
        }
        for (String stockCode : OVERSEAS_STOCKS) {
            redisTemplate.delete("ai::analysis::" + stockCode);
        }
        
        // Clear dashboard caches
        redisTemplate.delete("ai::dashboard::domestic");
        redisTemplate.delete("ai::dashboard::overseas");

        int count = 0;

        // 2. Fetch new analysis for each stock code to populate the cache
        for (String stockCode : DOMESTIC_STOCKS) {
            try {
                aiServerClient.getAiAnalysis(stockCode).block();
                count++;
            } catch (Exception e) {
                log.error("Failed to sync news/analysis for domestic stock={}: {}", stockCode, e.getMessage());
            }
        }
        for (String stockCode : OVERSEAS_STOCKS) {
            try {
                aiServerClient.getAiAnalysis(stockCode).block();
                count++;
            } catch (Exception e) {
                log.error("Failed to sync news/analysis for overseas stock={}: {}", stockCode, e.getMessage());
            }
        }

        // 3. Rebuild dashboard recommendations
        try {
            aiServerClient.getDashboardRecommendations("domestic").block();
            aiServerClient.getDashboardRecommendations("overseas").block();
        } catch (Exception e) {
            log.error("Failed to rebuild dashboard recommendations cache: {}", e.getMessage());
        }

        log.info("Naver News sync complete. Successfully refreshed {} stocks.", count);
        return count;
    }
}


