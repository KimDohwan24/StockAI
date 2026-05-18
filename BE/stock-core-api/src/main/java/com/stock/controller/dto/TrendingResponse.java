package com.stock.controller.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TrendingResponse(
        String stockCode,
        String name,
        String marketType,
        String currentPrice,
        String changeValue,
        String changeSign,
        String changeRate,
        String volume,
        String marketCap
) {}