package com.stock.infrastructure.dto.kis;

import lombok.Data;

@Data
public class KisTokenResponse {
    private String access_token;
    private String token_type;
    private Long expires_in;
    private String scope;
}
