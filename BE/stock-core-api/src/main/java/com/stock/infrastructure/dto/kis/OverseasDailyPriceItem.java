package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class OverseasDailyPriceItem {
    private String bymd;
    private String open;
    private String high;
    private String low;
    private String clos;
    private String vol;
}