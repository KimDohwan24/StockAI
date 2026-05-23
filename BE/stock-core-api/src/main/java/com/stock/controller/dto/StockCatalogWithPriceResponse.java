package com.stock.controller.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StockCatalogWithPriceResponse(
        String stockCode,
        String name,
        String sector,
        String marketType,
        String currentPrice,
        String change,
        String changeSign,
        String changeRate,
        String volume,
        String marketCap,
        String priceUpdatedAt
) {
    public static StockCatalogWithPriceResponse of(StockCatalogResponse catalog,
                                                    String currentPrice, String change,
                                                    String changeSign, String changeRate,
                                                    String volume, String marketCap,
                                                    String priceUpdatedAt) {
        return new StockCatalogWithPriceResponse(
                catalog.stockCode(), catalog.name(), catalog.sector(), catalog.marketType(),
                currentPrice, change, changeSign, changeRate, volume, marketCap, priceUpdatedAt
        );
    }

    public static StockCatalogWithPriceResponse withoutPrice(StockCatalogResponse catalog) {
        return new StockCatalogWithPriceResponse(
                catalog.stockCode(), catalog.name(), catalog.sector(), catalog.marketType(),
                null, null, null, null, null, null, null
        );
    }
}