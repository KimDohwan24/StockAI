package com.stock.service;

import com.stock.controller.dto.AdminAiStatusResponse;
import com.stock.controller.dto.HoldingResponse;
import com.stock.controller.dto.PortfolioResponse;
import com.stock.controller.dto.UserProfileResponse;
import com.stock.domain.favorite.FavoriteStock;
import com.stock.domain.favorite.FavoriteStockRepository;
import com.stock.domain.basket.BasketRepository;
import com.stock.domain.portfolio.Portfolio;
import com.stock.domain.portfolio.PortfolioRepository;
import com.stock.domain.repository.OrderHistoryRepository;
import com.stock.domain.repository.UserRepository;
import com.stock.infrastructure.client.AiServerClient;
import com.stock.domain.entity.User;
import com.stock.infrastructure.client.KisApiClient;
import com.stock.config.KisConfig;
import com.stock.infrastructure.dto.kis.BalanceResponse;
import com.stock.infrastructure.dto.kis.BalanceSummary;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Map;

import com.stock.domain.stock.StockMasterRepository;
import com.stock.domain.overseas.OverseasStockMasterRepository;
import com.stock.domain.notification.Notification;
import com.stock.domain.notification.NotificationRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final PortfolioService portfolioService;
    private final OrderHistoryRepository orderHistoryRepository;
    private final PortfolioRepository portfolioRepository;
    private final FavoriteStockRepository favoriteStockRepository;
    private final StringRedisTemplate redisTemplate;
    private final AiServerClient aiServerClient;
    private final BasketRepository basketRepository;
    private final StockMasterRepository stockMasterRepository;
    private final OverseasStockMasterRepository overseasStockMasterRepository;
    private final StockOrderService stockOrderService;
    private final StockPriceService stockPriceService;
    private final KisApiClient kisApiClient;
    private final KisConfig kisConfig;
    private final NotificationRepository notificationRepository;




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

                var orderHistory = orderHistoryRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                        .filter(o -> !o.getTicker().equalsIgnoreCase("HY") && o.getQuantity() < 2147483647 && o.getQuantity() > 0)
                        .toList();

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
                if (user.isMockOrderEnabled()) {
                    try {
                        BalanceResponse balResp = kisApiClient.getBalance();
                        if (balResp != null && balResp.getOutput2() != null) {
                            double prvsRcdl = Double.parseDouble(balResp.getOutput2().getPrvs_rcdl_excc_amt());
                            user.setCashBalance(prvsRcdl);
                            user.setInitialBalance(prvsRcdl);
                        }
                    } catch (Exception e) {
                        log.error("Failed to sync cash balance after KIS reset for user={}", email, e);
                    }
                    user.setAiTradingEnabled(false);
                    userRepository.save(user);
                } else {
                    user.setInitialBalance(100000000.0);
                    user.setCashBalance(100000000.0);
                    user.setAiTradingEnabled(true);
                    user.setMockOrderEnabled(false);
                    userRepository.save(user);
                }

                // Delete portfolios
                var portfolios = portfolioRepository.findByUserId(user.getId());
                portfolioRepository.deleteAll(portfolios);

                // Delete order histories
                var orderHistories = orderHistoryRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
                orderHistoryRepository.deleteAll(orderHistories);

                // Delete reservation purchases (BasketItems)
                var basketItems = basketRepository.findAllByUserId(user.getId());
                basketRepository.deleteAll(basketItems);

                // Delete notifications
                notificationRepository.deleteAllByUserId(user.getId());
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
        log.info("Starting Naver News sync and AI analysis refresh for dynamic stocks...");

        // 1. Gather dynamic stocks from portfolios and favorites
        Set<String> domesticStocks = new HashSet<>();
        Set<String> overseasStocks = new HashSet<>();

        List<Portfolio> allPortfolios = portfolioRepository.findAll();
        List<FavoriteStock> allFavorites = favoriteStockRepository.findAll();

        for (Portfolio p : allPortfolios) {
            String ticker = p.getTicker();
            if (isDomestic(ticker)) {
                domesticStocks.add(ticker);
            } else {
                overseasStocks.add(ticker);
            }
        }

        for (FavoriteStock f : allFavorites) {
            String code = f.getStockCode();
            if (isDomestic(code)) {
                domesticStocks.add(code);
            } else {
                overseasStocks.add(code);
            }
        }

        // Fallback if no stocks are registered
        if (domesticStocks.isEmpty() && overseasStocks.isEmpty()) {
            log.info("No user-registered stocks found. Using all stocks from DB as fallback.");
            stockMasterRepository.findAll().forEach(s -> domesticStocks.add(s.getStockCode()));
            overseasStockMasterRepository.findAll().forEach(o -> overseasStocks.add(o.getTicker()));
        }

        // 2. Clear individual stock analysis caches (using pattern matching to clear all models)
        for (String stockCode : domesticStocks) {
            try {
                Set<String> keys = redisTemplate.keys("ai::analysis::" + stockCode + "*");
                if (keys != null && !keys.isEmpty()) {
                    redisTemplate.delete(keys);
                }
            } catch (Exception e) {
                log.error("Failed to delete cache keys for domestic stockCode={}: {}", stockCode, e.getMessage());
            }
        }
        for (String stockCode : overseasStocks) {
            try {
                Set<String> keys = redisTemplate.keys("ai::analysis::" + stockCode + "*");
                if (keys != null && !keys.isEmpty()) {
                    redisTemplate.delete(keys);
                }
            } catch (Exception e) {
                log.error("Failed to delete cache keys for overseas stockCode={}: {}", stockCode, e.getMessage());
            }
        }

        // Clear dashboard caches
        redisTemplate.delete("ai::dashboard::domestic");
        redisTemplate.delete("ai::dashboard::overseas");

        int count = 0;

        // 3. Fetch new analysis for each stock code to populate the cache
        for (String stockCode : domesticStocks) {
            try {
                aiServerClient.getAiAnalysis(stockCode).block();
                count++;
            } catch (Exception e) {
                log.error("Failed to sync news/analysis for domestic stock={}: {}", stockCode, e.getMessage());
            }
        }
        for (String stockCode : overseasStocks) {
            try {
                aiServerClient.getAiAnalysis(stockCode).block();
                count++;
            } catch (Exception e) {
                log.error("Failed to sync news/analysis for overseas stock={}: {}", stockCode, e.getMessage());
            }
        }

        // 4. Rebuild dashboard recommendations
        try {
            aiServerClient.getDashboardRecommendations("domestic").block();
            aiServerClient.getDashboardRecommendations("overseas").block();
        } catch (Exception e) {
            log.error("Failed to rebuild dashboard recommendations cache: {}", e.getMessage());
        }

        log.info("Naver News sync complete. Successfully refreshed {} stocks dynamically.", count);
        return count;
    }

    private boolean isDomestic(String code) {
        return code != null && code.matches("\\d+");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSystemStatus() {
        long domesticCount = stockMasterRepository.count();
        long overseasCount = overseasStockMasterRepository.count();
        return Map.of(
            "domesticStockCount", domesticCount,
            "overseasStockCount", overseasCount,
            "isDomesticFallback", domesticCount <= 50,
            "isOverseasFallback", false
        );
    }

    @Transactional
    public void resetUserReservations(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            var basketItems = basketRepository.findAllByUserId(user.getId());
            basketRepository.deleteAll(basketItems);
            log.info("Successfully reset reservations (basket items) for user: {}", email);
        });
    }

    public void sellAllHoldings(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));
        
        List<Portfolio> holdings = portfolioRepository.findByUserId(user.getId());
        if (holdings.isEmpty()) {
            log.info("No holdings found for user {} to sell.", email);
            return;
        }

        for (Portfolio h : holdings) {
            try {
                int currentPrice = 0;
                try {
                    var priceResp = stockPriceService.getCurrentPrice(h.getTicker());
                    if (priceResp != null && priceResp.getStck_prpr() != null) {
                        currentPrice = Integer.parseInt(priceResp.getStck_prpr().trim());
                    }
                } catch (Exception e) {
                    log.error("Failed to fetch live price for {} to sell all: {}", h.getTicker(), e.getMessage());
                }

                if (currentPrice <= 0) {
                    currentPrice = (int) h.getAvgPrice();
                }

                stockOrderService.sell(email, h.getTicker(), h.getQuantity(), currentPrice, "ADMIN", "관리자에 의한 자산 전액 매도");
                log.info("Successfully sold all shares for user={} stock={} qty={} price={}", 
                        email, h.getTicker(), h.getQuantity(), currentPrice);
                
                // 한투 모의투자 초당 API 요청 제한(EGW00201) 방지를 위해 1.6초 대기 (더욱 안전하게 늘림)
                try { Thread.sleep(1600); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            } catch (Exception e) {
                log.error("Failed to execute automatic sell all for user={} stock={}: {}. Continuing with remaining stocks.", 
                        email, h.getTicker(), e.getMessage());
                // 오류가 발생하더라도 루프가 중단되거나 트랜잭션 전체가 롤백되지 않도록 방지하고, 2.5초 충분히 대기 후 진행
                try { Thread.sleep(2500); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            }
        }
    }

    public Map<String, Object> getKisMockBalance() {
        try {
            BalanceResponse response = kisApiClient.getBalance();
            if (response == null || response.getOutput2() == null) {
                return Map.of(
                    "success", false,
                    "error", "KIS API returned empty balance data."
                );
            }
            BalanceSummary summary = response.getOutput2();
            
            String mockCano = (kisConfig.getMock() != null && kisConfig.getMock().getAccount() != null
                    && kisConfig.getMock().getAccount().getCano() != null)
                    ? kisConfig.getMock().getAccount().getCano()
                    : kisConfig.getAccountNo();

            return Map.of(
                "success", true,
                "cano", mockCano != null ? mockCano : "",
                "totalBalance", summary.getDnca_tot_amt() != null ? Double.parseDouble(summary.getDnca_tot_amt()) : 0.0,
                "nxdyExccAmt", summary.getNxdy_excc_amt() != null ? Double.parseDouble(summary.getNxdy_excc_amt()) : 0.0,
                "prvsRcdlExccAmt", summary.getPrvs_rcdl_excc_amt() != null ? Double.parseDouble(summary.getPrvs_rcdl_excc_amt()) : 0.0,
                "thdtBuyAmt", summary.getThdt_buy_amt() != null ? Double.parseDouble(summary.getThdt_buy_amt()) : 0.0,
                "sctsEvluAmt", summary.getScts_evlu_amt() != null ? Double.parseDouble(summary.getScts_evlu_amt()) : 0.0,
                "totEvluAmt", summary.getTot_evlu_amt() != null ? Double.parseDouble(summary.getTot_evlu_amt()) : 0.0
            );
        } catch (Exception e) {
            log.error("Failed to query KIS Mock Balance in admin dashboard: {}", e.getMessage());
            return Map.of(
                "success", false,
                "error", e.getMessage()
            );
        }
    }

    @Transactional
    @CacheEvict(value = "accountBalance", allEntries = true)
    public void sellAllKisMockHoldings() {
        // 1. KIS 모의투자 계좌의 실제 보유 종목들을 조회합니다.
        BalanceResponse response = kisApiClient.getBalance();

        // 2. 조회된 모든 보유 종목을 시장가(0)로 전량 매도 주문을 전송하여 즉시 청산합니다.
        if (response != null && response.getOutput1() != null && !response.getOutput1().isEmpty()) {
            for (com.stock.infrastructure.dto.kis.BalanceItem item : response.getOutput1()) {
                String stockCode = item.getPdno();
                int qty = Integer.parseInt(item.getHldg_qty());
                if (qty <= 0) continue;

                try {
                    String mockCano = (kisConfig.getMock() != null && kisConfig.getMock().getAccount() != null
                            && kisConfig.getMock().getAccount().getCano() != null
                            && !kisConfig.getMock().getAccount().getCano().trim().isEmpty())
                            ? kisConfig.getMock().getAccount().getCano()
                            : kisConfig.getAccountNo();
                    String mockAcntPrdtCd = (kisConfig.getMock() != null && kisConfig.getMock().getAccount() != null
                            && kisConfig.getMock().getAccount().getAcntPrdtCd() != null
                            && !kisConfig.getMock().getAccount().getAcntPrdtCd().trim().isEmpty())
                            ? kisConfig.getMock().getAccount().getAcntPrdtCd()
                            : kisConfig.getAccountProductCode();

                    com.stock.infrastructure.dto.kis.OrderRequest request = com.stock.infrastructure.dto.kis.OrderRequest.forMockSell(
                            mockCano,
                            mockAcntPrdtCd,
                            stockCode,
                            qty,
                            0 // 항상 시장가(0) 매도로 체결 안정성 보장
                    );
                    var orderResp = kisApiClient.sellStock(request);
                    log.info("Successfully sold all real shares in KIS mock account for stock={} qty={}. Response: {}", 
                            stockCode, qty, orderResp);
                    
                    // 한투 모의투자 초당 API 요청 제한(EGW00201) 방지를 위해 1.6초 대기 (더욱 안전하게 늘림)
                    try { Thread.sleep(1600); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                } catch (Exception e) {
                    log.error("Failed to sell real KIS mock stock={}: {}. Continuing with remaining stocks.", stockCode, e.getMessage());
                    // 개별 오류 발생 시 멈추지 않고 2.5초 대기 후 다음 종목 매도 시도
                    try { Thread.sleep(2500); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                }
            }
        } else {
            log.info("No real holdings found in KIS Mock Account to sell.");
        }

        // 3. 로컬 DB 상에 보존되어 있는 모든 KIS 에이전트 계정들의 포트폴리오를 비우고 잔고를 실제 한투 계좌 예수금 잔고로 동기화합니다.
        List<String> kisEmails = List.of("kis_high@stockai.com", "kis_medium@stockai.com", "kis_low@stockai.com");
        for (String email : kisEmails) {
            userRepository.findByEmail(email).ifPresent(user -> {
                try {
                    BalanceResponse balResp = kisApiClient.getBalance();
                    if (balResp != null && balResp.getOutput2() != null) {
                        double prvsRcdl = Double.parseDouble(balResp.getOutput2().getPrvs_rcdl_excc_amt());
                        user.setCashBalance(prvsRcdl);
                        user.setInitialBalance(prvsRcdl);
                    }
                } catch (Exception e) {
                    log.error("Failed to sync cash balance after KIS sell-all for user={}", email, e);
                }
                userRepository.save(user);

                var portfolios = portfolioRepository.findByUserId(user.getId());
                portfolioRepository.deleteAll(portfolios);

                // 주문 내역 및 예약 주문 비우기
                var orderHistories = orderHistoryRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
                orderHistoryRepository.deleteAll(orderHistories);

                var basketItems = basketRepository.findAllByUserId(user.getId());
                basketRepository.deleteAll(basketItems);

                notificationRepository.deleteAllByUserId(user.getId());

                // 알림 생성
                notificationRepository.save(new Notification(user.getId(), "관리자에 의해 한투 연동 계좌의 모든 보유 주식이 전액 매도(청산)되었습니다."));
            });
        }
    }

    @Transactional
    public void syncKisAccount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));

        if (!user.isMockOrderEnabled()) {
            throw new IllegalArgumentException("한투 연동 모드가 아닌 사용자입니다: " + email);
        }

        // 1. KIS 모의투자 계좌의 실시간 원장 잔고 및 보유 종목 조회
        BalanceResponse response = kisApiClient.getBalance();
        if (response == null) {
            throw new RuntimeException("한투 API 호출에 실패했습니다.");
        }

        // 2. KIS 계좌의 예수금 및 총 평가금액 파싱
        double cashBalance = 0.0;
        double initialBalance = 100000000.0; // 기본값 1억
        if (response.getOutput2() != null) {
            BalanceSummary summary = response.getOutput2();
            cashBalance = summary.getPrvs_rcdl_excc_amt() != null ? Double.parseDouble(summary.getPrvs_rcdl_excc_amt()) : 0.0;
            double totEvlu = summary.getTot_evlu_amt() != null ? Double.parseDouble(summary.getTot_evlu_amt()) : 0.0;
            initialBalance = totEvlu > 0 ? totEvlu : cashBalance;
        }

        // 3. 로컬 DB 유저 잔고 동기화
        user.setCashBalance(cashBalance);
        user.setInitialBalance(initialBalance);
        userRepository.save(user);

        // 4. 로컬 DB 보유 주식(Portfolio) 동기화
        // 기존 포트폴리오 비우기
        var oldPortfolios = portfolioRepository.findByUserId(user.getId());
        portfolioRepository.deleteAll(oldPortfolios);

        // KIS 실제 보유 주식들을 유저 포트폴리오로 복사/삽입
        if (response.getOutput1() != null) {
            for (com.stock.infrastructure.dto.kis.BalanceItem item : response.getOutput1()) {
                String stockCode = item.getPdno();
                int qty = Integer.parseInt(item.getHldg_qty());
                if (qty <= 0) continue;

                double avgPrice = Double.parseDouble(item.getPchs_avg_pric());
                String stockName = item.getPrdt_name() != null ? item.getPrdt_name() : stockCode;

                Portfolio portfolio = new Portfolio(user.getId(), stockCode, stockName, qty, avgPrice, null);
                portfolioRepository.save(portfolio);
            }
        }

        log.info("Successfully synced KIS account state to DB for user={}", email);
    }
}


