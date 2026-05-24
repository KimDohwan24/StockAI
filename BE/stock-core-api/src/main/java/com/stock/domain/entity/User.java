package com.stock.domain.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "initial_balance", nullable = false)
    private double initialBalance = 100000000.0;

    @Column(name = "cash_balance", nullable = false)
    private double cashBalance = 100000000.0;

    @Column(name = "ai_trading_enabled", nullable = false)
    private boolean aiTradingEnabled = false;

    @Column(name = "mock_order_enabled", nullable = false)
    private boolean mockOrderEnabled = false;


    @Enumerated(EnumType.STRING)
    @Column(name = "risk_profile", nullable = false)
    private RiskProfile riskProfile = RiskProfile.MEDIUM;

    @Column(name = "ai_trading_allocation_ratio", nullable = false)
    private double aiTradingAllocationRatio = 0.10;

    public enum RiskProfile {
        HIGH, MEDIUM, LOW
    }

    public enum Role {
        USER, ADMIN
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public double getInitialBalance() {
        return initialBalance;
    }

    public void setInitialBalance(double initialBalance) {
        this.initialBalance = initialBalance;
    }

    public double getCashBalance() {
        return cashBalance;
    }

    public void setCashBalance(double cashBalance) {
        this.cashBalance = cashBalance;
    }

    public boolean isAiTradingEnabled() {
        return aiTradingEnabled;
    }

    public void setAiTradingEnabled(boolean aiTradingEnabled) {
        this.aiTradingEnabled = aiTradingEnabled;
    }

    public boolean isMockOrderEnabled() {
        return mockOrderEnabled;
    }

    public void setMockOrderEnabled(boolean mockOrderEnabled) {
        this.mockOrderEnabled = mockOrderEnabled;
    }


    public RiskProfile getRiskProfile() {
        return riskProfile;
    }

    public void setRiskProfile(RiskProfile riskProfile) {
        this.riskProfile = riskProfile;
    }

    public double getAiTradingAllocationRatio() {
        return aiTradingAllocationRatio;
    }

    public void setAiTradingAllocationRatio(double aiTradingAllocationRatio) {
        this.aiTradingAllocationRatio = aiTradingAllocationRatio;
    }
}
