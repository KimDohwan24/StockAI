package com.stock.domain.stock;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "stocks",
        uniqueConstraints = @UniqueConstraint(columnNames = {"stock_code"}),
        indexes = {
            @Index(name = "idx_stocks_market_type_sector", columnList = "market_type, sector")
        })
public class StockMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stock_code", nullable = false, length = 12)
    private String stockCode;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "sector", length = 50)
    private String sector;

    @Enumerated(EnumType.STRING)
    @Column(name = "market_type", nullable = false, length = 10)
    private MarketType marketType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "current_price", length = 20)
    private String currentPrice;

    @Column(name = "change_value", length = 20)
    private String changeValue;

    @Column(name = "change_sign", length = 5)
    private String changeSign;

    @Column(name = "change_rate", length = 20)
    private String changeRate;

    @Column(name = "volume", length = 20)
    private String volume;

    @Column(name = "market_cap", length = 20)
    private String marketCap;

    @Column(name = "price_updated_at")
    private LocalDateTime priceUpdatedAt;

    protected StockMaster() {}

    public StockMaster(String stockCode, String name, String sector, MarketType marketType) {
        this.stockCode = stockCode;
        this.name = name;
        this.sector = sector;
        this.marketType = marketType;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getStockCode() { return stockCode; }
    public void setStockCode(String stockCode) { this.stockCode = stockCode; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }
    public MarketType getMarketType() { return marketType; }
    public void setMarketType(MarketType marketType) { this.marketType = marketType; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getCurrentPrice() { return currentPrice; }
    public void setCurrentPrice(String currentPrice) { this.currentPrice = currentPrice; }
    public String getChangeValue() { return changeValue; }
    public void setChangeValue(String changeValue) { this.changeValue = changeValue; }
    public String getChangeSign() { return changeSign; }
    public void setChangeSign(String changeSign) { this.changeSign = changeSign; }
    public String getChangeRate() { return changeRate; }
    public void setChangeRate(String changeRate) { this.changeRate = changeRate; }
    public String getVolume() { return volume; }
    public void setVolume(String volume) { this.volume = volume; }
    public String getMarketCap() { return marketCap; }
    public void setMarketCap(String marketCap) { this.marketCap = marketCap; }
    public LocalDateTime getPriceUpdatedAt() { return priceUpdatedAt; }
    public void setPriceUpdatedAt(LocalDateTime priceUpdatedAt) { this.priceUpdatedAt = priceUpdatedAt; }

    public void updatePrice(String currentPrice, String changeValue, String changeSign,
                            String changeRate, String volume, String marketCap) {
        this.currentPrice = currentPrice;
        this.changeValue = changeValue;
        this.changeSign = changeSign;
        this.changeRate = changeRate;
        this.volume = volume;
        this.marketCap = marketCap;
        this.priceUpdatedAt = LocalDateTime.now();
    }

    public void updateFrom(String name, String sector) {
        this.name = name;
        if (sector != null && !sector.isBlank()) {
            this.sector = sector;
        }
        this.updatedAt = LocalDateTime.now();
    }
}