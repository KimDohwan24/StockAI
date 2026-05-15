package com.stock.controller.dto;

import lombok.Data;

@Data
public class OrderRequestDto {
    private String stockCode;
    private int quantity;
    private int price; // 0이면 시장가
}
