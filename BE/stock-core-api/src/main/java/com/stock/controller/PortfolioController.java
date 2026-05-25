package com.stock.controller;

import com.stock.controller.dto.HoldingResponse;
import com.stock.controller.dto.OnboardingRequest;
import com.stock.controller.dto.PortfolioResponse;
import com.stock.service.PortfolioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;

    @GetMapping
    public ResponseEntity<PortfolioResponse> getPortfolioSummary(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(portfolioService.getPortfolioSummary(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<PortfolioResponse> createPortfolio(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody OnboardingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(portfolioService.createPortfolio(userDetails.getUsername(), request.initialBalance()));
    }

    @GetMapping("/holdings")
    public ResponseEntity<List<HoldingResponse>> getHoldings(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(portfolioService.getHoldings(userDetails.getUsername()));
    }
}