package com.stock.controller;

import com.stock.controller.dto.OrderRequestDto;
import com.stock.domain.entity.User;
import com.stock.domain.order.OrderHistory;
import com.stock.domain.repository.OrderHistoryRepository;
import com.stock.domain.repository.UserRepository;
import com.stock.infrastructure.dto.kis.OrderResponse;
import com.stock.service.StockOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final StockOrderService stockOrderService;
    private final OrderHistoryRepository orderHistoryRepository;
    private final UserRepository userRepository;

    @PostMapping("/buy")
    public ResponseEntity<OrderResponse> buy(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody OrderRequestDto request) {
        return ResponseEntity.ok(stockOrderService.buy(
                userDetails.getUsername(),
                request.getStockCode(),
                request.getQuantity(),
                request.getPrice(),
                "USER"
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
                request.getPrice(),
                "USER"
        ));
    }

    @GetMapping("/history")
    public ResponseEntity<List<OrderHistory>> getOrderHistory(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return ResponseEntity.ok(orderHistoryRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId()));
    }
}
