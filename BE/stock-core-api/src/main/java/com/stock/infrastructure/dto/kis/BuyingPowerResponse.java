package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class BuyingPowerResponse {
    private String nrcvb_buy_amt;    // 미수없는매수가능금액
    private String nrcvb_buy_qty;    // 미수없는매수가능수량
    private String max_buy_amt;      // 최대매수가능금액
    private String max_buy_qty;      // 최대매수가능수량
    private String ord_psbl_cash;    // 주문가능현금
    private String ord_psbl_sbst;    // 주문가능대용
    private String rcbf_dnca;        // 재사용가능예수금
    private String dpsast_tot_amt;   // 예탁자산총금액
}
