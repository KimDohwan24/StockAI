package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class KisOverseasStockMasterItem {
    private String symb;
    private String item_name;
    private String kor_sect_nm;
    private String tr_natn_cd;
    private String crcy_cd;
    private String exchangeCode;
}