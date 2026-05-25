package com.stock.service;

import com.stock.domain.entity.User;
import com.stock.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));
    }

    @Transactional
    public User updateUserProfile(String email, String name, double initialBalance, double cashBalance) {
        User user = getUserByEmail(email);
        user.setName(name);
        user.setInitialBalance(initialBalance);
        user.setCashBalance(cashBalance);
        return userRepository.save(user);
    }

    @Transactional
    public User updateAiConfig(String email, boolean enabled, User.RiskProfile riskProfile, double aiTradingAllocationRatio) {
        User user = getUserByEmail(email);
        user.setAiTradingEnabled(enabled);
        user.setRiskProfile(riskProfile);
        user.setAiTradingAllocationRatio(aiTradingAllocationRatio);
        return userRepository.save(user);
    }
}
