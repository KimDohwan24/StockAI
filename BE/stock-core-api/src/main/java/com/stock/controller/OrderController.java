package com.stock.controller;

import com.stock.controller.dto.OrderRequestDto;
import com.stock.infrastructure.dto.kis.OrderResponse;
import com.stock.service.StockOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final StockOrderService stockOrderService;

    @PostMapping("/buy")
    public ResponseEntity<OrderResponse> buy(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody OrderRequestDto request) {
        return ResponseEntity.ok(stockOrderService.buy(
                userDetails.getUsername(),
                request.getStockCode(),
                request.getQuantity(),
                request.getPrice()
        ));
    }

    @PostMapping("/sell")
    public ResponseEntity<OrderResponse> sell(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody OrderRequestDto request) {
        return ResponseEntity.ok(stockOrderService.sell(
                userDetails.getUsername(),
                request.getStockCode(),
                request.getQuantity(),
                request.getPrice()
        ));
    }
}
