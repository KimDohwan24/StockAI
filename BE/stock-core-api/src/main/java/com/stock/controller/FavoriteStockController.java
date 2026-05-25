package com.stock.controller;

import com.stock.controller.dto.FavoriteStockResponse;
import com.stock.service.FavoriteStockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteStockController {

    private final FavoriteStockService favoriteStockService;

    @GetMapping
    public ResponseEntity<List<FavoriteStockResponse>> getFavorites(
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(favoriteStockService.getFavoritesWithPrices(userDetails.getUsername()));
    }

    @GetMapping("/{stockCode}/status")
    public ResponseEntity<Map<String, Boolean>> getFavoriteStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String stockCode) {
        if (userDetails == null) {
            return ResponseEntity.ok(Map.of("favorited", false));
        }
        boolean isFavorite = favoriteStockService.isFavorite(userDetails.getUsername(), stockCode);
        return ResponseEntity.ok(Map.of("favorited", isFavorite));
    }

    @PostMapping("/{stockCode}/toggle")
    public ResponseEntity<Map<String, Boolean>> toggleFavorite(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String stockCode) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        boolean favorited = favoriteStockService.toggleFavorite(userDetails.getUsername(), stockCode);
        return ResponseEntity.ok(Map.of("favorited", favorited));
    }
}
