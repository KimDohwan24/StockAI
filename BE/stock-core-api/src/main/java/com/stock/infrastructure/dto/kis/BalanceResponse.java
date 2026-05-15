package com.stock.infrastructure.dto.kis;

import lombok.Data;

import java.util.List;

@Data
public class BalanceResponse {
    private String rt_cd;
    private String msg_cd;
    private String msg1;
    private List<BalanceItem> output1;
    private BalanceSummary output2;

    public boolean isSuccess() {
        return "0".equals(rt_cd);
    }
}
