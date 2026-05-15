package com.stock.controller;

import com.stock.controller.dto.OrderRequestDto;
import com.stock.infrastructure.dto.kis.OrderResponse;
import com.stock.service.StockOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final StockOrderService stockOrderService;

    @PostMapping("/buy")
    public ResponseEntity<OrderResponse> buy(@RequestBody OrderRequestDto request) {
        return ResponseEntity.ok(stockOrderService.buy(request.getStockCode(), request.getQuantity(), request.getPrice()));
    }

    @PostMapping("/sell")
    public ResponseEntity<OrderResponse> sell(@RequestBody OrderRequestDto request) {
        return ResponseEntity.ok(stockOrderService.sell(request.getStockCode(), request.getQuantity(), request.getPrice()));
    }
}
