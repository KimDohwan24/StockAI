package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class KisTokenRequest {
    private String grant_type = "client_credentials";
    private String appkey;
    private String appsecret;
}
