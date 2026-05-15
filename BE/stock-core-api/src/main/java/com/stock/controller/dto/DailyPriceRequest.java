package com.stock.controller.dto;

import lombok.Data;

@Data
public class DailyPriceRequest {
    private String stockCode;
    private String period; // D:일, W:주, M:월, Y:년
    private String startDate; // YYYYMMDD
    private String endDate;   // YYYYMMDD
}
