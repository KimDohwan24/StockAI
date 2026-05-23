package com.stock.infrastructure.dto.ai;

import lombok.Data;
import java.util.List;

@Data
public class StockAiAnalysisResponse {
    private double score;
    private String signal; // BUY, HOLD, SELL
    private String reason;
    private List<StockNewsItem> news;
}
