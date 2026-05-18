package com.stock.config;

import com.stock.config.AiServerConfig;
import io.netty.channel.ChannelOption;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;

@Configuration
public class WebClientConfig {

    @Bean
    public ConnectionProvider kisConnectionProvider() {
        return ConnectionProvider.builder("kisConnectionPool")
                .maxConnections(100)
                .pendingAcquireMaxCount(500)
                .pendingAcquireTimeout(Duration.ofSeconds(10))
                .maxIdleTime(Duration.ofSeconds(30))
                .maxLifeTime(Duration.ofSeconds(60))
                .evictInBackground(Duration.ofSeconds(30))
                .build();
    }

    @Bean("kisWebClient")
    public WebClient kisWebClient(KisConfig kisConfig, ConnectionProvider kisConnectionProvider) {
        HttpClient httpClient = HttpClient.create(kisConnectionProvider)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10000)
                .responseTimeout(Duration.ofSeconds(10));

        return WebClient.builder()
                .baseUrl(kisConfig.getBaseUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader("Content-Type", "application/json; charset=utf-8")
                .defaultHeader("appkey", kisConfig.getAppkey())
                .defaultHeader("appsecret", kisConfig.getAppsecret())
                .defaultHeader("custtype", "P")
                .build();
    }

    @Bean("kisOAuthWebClient")
    public WebClient kisOAuthWebClient(KisConfig kisConfig, ConnectionProvider kisConnectionProvider) {
        HttpClient httpClient = HttpClient.create(kisConnectionProvider)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
                .responseTimeout(Duration.ofSeconds(5));

        return WebClient.builder()
                .baseUrl(kisConfig.getOauthUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader("Content-Type", "application/json; charset=utf-8")
                .build();
    }

    @Bean("aiServerWebClient")
    public WebClient aiServerWebClient(AiServerConfig aiServerConfig) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, aiServerConfig.getTimeout())
                .responseTimeout(Duration.ofMillis(aiServerConfig.getTimeout()));

        return WebClient.builder()
                .baseUrl(aiServerConfig.getUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader("Content-Type", "application/json; charset=utf-8")
                .build();
    }
}