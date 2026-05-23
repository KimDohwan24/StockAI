package com.stock.controller;

import com.stock.controller.dto.TrendingResponse;
import com.stock.service.TrendingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trending")
@RequiredArgsConstructor
public class TrendingController {

    private final TrendingService trendingService;

    @GetMapping("/domestic")
    public ResponseEntity<List<TrendingResponse>> getDomesticTrending(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(trendingService.getDomesticTrending(limit));
    }

    @GetMapping("/overseas")
    public ResponseEntity<List<TrendingResponse>> getOverseasTrending(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(trendingService.getOverseasTrending(limit));
    }
}