package com.stock.controller;

import com.stock.controller.dto.PortfolioRequest;
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
    public ResponseEntity<List<PortfolioResponse>> getPortfolios(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(portfolioService.getPortfolios(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<PortfolioResponse> addPortfolio(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PortfolioRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(portfolioService.addPortfolio(userDetails.getUsername(), request));
    }

    @PutMapping("/{ticker}")
    public ResponseEntity<PortfolioResponse> updatePortfolio(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticker,
            @Valid @RequestBody PortfolioRequest request) {
        return ResponseEntity.ok(portfolioService.updatePortfolio(userDetails.getUsername(), ticker, request));
    }

    @DeleteMapping("/{ticker}")
    public ResponseEntity<Void> removePortfolio(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticker) {
        portfolioService.removePortfolio(userDetails.getUsername(), ticker);
        return ResponseEntity.noContent().build();
    }
}