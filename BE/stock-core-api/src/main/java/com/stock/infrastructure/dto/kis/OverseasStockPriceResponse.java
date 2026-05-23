package com.stock.infrastructure.dto.kis;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OverseasStockPriceResponse {
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String error;
    private String rt_cd;
    private String msg_cd;
    private String msg1;
    private String output;

    private String ovrs_nic_prdy_clss_code;
    private String ovrs_nic_prdy_vs;
    private String prdy_clss_code;
    private String prdy_vs;
    private String tr_vol;
    private String tr_amt;
    private String last;
    private String open;
    private String high;
    private String low;
    private String clos;

    public boolean isSuccess() {
        return "0".equals(rt_cd);
    }
}