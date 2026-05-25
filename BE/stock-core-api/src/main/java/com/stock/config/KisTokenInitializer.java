package com.stock.config;

import com.stock.service.KisAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class KisTokenInitializer implements ApplicationRunner {

    private final KisAuthService kisAuthService;

    @Override
    public void run(ApplicationArguments args) {
        try {
            kisAuthService.getAccessToken();
            log.info("KIS real access token pre-warmed successfully on startup");
        } catch (Exception e) {
            log.warn("Failed to pre-warm KIS real access token on startup: {}", e.getMessage());
        }

        try {
            kisAuthService.getMockAccessToken();
            log.info("KIS mock access token pre-warmed successfully on startup");
        } catch (Exception e) {
            log.warn("Failed to pre-warm KIS mock access token on startup: {}", e.getMessage());
        }
    }
}