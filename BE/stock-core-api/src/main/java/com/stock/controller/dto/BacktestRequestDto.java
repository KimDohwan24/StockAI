package com.stock.controller.dto;

import lombok.Data;
import java.util.List;

@Data
public class BacktestRequestDto {
    private List<Item> items;

    @Data
    public static class Item {
        private String stockCode;
        private double targetPrice;
        private int weight; // 0 ~ 100
    }
}
