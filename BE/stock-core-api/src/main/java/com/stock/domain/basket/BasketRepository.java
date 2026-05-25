package com.stock.domain.basket;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BasketRepository extends JpaRepository<BasketItem, Long> {
    List<BasketItem> findAllByUserId(Long userId);
    List<BasketItem> findAllByActiveTrue();
    boolean existsByUserIdAndStockCode(Long userId, String stockCode);
}
