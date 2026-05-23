package com.stock.controller.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record OverseasStockCatalogWithPriceResponse(
        String ticker,
        String name,
        String exchangeCode,
        String country,
        String sector,
        String currency,
        String currentPrice,
        String change,
        String changeSign,
        String changeRate,
        String volume,
        String priceUpdatedAt
) {
    public static OverseasStockCatalogWithPriceResponse of(OverseasStockCatalogResponse catalog,
                                                            String currentPrice, String change,
                                                            String changeSign, String changeRate,
                                                            String volume, String priceUpdatedAt) {
        return new OverseasStockCatalogWithPriceResponse(
                catalog.ticker(), catalog.name(), catalog.exchangeCode(), catalog.country(),
                catalog.sector(), catalog.currency(),
                currentPrice, change, changeSign, changeRate, volume, priceUpdatedAt
        );
    }

    public static OverseasStockCatalogWithPriceResponse withoutPrice(OverseasStockCatalogResponse catalog) {
        return new OverseasStockCatalogWithPriceResponse(
                catalog.ticker(), catalog.name(), catalog.exchangeCode(), catalog.country(),
                catalog.sector(), catalog.currency(),
                null, null, null, null, null, null
        );
    }
}