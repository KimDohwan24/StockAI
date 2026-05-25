package com.stock.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BacktestResponseDto {
    private List<ChartPoint> chartData;
    private double finalReturn; // 최종 수익률 (%)
    private double mdd; // 최대 낙폭 MDD (%)
    private String aiAdvice; // AI 진단 메시지

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ChartPoint {
        private String date; // YYYY-MM-DD
        private double returnValue; // 누적 수익률 (%)
    }
}
