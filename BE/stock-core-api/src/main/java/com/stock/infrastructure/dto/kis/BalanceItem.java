package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class BalanceItem {
    private String pdno;            // 종목코드
    private String prdt_name;       // 종목명
    private String hldg_qty;        // 보유수량
    private String ord_psbl_qty;    // 주문가능수량
    private String pchs_avg_pric;   // 매입평균가격
    private String evlu_amt;        // 평가금액
    private String evlu_pfls_amt;   // 평가손익금액
    private String evlu_pfls_rt;    // 평가손익율
    private String prpr;            // 현재가
    private String pchs_amt;        // 매입금액
    private String loan_amt;        // 대출금액
    private String loan_dt;         // 대출일자
    private String expd_dt;         // 만기일자
}
