package com.stock.controller.dto;

import jakarta.validation.constraints.Min;

public record OnboardingRequest(
        @Min(value = 1000000, message = "초기 자본은 최소 1백만원 이상이어야 합니다.")
        double initialBalance
) {}
