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
    private String websocketUrl;
    private Account account;
    private boolean mockOrderEnabled = true;

    @Getter
    @Setter
    public static class Account {
        private String cano;
        private String acntPrdtCd;
    }

    public String getAccountNo() {
        if (account == null) {
            throw new IllegalStateException("KIS account configuration is missing");
        }
        return account.getCano();
    }

    public String getAccountProductCode() {
        if (account == null) {
            throw new IllegalStateException("KIS account configuration is missing");
        }
        return account.getAcntPrdtCd();
    }
}
