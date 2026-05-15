package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class KisWebSocketKeyRequest {
    private String grant_type = "client_credentials";
    private String appkey;
    private String secretkey;
}
