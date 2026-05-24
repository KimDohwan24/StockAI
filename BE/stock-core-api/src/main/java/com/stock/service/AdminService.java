package com.stock.service;

import com.stock.controller.dto.AdminAiStatusResponse;
import com.stock.controller.dto.HoldingResponse;
import com.stock.controller.dto.PortfolioResponse;
import com.stock.controller.dto.UserProfileResponse;
import com.stock.domain.portfolio.PortfolioRepository;
import com.stock.domain.repository.OrderHistoryRepository;
import com.stock.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final PortfolioService portfolioService;
    private final OrderHistoryRepository orderHistoryRepository;
    private final PortfolioRepository portfolioRepository;


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
}


