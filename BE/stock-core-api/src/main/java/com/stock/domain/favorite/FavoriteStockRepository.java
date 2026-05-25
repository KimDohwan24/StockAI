package com.stock.domain.favorite;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FavoriteStockRepository extends JpaRepository<FavoriteStock, Long> {
    List<FavoriteStock> findAllByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<FavoriteStock> findByUserIdAndStockCode(Long userId, String stockCode);
    boolean existsByUserIdAndStockCode(Long userId, String stockCode);
}
