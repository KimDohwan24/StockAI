package com.stock.infrastructure.dto.ai;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class AiSentimentResponse {
    private double sentimentScore;
    private double confidence;
    private List<Map<String, String>> relatedStocks;
}