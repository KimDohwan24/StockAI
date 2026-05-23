package com.stock.controller.dto;

public record OverseasStockCatalogResponse(String ticker, String name, String exchangeCode, String country, String sector, String currency) {}