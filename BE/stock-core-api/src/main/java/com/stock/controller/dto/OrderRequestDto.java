package com.stock.controller.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class OrderRequestDto {
    private String stockCode;
    private int quantity;
    private int price;

    public void setStockCode(String stockCode) {
        this.stockCode = stockCode;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public void setPrice(int price) {
        this.price = price;
    }
}
