package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class RealizedProfitItem {
    private String ord_dt;          // 주문일자
    private String ord_gno_brno;    // 주문채번지점번호
    private String odno;            // 주문번호
    private String orgn_odno;       // 원주문번호
    private String sll_buy_dvsn_cd_name; // 매도매수구분코드명
    private String pdno;            // 종목코드
    private String prdt_name;       // 종목명
    private String ord_qty;         // 주문수량
    private String ord_unpr;        // 주문단가
    private String avg_prvs;        // 평균단가
    private String tot_ccld_amt;    // 총체결금액
    private String ccld_qty;        // 체결수량
    private String rmn_qty;         // 잔여수량
}
