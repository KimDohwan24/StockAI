package com.stock.controller.dto;

public record HoldingResponse(
        Long id,
        String stockCode,
        String stockName,
        int quantity,
        double avgPrice,
        double currentPrice,
        double profitLoss,
        double profitRate
) {}
