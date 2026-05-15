package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class BalanceSummary {
    private String dnca_tot_amt;     // 예수금총금액
    private String nxdy_excc_amt;    // 익일정산금액
    private String prvs_rcdl_excc_amt; // 가수정산금액
    private String scts_evlu_amt;    // 유가평가금액
    private String tot_evlu_amt;     // 총평가금액
    private String evlu_amt_smtl_amt; // 평가금액합계금액
    private String pchs_amt_smtl_amt; // 매입금액합계금액
    private String evlu_pfls_smtl_amt; // 평가손익합계금액
    private String tot_stln_slng_amt; // 총대주금액
    private String scts_sftg_amt;    // 유가대금
    private String bfdy_buy_amt;     // 전일매수금액
    private String thdt_buy_amt;     // 금일매수금액
    private String bfdy_sll_amt;     // 전일매도금액
    private String thdt_sll_amt;     // 금일매도금액
    private String dpsca_tot_amt;    // 예탁자산총금액
    private String tot_loan_amt;     // 총대출금액
}
