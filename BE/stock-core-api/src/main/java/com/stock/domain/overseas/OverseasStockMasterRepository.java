package com.stock.domain.overseas;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface OverseasStockMasterRepository extends JpaRepository<OverseasStockMaster, Long> {
    Page<OverseasStockMaster> findByExchangeCode(ExchangeCode exchangeCode, Pageable pageable);
    Page<OverseasStockMaster> findBySector(String sector, Pageable pageable);
    Page<OverseasStockMaster> findByExchangeCodeAndSector(ExchangeCode exchangeCode, String sector, Pageable pageable);
    Page<OverseasStockMaster> findByCountry(String country, Pageable pageable);
    Page<OverseasStockMaster> findByNameContainingOrTickerContaining(String name, String ticker, Pageable pageable);
    List<OverseasStockMaster> findAllByExchangeCode(ExchangeCode exchangeCode);
    Optional<OverseasStockMaster> findByTickerAndExchangeCode(String ticker, ExchangeCode exchangeCode);
    List<OverseasStockMaster> findByTickerInAndExchangeCode(List<String> tickers, ExchangeCode exchangeCode);

    @Query("SELECT o FROM OverseasStockMaster o WHERE o.ticker IN :tickers AND o.exchangeCode IN :exchangeCodes")
    List<OverseasStockMaster> findAllByTickerInAndExchangeCodeIn(@Param("tickers") List<String> tickers, @Param("exchangeCodes") Set<ExchangeCode> exchangeCodes);

    @Modifying
    @Query("DELETE FROM OverseasStockMaster o WHERE o.exchangeCode NOT IN :exchanges")
    int deleteByExchangeCodeNotIn(List<ExchangeCode> exchanges);

    @Query("SELECT DISTINCT o.sector FROM OverseasStockMaster o WHERE o.sector IS NOT NULL AND o.sector != ''")
    List<String> findDistinctSectors();

    @Query("SELECT DISTINCT o.sector FROM OverseasStockMaster o WHERE o.exchangeCode = :exchangeCode AND o.sector IS NOT NULL AND o.sector != ''")
    List<String> findDistinctSectorsByExchangeCode(@Param("exchangeCode") ExchangeCode exchangeCode);
}