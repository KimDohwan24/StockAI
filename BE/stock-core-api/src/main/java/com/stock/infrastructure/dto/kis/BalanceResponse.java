package com.stock.infrastructure.dto.kis;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;

import java.util.List;

@Data
public class BalanceResponse {
    private String rt_cd;
    private String msg_cd;
    private String msg1;
    private List<BalanceItem> output1;

    @JsonDeserialize(using = BalanceSummaryDeserializer.class)
    private BalanceSummary output2;

    public boolean isSuccess() {
        return "0".equals(rt_cd);
    }
}

