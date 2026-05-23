package com.stock.domain.portfolio;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "portfolios",
        indexes = {
            @Index(name = "idx_portfolio_user_id", columnList = "user_id"),
            @Index(name = "idx_portfolio_user_ticker", columnList = "user_id, ticker", unique = true)
        })
public class Portfolio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "ticker", nullable = false, length = 20)
    private String ticker;

    @Column(name = "stock_name", nullable = false, length = 100)
    private String stockName;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "avg_price", nullable = false)
    private double avgPrice;

    @Column(name = "exchange_code", length = 10)
    private String exchangeCode;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    protected Portfolio() {}

    public Portfolio(Long userId, String ticker, String stockName, int quantity, double avgPrice, String exchangeCode) {
        this.userId = userId;
        this.ticker = ticker;
        this.stockName = stockName;
        this.quantity = quantity;
        this.avgPrice = avgPrice;
        this.exchangeCode = exchangeCode;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }
    public String getStockName() { return stockName; }
    public void setStockName(String stockName) { this.stockName = stockName; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public double getAvgPrice() { return avgPrice; }
    public void setAvgPrice(double avgPrice) { this.avgPrice = avgPrice; }
    public String getExchangeCode() { return exchangeCode; }
    public void setExchangeCode(String exchangeCode) { this.exchangeCode = exchangeCode; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public void update(int quantity, double avgPrice) {
        this.quantity = quantity;
        this.avgPrice = avgPrice;
        this.updatedAt = LocalDateTime.now();
    }
}