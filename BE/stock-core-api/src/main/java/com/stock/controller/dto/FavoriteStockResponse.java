package com.stock.controller.dto;

public record FavoriteStockResponse(
    String stockCode,
    String stockName,
    String currentPrice,
    String changeValue,
    String changeRate,
    String changeSign
) {}
