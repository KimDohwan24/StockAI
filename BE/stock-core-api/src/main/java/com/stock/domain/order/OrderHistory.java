package com.stock.domain.order;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_history")
@Getter
@Setter
@NoArgsConstructor
public class OrderHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 20)
    private String ticker;

    @Column(name = "stock_name", nullable = false, length = 100)
    private String stockName;

    @Column(name = "order_type", nullable = false, length = 10)
    private String orderType; // BUY, SELL

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private double price;

    @Column(nullable = false)
    private double amount;

    @Column(name = "ordered_by", nullable = false, length = 10)
    private String orderedBy; // USER, AI

    @Column(name = "reason", length = 1000)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public OrderHistory(Long userId, String ticker, String stockName, String orderType, int quantity, double price, String orderedBy) {
        this.userId = userId;
        this.ticker = ticker;
        this.stockName = stockName;
        this.orderType = orderType;
        this.quantity = quantity;
        this.price = price;
        this.amount = price * quantity;
        this.orderedBy = orderedBy;
    }

    public OrderHistory(Long userId, String ticker, String stockName, String orderType, int quantity, double price, String orderedBy, String reason) {
        this(userId, ticker, stockName, orderType, quantity, price, orderedBy);
        this.reason = reason;
    }
}
