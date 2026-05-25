package com.stock.domain.basket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "baskets")
@Getter
@Setter
@NoArgsConstructor
public class BasketItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "stock_code", nullable = false, length = 20)
    private String stockCode;

    @Column(name = "stock_name", nullable = false, length = 100)
    private String stockName;

    @Column(name = "target_price", nullable = false)
    private double targetPrice;

    @Column(nullable = false)
    private int weight; // 0 ~ 100

    @Column(name = "is_active", nullable = false)
    private boolean active = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public BasketItem(Long userId, String stockCode, String stockName, double targetPrice, int weight) {
        this.userId = userId;
        this.stockCode = stockCode;
        this.stockName = stockName;
        this.targetPrice = targetPrice;
        this.weight = weight;
    }
}
