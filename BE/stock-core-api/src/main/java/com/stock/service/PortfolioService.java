package com.stock.service;

import com.stock.controller.dto.PortfolioRequest;
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

    public List<PortfolioResponse> getPortfolios(String email) {
        Long userId = getUserId(email);
        return portfolioRepository.findByUserId(userId).stream()
                .map(p -> new PortfolioResponse(p.getId(), p.getTicker(), p.getStockName(),
                        p.getQuantity(), p.getAvgPrice(), p.getExchangeCode()))
                .toList();
    }

    @Transactional
    public PortfolioResponse addPortfolio(String email, PortfolioRequest request) {
        Long userId = getUserId(email);
        Portfolio portfolio = new Portfolio(userId, request.getTicker(), request.getStockName(),
                request.getQuantity(), request.getAvgPrice(), request.getExchangeCode());
        Portfolio saved = portfolioRepository.save(portfolio);
        return new PortfolioResponse(saved.getId(), saved.getTicker(), saved.getStockName(),
                saved.getQuantity(), saved.getAvgPrice(), saved.getExchangeCode());
    }

    @Transactional
    public PortfolioResponse updatePortfolio(String email, String ticker, PortfolioRequest request) {
        Long userId = getUserId(email);
        Portfolio portfolio = portfolioRepository.findByUserIdAndTicker(userId, ticker)
                .orElseThrow(() -> new IllegalArgumentException("해당 종목이 포트폴리오에 없습니다: " + ticker));
        portfolio.update(request.getQuantity(), request.getAvgPrice());
        return new PortfolioResponse(portfolio.getId(), portfolio.getTicker(), portfolio.getStockName(),
                portfolio.getQuantity(), portfolio.getAvgPrice(), portfolio.getExchangeCode());
    }

    @Transactional
    public void removePortfolio(String email, String ticker) {
        Long userId = getUserId(email);
        portfolioRepository.deleteByUserIdAndTicker(userId, ticker);
    }

    private Long getUserId(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));
        return user.getId();
    }
}