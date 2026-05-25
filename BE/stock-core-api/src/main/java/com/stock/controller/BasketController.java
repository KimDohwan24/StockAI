package com.stock.controller;

import com.stock.controller.dto.BacktestRequestDto;
import com.stock.controller.dto.BacktestResponseDto;
import com.stock.controller.dto.BasketItemRequestDto;
import com.stock.domain.basket.BasketItem;
import com.stock.service.BasketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/baskets")
@RequiredArgsConstructor
public class BasketController {

    private final BasketService basketService;

    @GetMapping
    public ResponseEntity<List<BasketItem>> getBasketItems(
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(basketService.getBasketItems(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<BasketItem> addBasketItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody BasketItemRequestDto request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(basketService.addBasketItem(
                userDetails.getUsername(),
                request.getStockCode(),
                request.getTargetPrice(),
                request.getWeight()
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BasketItem> updateBasketItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestBody BasketItemRequestDto request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(basketService.updateBasketItem(
                userDetails.getUsername(),
                id,
                request.getTargetPrice(),
                request.getWeight()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBasketItem(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        basketService.deleteBasketItem(userDetails.getUsername(), id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/toggle-active")
    public ResponseEntity<BasketItem> toggleActive(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(basketService.toggleActive(userDetails.getUsername(), id));
    }

    @PostMapping("/backtest")
    public ResponseEntity<BacktestResponseDto> backtest(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody BacktestRequestDto request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(basketService.backtest(userDetails.getUsername(), request));
    }
}
