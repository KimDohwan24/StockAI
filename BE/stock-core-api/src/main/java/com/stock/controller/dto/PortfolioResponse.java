package com.stock.controller.dto;

public record PortfolioResponse(
        Long id,
        String ticker,
        String stockName,
        int quantity,
        double avgPrice,
        String exchangeCode
) {}