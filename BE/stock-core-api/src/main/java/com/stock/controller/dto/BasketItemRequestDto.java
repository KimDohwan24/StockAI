package com.stock.controller.dto;

import lombok.Data;

@Data
public class BasketItemRequestDto {
    private String stockCode;
    private double targetPrice;
    private int weight;
}
