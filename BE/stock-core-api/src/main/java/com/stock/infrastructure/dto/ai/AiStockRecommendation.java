package com.stock.infrastructure.dto.ai;

import lombok.Data;

@Data
public class AiStockRecommendation {
    private String ticker;
    private String name;
    private double riskScore;
    private String reason;
}