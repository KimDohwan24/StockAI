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
            String token = kisAuthService.getAccessToken();
            log.info("KIS access token pre-warmed successfully on startup");
        } catch (Exception e) {
            log.warn("Failed to pre-warm KIS access token on startup: {}", e.getMessage());
        }
    }
}