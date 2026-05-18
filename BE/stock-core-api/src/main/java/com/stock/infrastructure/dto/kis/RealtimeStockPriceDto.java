package com.stock.infrastructure.dto.kis;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RealtimeStockPriceDto {

    private String stockCode;
    private String stckPrpr;
    private String prdyVrss;
    private String prdyVrssSign;
    private String prdyCtrt;
    private String stckOprc;
    private String stckHgpr;
    private String stckLwpr;
    private String acmlVol;
    private String acmlTrPbmn;
    private String stckYmd;
    private String stckCntgHour;

    public StockPriceResponse toStockPriceResponse() {
        StockPriceResponse response = new StockPriceResponse();
        response.setStck_prpr(stckPrpr);
        response.setPrdy_vrss(prdyVrss);
        response.setPrdy_vrss_sign(prdyVrssSign);
        response.setPrdy_ctrt(prdyCtrt);
        response.setStck_oprc(stckOprc);
        response.setStck_hgpr(stckHgpr);
        response.setStck_lwpr(stckLwpr);
        response.setAcml_vol(acmlVol);
        response.setAcml_tr_pbmn(acmlTrPbmn);
        return response;
    }

    public static RealtimeStockPriceDto fromPipeDelimited(String stockCode, String data) {
        String[] fields = data.split("\\|");
        if (fields.length < 4) return null;

        String[] values = fields[3].split("\\^");
        if (values.length < 12) return null;

        return RealtimeStockPriceDto.builder()
                .stockCode(stockCode)
                .stckPrpr(values[2])
                .prdyVrss(values[4])
                .prdyVrssSign(values[3])
                .prdyCtrt(values[5])
                .stckOprc(values[7])
                .stckHgpr(values[8])
                .stckLwpr(values[9])
                .acmlVol(values[10])
                .acmlTrPbmn(values[11])
                .stckYmd(values[0])
                .stckCntgHour(values[1])
                .build();
    }
}