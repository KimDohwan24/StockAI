package com.stock.controller.dto;

public record HoldingResponse(
        Long id,
        String stockCode,
        String stockName,
        int quantity,
        double avgPrice,
        double currentPrice,
        double profitLoss,
        double profitRate,
        boolean isReservation,
        String orderType
) {
    public HoldingResponse(Long id, String stockCode, String stockName, int quantity, double avgPrice, double currentPrice, double profitLoss, double profitRate, boolean isReservation) {
        this(id, stockCode, stockName, quantity, avgPrice, currentPrice, profitLoss, profitRate, isReservation, "BUY");
    }
}
