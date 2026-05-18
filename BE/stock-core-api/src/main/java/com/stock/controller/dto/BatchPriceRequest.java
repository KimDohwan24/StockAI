package com.stock.controller.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class BatchPriceRequest {

    @Size(max = 200, message = "최대 200개 종목까지 조회 가능합니다")
    private List<String> stockCodes;
}