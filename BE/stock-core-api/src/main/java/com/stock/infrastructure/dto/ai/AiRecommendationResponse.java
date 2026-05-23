package com.stock.infrastructure.dto.ai;

import lombok.Data;

import java.util.List;

@Data
public class AiRecommendationResponse {
    private int userId;
    private String riskProfile;
    private List<AiStockRecommendation> recommendations;
}