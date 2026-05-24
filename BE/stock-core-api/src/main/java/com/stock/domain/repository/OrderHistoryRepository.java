package com.stock.domain.repository;

import com.stock.domain.order.OrderHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderHistoryRepository extends JpaRepository<OrderHistory, Long> {
    List<OrderHistory> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}
