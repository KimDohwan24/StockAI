package com.stock.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class DailyPriceRequest {

    @NotBlank(message = "종목코드는 필수입니다")
    private String stockCode;

    @NotBlank(message = "기간은 필수입니다")
    @Pattern(regexp = "^[DWMY]$", message = "period는 D, W, M, Y 중 하나여야 합니다")
    private String period;

    @NotBlank(message = "시작일은 필수입니다")
    @Pattern(regexp = "^\\d{8}$", message = "날짜 형식은 YYYYMMDD이어야 합니다")
    private String startDate;

    @NotBlank(message = "종료일은 필수입니다")
    @Pattern(regexp = "^\\d{8}$", message = "날짜 형식은 YYYYMMDD이어야 합니다")
    private String endDate;
}