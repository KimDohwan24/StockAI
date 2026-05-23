package com.stock.infrastructure.dto.ai;

import lombok.Data;

@Data
public class DashboardStockItem {
    private String stockCode;
    private String stockName;
    private double price;
    private double changeRate;
    private double aiScore;
    private String reason;
    private String marketType; // DOMESTIC, OVERSEAS
}
