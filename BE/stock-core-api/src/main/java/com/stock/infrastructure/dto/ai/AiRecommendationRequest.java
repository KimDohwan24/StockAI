package com.stock.infrastructure.dto.ai;

import lombok.Data;

import java.util.List;

@Data
public class AiRecommendationRequest {
    private int userId;
    private String riskProfile;
    private List<String> preferredSectors;

    public AiRecommendationRequest(int userId, String riskProfile, List<String> preferredSectors) {
        this.userId = userId;
        this.riskProfile = riskProfile;
        this.preferredSectors = preferredSectors != null ? preferredSectors : List.of();
    }
}