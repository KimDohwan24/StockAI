package com.stock.domain.stock;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StockMasterRepository extends JpaRepository<StockMaster, Long> {
    Optional<StockMaster> findByStockCode(String stockCode);
    Page<StockMaster> findByMarketType(MarketType marketType, Pageable pageable);
    Page<StockMaster> findByNameContainingOrStockCodeContaining(String name, String code, Pageable pageable);
    Page<StockMaster> findByMarketTypeAndSector(MarketType marketType, String sector, Pageable pageable);
    Page<StockMaster> findBySector(String sector, Pageable pageable);
    List<StockMaster> findAllByMarketType(MarketType marketType);
    List<StockMaster> findByStockCodeIn(List<String> stockCodes);

    @Query("SELECT DISTINCT s.sector FROM StockMaster s WHERE s.sector IS NOT NULL AND s.sector != ''")
    List<String> findDistinctSectors();

    @Query("SELECT DISTINCT s.sector FROM StockMaster s WHERE s.marketType = :marketType AND s.sector IS NOT NULL AND s.sector != ''")
    List<String> findDistinctSectorsByMarketType(@Param("marketType") MarketType marketType);
}