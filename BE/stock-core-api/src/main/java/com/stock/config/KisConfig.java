package com.stock.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "kis")
public class KisConfig {

    private String baseUrl;
    private String oauthUrl;
    private String appkey;
    private String appsecret;
    private Account account;

    @Getter
    @Setter
    public static class Account {
        private String cano;
        private String acntPrdtCd;
    }

    public String getAccountNo() {
        return account.getCano();
    }

    public String getAccountProductCode() {
        return account.getAcntPrdtCd();
    }
}
