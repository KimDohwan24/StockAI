package com.stock.controller.dto;

import java.time.LocalDateTime;

public record UserProfileResponse(
        Long id,
        String email,
        String name,
        String role,
        LocalDateTime createdAt,
        double initialBalance,
        double cashBalance,
        boolean aiTradingEnabled,
        String riskProfile,
        double aiTradingAllocationRatio,
        boolean mockOrderEnabled
) {}
