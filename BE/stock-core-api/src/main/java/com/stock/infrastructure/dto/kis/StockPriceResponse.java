package com.stock.infrastructure.dto.kis;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StockPriceResponse {
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String error;
    private String rprs_mrkt_kor_name;
    private String hts_kor_isnm;          // HTS한글종목명
    private String stck_prpr;             // 주식현재가
    private String prdy_vrss;             // 전일대비
    private String prdy_vrss_sign;        // 전일대비부호 (1:상한, 2:상승, 3:보합, 4:하락, 5:하한)
    private String prdy_ctrt;             // 전일대비율
    private String stck_oprc;             // 주식시가
    private String stck_hgpr;             // 주식최고가
    private String stck_lwpr;             // 주식최저가
    private String stck_mxpr;             // 상한가
    private String stck_llmn;             // 하한가
    private String stck_sdpr;             // 주식기준가 (전일종가)
    private String acml_vol;              // 누적거래량
    private String acml_tr_pbmn;          // 누적거래대금
    private String w52_hgpr;              // 52주 최고가
    private String w52_lwpr;              // 52주 최저가
    private String per;                   // PER
    private String pbr;                   // PBR
    private String eps;                   // EPS
    private String bps;                   // BPS
    private String hts_avls;              // HTS시가총액 (억원)
}
