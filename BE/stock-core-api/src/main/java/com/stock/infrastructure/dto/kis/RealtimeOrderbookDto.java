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
public class RealtimeOrderbookDto {

    private String stockCode;
    private String stckPrpr;
    private String prdyVrss;
    private String prdyVrssSign;
    private String askPrice1;
    private String askPrice2;
    private String askPrice3;
    private String askPrice4;
    private String askPrice5;
    private String askPrice6;
    private String askPrice7;
    private String askPrice8;
    private String askPrice9;
    private String askPrice10;
    private String bidPrice1;
    private String bidPrice2;
    private String bidPrice3;
    private String bidPrice4;
    private String bidPrice5;
    private String bidPrice6;
    private String bidPrice7;
    private String bidPrice8;
    private String bidPrice9;
    private String bidPrice10;
    private String askRem1;
    private String askRem2;
    private String askRem3;
    private String askRem4;
    private String askRem5;
    private String askRem6;
    private String askRem7;
    private String askRem8;
    private String askRem9;
    private String askRem10;
    private String bidRem1;
    private String bidRem2;
    private String bidRem3;
    private String bidRem4;
    private String bidRem5;
    private String bidRem6;
    private String bidRem7;
    private String bidRem8;
    private String bidRem9;
    private String bidRem10;

    public static RealtimeOrderbookDto fromKrxData(String stockCode, String data) {
        String[] fields = data.split("\\|");
        if (fields.length < 4) return null;

        String[] values = fields[3].split("\\^");
        if (values.length < 53) return null;

        return RealtimeOrderbookDto.builder()
                .stockCode(stockCode)
                .stckPrpr(values[13])
                .prdyVrss(values[14])
                .prdyVrssSign(values[15])
                .askPrice1(values[3])
                .askPrice2(values[5])
                .askPrice3(values[7])
                .askPrice4(values[9])
                .askPrice5(values[11])
                .bidPrice1(values[4])
                .bidPrice2(values[6])
                .bidPrice3(values[8])
                .bidPrice4(values[10])
                .bidPrice5(values[12])
                .askRem1(values[23])
                .askRem2(values[24])
                .askRem3(values[25])
                .askRem4(values[26])
                .askRem5(values[27])
                .bidRem1(values[28])
                .bidRem2(values[29])
                .bidRem3(values[30])
                .bidRem4(values[31])
                .bidRem5(values[32])
                .build();
    }
}