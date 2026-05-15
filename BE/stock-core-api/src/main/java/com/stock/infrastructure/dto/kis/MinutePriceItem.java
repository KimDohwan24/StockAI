package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class MinutePriceItem {
    private String stck_bsop_date; // 영업일 (YYYYMMDD)
    private String stck_cntg_hour; // 주식체결시간 (HHMMSS)
    private String stck_prpr;      // 주식현재가
    private String stck_oprc;      // 주식시가
    private String stck_hgpr;      // 주식최고가
    private String stck_lwpr;      // 주식최저가
    private String cntg_vol;       // 체결거래량
    private String acml_vol;       // 누적거래량
    private String acml_tr_pbmn;   // 누적거래대금
}
