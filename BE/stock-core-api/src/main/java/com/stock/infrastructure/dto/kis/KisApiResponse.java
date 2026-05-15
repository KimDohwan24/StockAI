package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class KisApiResponse<T> {
    private String rt_cd;
    private String msg_cd;
    private String msg1;
    private T output;
    private T output1;  // 일부 API는 output1을 사용
    private T output2;  // 일부 API는 output2를 사용

    public boolean isSuccess() {
        return "0".equals(rt_cd);
    }
}
