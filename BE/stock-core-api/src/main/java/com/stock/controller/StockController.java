package com.stock.controller;

import com.stock.controller.dto.DailyPriceRequest;
import com.stock.controller.dto.StockPriceRequest;
import com.stock.infrastructure.dto.kis.DailyPriceItem;
import com.stock.infrastructure.dto.kis.MinutePriceItem;
import com.stock.infrastructure.dto.kis.StockPriceResponse;
import com.stock.service.StockPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockPriceService stockPriceService;

    @GetMapping("/{stockCode}/price")
    public ResponseEntity<StockPriceResponse> getPrice(@PathVariable String stockCode) {
        return ResponseEntity.ok(stockPriceService.getCurrentPrice(stockCode));
    }

    @PostMapping("/daily")
    public ResponseEntity<List<DailyPriceItem>> getDailyPrices(@RequestBody DailyPriceRequest request) {
        return ResponseEntity.ok(stockPriceService.getDailyPrices(
                request.getStockCode(),
                request.getPeriod(),
                request.getStartDate(),
                request.getEndDate()
        ));
    }

    @GetMapping("/{stockCode}/minute")
    public ResponseEntity<List<MinutePriceItem>> getMinutePrices(@PathVariable String stockCode) {
        return ResponseEntity.ok(stockPriceService.getMinutePrices(stockCode));
    }
}
