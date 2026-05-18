package com.stock.controller.dto;

public record StockCatalogResponse(String stockCode, String name, String sector, String marketType) {}