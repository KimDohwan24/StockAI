package com.stock.service;

import com.stock.config.KisConfig;
import com.stock.domain.entity.User;
import com.stock.domain.order.OrderHistory;
import com.stock.domain.portfolio.Portfolio;
import com.stock.domain.portfolio.PortfolioRepository;
import com.stock.domain.repository.OrderHistoryRepository;
import com.stock.domain.repository.UserRepository;
import com.stock.domain.stock.StockMaster;
import com.stock.domain.stock.StockMasterRepository;
import com.stock.infrastructure.client.KisApiClient;
import com.stock.infrastructure.dto.kis.OrderRequest;
import com.stock.infrastructure.dto.kis.OrderResponse;
import com.stock.domain.notification.Notification;
import com.stock.domain.notification.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.stock.domain.overseas.OverseasStockMaster;
import com.stock.domain.overseas.OverseasStockMasterRepository;

@Service
@RequiredArgsConstructor
public class StockOrderService {

    private final KisApiClient kisApiClient;
    private final KisConfig kisConfig;
    private final UserRepository userRepository;
    private final PortfolioRepository portfolioRepository;
    private final StockMasterRepository stockMasterRepository;
    private final OrderHistoryRepository orderHistoryRepository;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final OverseasStockMasterRepository overseasStockMasterRepository;

    private String resolveStockName(String stockCode) {
        return stockMasterRepository.findByStockCode(stockCode)
                .map(StockMaster::getName)
                .or(() -> overseasStockMasterRepository.findFirstByTicker(stockCode)
                        .map(OverseasStockMaster::getName))
                .orElse(stockCode);
    }

    @Transactional
    public OrderResponse buy(String email, String stockCode, int quantity, int price, String orderedBy) {
        return buy(email, stockCode, quantity, price, orderedBy, null);
    }

    @Transactional
    public OrderResponse buy(String email, String stockCode, int quantity, int price, String orderedBy, String reason) {
        // 1. Fetch User and calculate order amount
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));
        double orderAmount = (double) price * quantity;

        if (user.getCashBalance() < orderAmount) {
            throw new IllegalArgumentException("잔액이 부족합니다. (현재 주문 금액: " + (long) orderAmount + "원, 잔액: " + (long) user.getCashBalance() + "원)");
        }

        // 2. Perform external KIS Mock Order call (conditional)
        OrderResponse response;
        if (user.isMockOrderEnabled()) {
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

            OrderRequest request = OrderRequest.forMockBuy(
                    mockCano,
                    mockAcntPrdtCd,
                    stockCode,
                    quantity,
                    price
            );
            response = kisApiClient.buyStock(request);
        } else {
            // 로컬 모의 매매 가상 응답 생성
            response = new OrderResponse();
            response.setKRX_FWDG_ORD_ORGNO("LOCAL");
            response.setODNO("L" + System.currentTimeMillis() + "_" + java.util.UUID.randomUUID().toString().substring(0, 4));
            response.setORD_TMD(java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HHmmss")));
        }

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
            String stockName = resolveStockName(stockCode);
            Portfolio newHolding = new Portfolio(user.getId(), stockCode, stockName, quantity, price, null);
            portfolioRepository.save(newHolding);
        }

        // 4. Save order history
        String stockName = resolveStockName(stockCode);
        orderHistoryRepository.save(new OrderHistory(user.getId(), stockCode, stockName, "BUY", quantity, price, orderedBy, reason));

        // 5. Save notification
        String buyMsg = String.format("%s (%s) %d주 매수 주문이 체결되었습니다. (단가: %,d원, 주문주체: %s)",
                stockName, stockCode, quantity, (long)price, orderedBy.equals("AI") ? "🤖 AI" : "사용자");
        notificationRepository.save(new Notification(user.getId(), buyMsg));

        // AI/User 매매 실시간 웹소켓 이벤트 발행
        messagingTemplate.convertAndSend("/topic/ai-trade-event", "AiTradeOccurred");

        return response;
    }

    @Transactional
    public OrderResponse sell(String email, String stockCode, int quantity, int price, String orderedBy) {
        return sell(email, stockCode, quantity, price, orderedBy, null);
    }

    @Transactional
    public OrderResponse sell(String email, String stockCode, int quantity, int price, String orderedBy, String reason) {
        // 1. Fetch User and check existing holding quantity
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));
        Portfolio holding = portfolioRepository.findByUserIdAndTicker(user.getId(), stockCode)
                .orElseThrow(() -> new IllegalArgumentException("보유 중인 주식이 아닙니다: " + stockCode));

        if (holding.getQuantity() < quantity) {
            throw new IllegalArgumentException("보유 수량이 부족합니다. (보유 수량: " + holding.getQuantity() + "주, 매도 요청: " + quantity + "주)");
        }

        // 2. Perform external KIS Mock Order call (conditional)
        OrderResponse response;
        if (user.isMockOrderEnabled()) {
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

            OrderRequest request = OrderRequest.forMockSell(
                    mockCano,
                    mockAcntPrdtCd,
                    stockCode,
                    quantity,
                    0 // KIS OpenAPI 모의투자 매도 시 지정가 대신 항상 시장가(0)로 주문하여 100% 즉시 체결 보장
            );
            response = kisApiClient.sellStock(request);
        } else {
            // 로컬 모의 매매 가상 응답 생성
            response = new OrderResponse();
            response.setKRX_FWDG_ORD_ORGNO("LOCAL");
            response.setODNO("L" + System.currentTimeMillis() + "_" + java.util.UUID.randomUUID().toString().substring(0, 4));
            response.setORD_TMD(java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HHmmss")));
        }

        // 3. Increase cash balance and update/remove local holding
        double sellAmount = (double) price * quantity;
        user.setCashBalance(user.getCashBalance() + sellAmount);
        userRepository.save(user);

        String stockName = holding.getStockName();
        if (stockName == null || stockName.equals(stockCode) || stockName.trim().isEmpty()) {
            stockName = resolveStockName(stockCode);
        }

        // Calculate profit/loss based on holding's average buy price before deletion or update
        double avgBuyPrice = holding.getAvgPrice();
        double profitLoss = ((double) price - avgBuyPrice) * quantity;
        double profitRate = avgBuyPrice > 0 ? (((double) price - avgBuyPrice) / avgBuyPrice) * 100 : 0.0;

        if (holding.getQuantity() == quantity) {
            portfolioRepository.delete(holding);
        } else {
            holding.setQuantity(holding.getQuantity() - quantity);
            portfolioRepository.save(holding);
        }

        // 4. Save order history
        OrderHistory orderHistory = new OrderHistory(user.getId(), stockCode, stockName, "SELL", quantity, price, orderedBy, reason);
        orderHistory.setProfitLoss(profitLoss);
        orderHistory.setProfitRate(profitRate);
        orderHistoryRepository.save(orderHistory);

        // 5. Save notification
        String sellMsg = String.format("%s (%s) %d주 매도 주문이 체결되었습니다. (단가: %,d원, 주문주체: %s)",
                stockName, stockCode, quantity, (long)price, orderedBy.equals("AI") ? "🤖 AI" : "사용자");
        notificationRepository.save(new Notification(user.getId(), sellMsg));

        // AI/User 매매 실시간 웹소켓 이벤트 발행
        messagingTemplate.convertAndSend("/topic/ai-trade-event", "AiTradeOccurred");

        return response;
    }
}
