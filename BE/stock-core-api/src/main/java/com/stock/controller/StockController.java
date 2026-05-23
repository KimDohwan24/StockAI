package com.stock.controller;

import com.stock.controller.dto.BatchPriceRequest;
import com.stock.controller.dto.DailyPriceRequest;
import com.stock.infrastructure.dto.kis.DailyPriceItem;
import com.stock.infrastructure.dto.kis.MinutePriceItem;
import com.stock.infrastructure.dto.kis.StockPriceResponse;
import com.stock.service.StockPriceBatchService;
import com.stock.service.StockPriceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockPriceService stockPriceService;
    private final StockPriceBatchService stockPriceBatchService;

    @PostMapping("/prices")
    public ResponseEntity<Map<String, StockPriceResponse>> getPrices(
            @RequestBody @Valid BatchPriceRequest request) {
        StockPriceBatchService.BatchResult result = stockPriceBatchService.getCurrentPrices(request.getStockCodes());
        return ResponseEntity.ok()
                .header("X-Cache", result.getCacheStatus())
                .body(result.prices());
    }

    @GetMapping("/{stockCode}/price")
    public ResponseEntity<StockPriceResponse> getPrice(@PathVariable String stockCode) {
        return ResponseEntity.ok(stockPriceService.getCurrentPrice(stockCode));
    }

    @PostMapping("/daily")
    public ResponseEntity<List<DailyPriceItem>> getDailyPrices(@RequestBody @Valid DailyPriceRequest request) {
        return ResponseEntity.ok(stockPriceService.getDailyPrices(
                request.getStockCode(),
                request.getPeriod(),
                request.getStartDate(),
                request.getEndDate()
        ));
    }

    @GetMapping("/{stockCode}/minute")
    public ResponseEntity<List<MinutePriceItem>> getMinutePrices(@PathVariable String stockCode) {
        try {
            List<MinutePriceItem> result = stockPriceService.getMinutePrices(stockCode);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }
}