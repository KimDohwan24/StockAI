package com.stock.service;

import com.stock.domain.basket.BasketItem;
import com.stock.domain.basket.BasketRepository;
import com.stock.domain.entity.User;
import com.stock.domain.repository.UserRepository;
import com.stock.domain.notification.Notification;
import com.stock.domain.notification.NotificationRepository;
import com.stock.infrastructure.dto.kis.StockPriceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BasketOrderScheduler {

    private final BasketRepository basketRepository;
    private final UserRepository userRepository;
    private final StockPriceService stockPriceService;
    private final StockOrderService stockOrderService;
    private final NotificationRepository notificationRepository;

    @Scheduled(fixedDelay = 15000) // 15초마다 실시간 주가 감시
    @Transactional
    public void checkAndExecuteReservations() {
        List<BasketItem> activeItems = basketRepository.findAllByActiveTrue();
        if (activeItems.isEmpty()) {
            return;
        }

        for (BasketItem item : activeItems) {
            try {
                User user = userRepository.findById(item.getUserId()).orElse(null);
                if (user == null) {
                    item.setActive(false);
                    basketRepository.save(item);
                    continue;
                }

                // For Korea Investment Securities (Mock) integrated accounts, only execute during market hours
                if (user.isMockOrderEnabled() && !isMarketHours()) {
                    continue;
                }

                try {
                    StockPriceResponse priceResp = stockPriceService.getCurrentPrice(item.getStockCode());
                    if (priceResp == null || priceResp.getStck_prpr() == null) {
                        throw new RuntimeException("현재 주가 정보를 가져올 수 없습니다.");
                    }

                    double currentPrice = Double.parseDouble(priceResp.getStck_prpr().trim());
                    if (currentPrice <= 0) {
                        throw new RuntimeException("유효하지 않은 주가 가격입니다. (가격: " + currentPrice + ")");
                    }

                    if (item.getAiReservation() != null && item.getAiReservation()) {
                        executeAiReservation(user, item, (int) currentPrice);
                    } else {
                        // 목표가 이하로 떨어지면 자동 예약 매수 발동 (사용자 수동 장바구니)
                        if (currentPrice <= item.getTargetPrice()) {
                            executeOrder(user, item, (int) currentPrice);
                        }
                    }
                } catch (Exception e) {
                    log.error("예약 주문 처리 중 에러 발생 - 항목 ID: {}, 강제 초기화(비활성화) 처리합니다.", item.getId(), e);
                    item.setActive(false);
                    basketRepository.save(item);

                    String errorMsg = String.format("❌ 예약 자동 주문 (%s, %s) 처리 중 오류 발생으로 취소되었습니다: %s",
                            item.getStockName(), item.getStockCode(), e.getMessage());
                    notificationRepository.save(new Notification(user.getId(), errorMsg));
                }
            } catch (Exception e) {
                log.error("예약 주문 처리 심각한 오류 (항목 ID: " + item.getId() + ")", e);
                try {
                    item.setActive(false);
                    basketRepository.save(item);
                } catch (Exception ignored) {}
            }
        }
    }

    private void executeAiReservation(User user, BasketItem item, int currentPrice) {
        int qty = item.getQuantity() != null ? item.getQuantity() : 0;
        if (qty <= 0) qty = 1;

        try {
            if ("SELL".equalsIgnoreCase(item.getOrderType())) {
                log.info("Executing AI Auto-Reservation SELL: User={}, Stock={}, Qty={}, Price={}", 
                        user.getEmail(), item.getStockCode(), qty, currentPrice);
                stockOrderService.sell(user.getEmail(), item.getStockCode(), qty, currentPrice, "AI", "AI 예약 자동 매도 체결");
            } else {
                log.info("Executing AI Auto-Reservation BUY: User={}, Stock={}, Qty={}, Price={}", 
                        user.getEmail(), item.getStockCode(), qty, currentPrice);
                stockOrderService.buy(user.getEmail(), item.getStockCode(), qty, currentPrice, "AI", "AI 예약 자동 매수 체결");
            }
            item.setActive(false);
            basketRepository.save(item);
        } catch (Exception e) {
            item.setActive(false);
            basketRepository.save(item);

            String errorMsg = String.format("❌ AI %s 예약 자동 주문 (%s, %s) 진행 중 실패: %s",
                    "SELL".equalsIgnoreCase(item.getOrderType()) ? "매도" : "매수",
                    item.getStockName(), item.getStockCode(), e.getMessage());
            notificationRepository.save(new Notification(user.getId(), errorMsg));
            log.error("AI 예약 주문 처리 실패 (항목 ID: " + item.getId() + ")", e);
        }
    }

    private boolean isMarketHours() {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        DayOfWeek day = now.getDayOfWeek();
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) return false;
        LocalTime time = now.toLocalTime();
        return !time.isBefore(LocalTime.of(9, 0)) && !time.isAfter(LocalTime.of(15, 30));
    }

    private void executeOrder(User user, BasketItem item, int currentPrice) {
        List<BasketItem> userItems = basketRepository.findAllByUserId(user.getId());
        double totalWeight = 0;
        for (BasketItem ui : userItems) {
            totalWeight += ui.getWeight();
        }

        if (totalWeight <= 0) {
            item.setActive(false);
            basketRepository.save(item);
            return;
        }

        double ratio = item.getWeight() / totalWeight;
        double allocatedCapital = user.getCashBalance() * ratio;
        int qty = (int) (allocatedCapital / currentPrice);

        if (qty <= 0) {
            item.setActive(false);
            basketRepository.save(item);

            String failMsg = String.format("❌ 잔액 부족으로 %s (%s) 장바구니 예약 매수가 실패하였습니다. (예상 단가: %,d원, 예수금: %,d원)",
                    item.getStockName(), item.getStockCode(), currentPrice, (long)user.getCashBalance());
            notificationRepository.save(new Notification(user.getId(), failMsg));
            return;
        }

        try {
            stockOrderService.buy(user.getEmail(), item.getStockCode(), qty, currentPrice, "AI", "장바구니 스마트 예약 매수");
            item.setActive(false);
            basketRepository.save(item);
        } catch (Exception e) {
            item.setActive(false);
            basketRepository.save(item);

            String errorMsg = String.format("❌ %s (%s) 예약 자동 매수 진행 중 실패: %s",
                    item.getStockName(), item.getStockCode(), e.getMessage());
            notificationRepository.save(new Notification(user.getId(), errorMsg));
        }
    }
}
