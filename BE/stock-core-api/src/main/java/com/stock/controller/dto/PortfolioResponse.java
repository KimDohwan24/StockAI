package com.stock.controller.dto;

import java.time.LocalDateTime;

public record PortfolioResponse(
        Long id,
        Long userId,
        double initialBalance,
        double cashBalance,
        double totalAssetValue,
        LocalDateTime createdAt
) {}