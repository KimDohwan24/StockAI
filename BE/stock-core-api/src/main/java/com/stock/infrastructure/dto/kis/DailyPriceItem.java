package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class DailyPriceItem {
    private String stck_bsop_date; // 영업일 (YYYYMMDD)
    private String stck_clpr;      // 주식종가
    private String stck_oprc;      // 주식시가
    private String stck_hgpr;      // 주식최고가
    private String stck_lwpr;      // 주식최저가
    private String acml_vol;       // 누적거래량
    private String acml_tr_pbmn;   // 누적거래대금
    private String prdy_vrss;      // 전일대비
    private String prdy_vrss_sign; // 전일대비부호
    private String prdy_ctrt;      // 전일대비율
    private String flng_cls_code;  // 락구분코드
    private String prtt_rate;      // 분할비율
    private String mod_yn;         // 변경여부
    private String prdy_vol;       // 전일거래량
}
