package com.stock.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class StockMasterPriceUpdater {

    private static final int FLUSH_THRESHOLD = 100;

    private final JdbcTemplate jdbcTemplate;
    private final ConcurrentHashMap<String, PriceUpdateEntry> pendingUpdates = new ConcurrentHashMap<>();

    public StockMasterPriceUpdater(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private boolean isMarketOpen() {
        ZonedDateTime nowKst = ZonedDateTime.now(ZoneId.of("Asia/Seoul"));
        DayOfWeek day = nowKst.getDayOfWeek();
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
            return false;
        }
        LocalTime time = nowKst.toLocalTime();
        return !time.isBefore(LocalTime.of(9, 0)) && !time.isAfter(LocalTime.of(15, 30));
    }

    public void submitPriceUpdate(String stockCode, String currentPrice, String changeValue,
                                  String changeSign, String changeRate, String volume, String marketCap) {
        if (!isMarketOpen()) {
            log.trace("Market is closed. Skipping price update database flush for stock: {}", stockCode);
            return;
        }
        PriceUpdateEntry entry = new PriceUpdateEntry(currentPrice, changeValue, changeSign,
                changeRate, volume, marketCap, LocalDateTime.now());
        pendingUpdates.put(stockCode, entry);

        if (pendingUpdates.size() >= FLUSH_THRESHOLD) {
            flush();
        }
    }

    @Scheduled(fixedDelay = 3000)
    public void flush() {
        if (pendingUpdates.isEmpty()) return;

        Map<String, PriceUpdateEntry> batch = new ConcurrentHashMap<>();
        for (String key : pendingUpdates.keySet()) {
            PriceUpdateEntry entry = pendingUpdates.remove(key);
            if (entry != null) {
                batch.put(key, entry);
            }
        }

        if (batch.isEmpty()) return;

        List<Object[]> params = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Map.Entry<String, PriceUpdateEntry> e : batch.entrySet()) {
            String stockCode = e.getKey();
            PriceUpdateEntry entry = e.getValue();
            params.add(new Object[]{
                    entry.currentPrice,
                    entry.changeValue,
                    entry.changeSign,
                    entry.changeRate,
                    entry.volume,
                    entry.marketCap,
                    now,
                    stockCode
            });
        }

        try {
            jdbcTemplate.batchUpdate(
                    "UPDATE stocks SET current_price = ?, change_value = ?, change_sign = ?, " +
                            "change_rate = ?, volume = ?, market_cap = ?, price_updated_at = ? " +
                            "WHERE stock_code = ?",
                    params
            );
            log.debug("Flushed {} price updates to DB", params.size());
        } catch (Exception e) {
            log.error("Failed to flush price updates to DB: {}", e.getMessage());
            pendingUpdates.putAll(batch);
        }
    }

    private record PriceUpdateEntry(String currentPrice, String changeValue, String changeSign,
                                    String changeRate, String volume, String marketCap,
                                    LocalDateTime receivedAt) {
    }
}