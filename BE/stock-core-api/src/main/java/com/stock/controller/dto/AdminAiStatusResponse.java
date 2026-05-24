package com.stock.controller.dto;

import com.stock.domain.order.OrderHistory;
import java.util.List;

public record AdminAiStatusResponse(
        UserProfileResponse profile,
        PortfolioResponse portfolio,
        List<HoldingResponse> holdings,
        List<OrderHistory> orderHistory
) {}
