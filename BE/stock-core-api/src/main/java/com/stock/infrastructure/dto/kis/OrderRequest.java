package com.stock.infrastructure.dto.kis;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRequest {
    // KIS 현금주문 공통 요청 body
    @JsonProperty("CANO")
    private String CANO;         // 종합계좌번호 (8자리)
    @JsonProperty("ACNT_PRDT_CD")
    private String ACNT_PRDT_CD; // 계좌상품코드 (01)
    @JsonProperty("PDNO")
    private String PDNO;         // 종목코드 (6자리)
    @JsonProperty("ORD_DVSN")
    private String ORD_DVSN;     // 주문구분 (00: 지정가, 01: 시장가, ...)
    @JsonProperty("ORD_QTY")
    private String ORD_QTY;      // 주문수량
    @JsonProperty("ORD_UNPR")
    private String ORD_UNPR;     // 주문단가 (시장가: 0)

    // 모의투자용 기본값 생성
    public static OrderRequest forMockBuy(String accountNo, String productCode, String stockCode, int quantity, int price) {
        return OrderRequest.builder()
                .CANO(accountNo)
                .ACNT_PRDT_CD(productCode)
                .PDNO(stockCode)
                .ORD_DVSN(price == 0 ? "01" : "00") // 0이면 시장가, 아니면 지정가
                .ORD_QTY(String.valueOf(quantity))
                .ORD_UNPR(String.valueOf(price))
                .build();
    }

    public static OrderRequest forMockSell(String accountNo, String productCode, String stockCode, int quantity, int price) {
        return OrderRequest.builder()
                .CANO(accountNo)
                .ACNT_PRDT_CD(productCode)
                .PDNO(stockCode)
                .ORD_DVSN(price == 0 ? "01" : "00")
                .ORD_QTY(String.valueOf(quantity))
                .ORD_UNPR(String.valueOf(price))
                .build();
    }
}
