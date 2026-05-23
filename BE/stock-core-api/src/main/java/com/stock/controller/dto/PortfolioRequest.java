package com.stock.controller.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PortfolioRequest {

    @NotBlank(message = "티커는 필수입니다")
    private String ticker;

    @NotBlank(message = "종목명은 필수입니다")
    private String stockName;

    @NotNull(message = "수량은 필수입니다")
    @Min(value = 1, message = "수량은 1 이상이어야 합니다")
    private Integer quantity;

    @NotNull(message = "평균단가는 필수입니다")
    @Min(value = 0, message = "평균단가는 0 이상이어야 합니다")
    private Double avgPrice;

    private String exchangeCode;
}