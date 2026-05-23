package com.stock.domain.overseas;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "overseas_stocks",
        uniqueConstraints = @UniqueConstraint(columnNames = {"ticker", "exchange_code"}),
        indexes = {
            @Index(name = "idx_overseas_exchange_code", columnList = "exchange_code"),
            @Index(name = "idx_overseas_country", columnList = "country"),
            @Index(name = "idx_overseas_sector", columnList = "sector")
        })
public class OverseasStockMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticker", nullable = false, length = 20)
    private String ticker;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "exchange_code", nullable = false, length = 10)
    private ExchangeCode exchangeCode;

    @Column(name = "country", nullable = false, length = 30)
    private String country;

    @Column(name = "sector", length = 100)
    private String sector;

    @Column(name = "currency", nullable = false, length = 5)
    private String currency;

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

    @Column(name = "price_updated_at")
    private LocalDateTime priceUpdatedAt;

    protected OverseasStockMaster() {}

    public OverseasStockMaster(String ticker, String name, ExchangeCode exchangeCode, String country, String sector, String currency) {
        this.ticker = ticker;
        this.name = name;
        this.exchangeCode = exchangeCode;
        this.country = country;
        this.sector = sector;
        this.currency = currency;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public ExchangeCode getExchangeCode() { return exchangeCode; }
    public void setExchangeCode(ExchangeCode exchangeCode) { this.exchangeCode = exchangeCode; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
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
    public LocalDateTime getPriceUpdatedAt() { return priceUpdatedAt; }
    public void setPriceUpdatedAt(LocalDateTime priceUpdatedAt) { this.priceUpdatedAt = priceUpdatedAt; }

    public void updatePrice(String currentPrice, String changeValue, String changeSign,
                            String changeRate, String volume) {
        this.currentPrice = currentPrice;
        this.changeValue = changeValue;
        this.changeSign = changeSign;
        this.changeRate = changeRate;
        this.volume = volume;
        this.priceUpdatedAt = LocalDateTime.now();
    }

    public void updateFrom(String name, String sector) {
        this.name = name;
        if (sector != null && !sector.isBlank()) {
            this.sector = sector;
        }
        this.updatedAt = LocalDateTime.now();
    }

    public void updateFrom(String name, String sector, String country, String currency) {
        this.name = name;
        if (sector != null && !sector.isBlank()) {
            this.sector = sector;
        }
        this.country = country;
        this.currency = currency;
        this.updatedAt = LocalDateTime.now();
    }
}