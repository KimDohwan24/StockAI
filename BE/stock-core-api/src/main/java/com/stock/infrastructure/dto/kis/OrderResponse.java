package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class OrderResponse {
    private String KRX_FWDG_ORD_ORGNO; // 주문시한국거래소부구분조직번호
    private String ODNO;               // 주문번호
    private String ORD_TMD;            // 주문시각 (HHMMSS)
}
