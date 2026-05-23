package com.stock.infrastructure.dto.ai;

import lombok.Data;

@Data
public class StockNewsItem {
    private String title;
    private String link;
    private String source;
    private String pubDate;
    private String sentiment; // positive, negative, neutral
    private double sentimentScore;
    private double confidence;
}
