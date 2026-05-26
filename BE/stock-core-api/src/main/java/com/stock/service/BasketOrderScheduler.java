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
                if (user == null) continue;

                // For Korea Investment Securities (Mock) integrated accounts, only execute during market hours
                if (user.isMockOrderEnabled() && !isMarketHours()) {
                    continue;
                }

                StockPriceResponse priceResp = stockPriceService.getCurrentPrice(item.getStockCode());
                if (priceResp == null) continue;

                double currentPrice = Double.parseDouble(priceResp.getStck_prpr());
                if (currentPrice <= 0) continue;

                // 목표가 이하로 떨어지면 자동 예약 매수 발동
                if (currentPrice <= item.getTargetPrice()) {
                    executeOrder(user, item, (int)currentPrice);
                }
            } catch (Exception e) {
                log.error("장바구니 예약 매수 처리 오류 (항목 ID: " + item.getId() + ")", e);
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
