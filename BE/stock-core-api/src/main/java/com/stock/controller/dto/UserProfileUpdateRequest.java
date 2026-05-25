package com.stock.controller.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record UserProfileUpdateRequest(
        @NotBlank(message = "이름은 필수입니다")
        String name,
        
        @Min(value = 0, message = "투자 원금은 0 이상이어야 합니다.")
        double initialBalance,
        
        @Min(value = 0, message = "예수금은 0 이상이어야 합니다.")
        double cashBalance
) {}
