package com.stock.infrastructure.dto.ai;

import lombok.Data;
import java.util.List;

@Data
public class DashboardRecommendationsResponse {
    private List<DashboardStockItem> recommended;
    private List<DashboardStockItem> avoided;
}
