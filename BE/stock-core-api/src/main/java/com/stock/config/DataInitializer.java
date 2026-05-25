package com.stock.config;

import com.stock.domain.entity.User;
import com.stock.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("Initializing test accounts for AI stock trading...");

        createTestUserIfNotExist("high@stockai.com", "stockai123!", "상 (공격형 AI)", User.RiskProfile.HIGH);
        createTestUserIfNotExist("medium@stockai.com", "stockai123!", "중 (중립형 AI)", User.RiskProfile.MEDIUM);
        createTestUserIfNotExist("low@stockai.com", "stockai123!", "하 (안정형 AI)", User.RiskProfile.LOW);
        createKisUserIfNotExist("kis_high@stockai.com", "stockai123!", "상 (공격형 KIS AI)", User.RiskProfile.HIGH);
        createKisUserIfNotExist("kis_medium@stockai.com", "stockai123!", "중 (중립형 KIS AI)", User.RiskProfile.MEDIUM);
        createKisUserIfNotExist("kis_low@stockai.com", "stockai123!", "하 (안정형 KIS AI)", User.RiskProfile.LOW);
        createAdminUserIfNotExist("admin@stockai.com", "stockai123!", "관리자");

        log.info("Test accounts initialization completed successfully");
    }

    private void createTestUserIfNotExist(String email, String rawPassword, String name, User.RiskProfile riskProfile) {
        if (!userRepository.existsByEmail(email)) {
            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setName(name);
            user.setRole(User.Role.USER);
            user.setAiTradingEnabled(true);
            user.setRiskProfile(riskProfile);
            user.setAiTradingAllocationRatio(0.10); // 10% allocation per order
            user.setInitialBalance(100000000.0); // 100M KRW
            user.setCashBalance(100000000.0);
            userRepository.save(user);
            log.info("Created test user: {} (Risk Profile: {})", email, riskProfile);
        } else {
            log.info("Test user already exists: {}", email);
        }
    }

    private void createKisUserIfNotExist(String email, String rawPassword, String name, User.RiskProfile riskProfile) {
        if (!userRepository.existsByEmail(email)) {
            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setName(name);
            user.setRole(User.Role.USER);
            user.setAiTradingEnabled(true);
            user.setMockOrderEnabled(true);
            user.setRiskProfile(riskProfile);
            user.setAiTradingAllocationRatio(0.10); // 10% allocation per order
            user.setInitialBalance(100000000.0); // 100M KRW
            user.setCashBalance(100000000.0);
            userRepository.save(user);
            log.info("Created KIS test user: {} (Risk Profile: {})", email, riskProfile);
        } else {
            log.info("KIS test user already exists: {}", email);
        }
    }

    private void createAdminUserIfNotExist(String email, String rawPassword, String name) {
        if (!userRepository.existsByEmail(email)) {
            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setName(name);
            user.setRole(User.Role.ADMIN);
            user.setAiTradingEnabled(false);
            user.setRiskProfile(User.RiskProfile.MEDIUM);
            user.setInitialBalance(0.0);
            user.setCashBalance(0.0);
            userRepository.save(user);
            log.info("Created admin user: {}", email);
        } else {
            log.info("Admin user already exists: {}", email);
        }
    }
}
