package com.stock.service;

import com.stock.controller.dto.CatalogPageResponse;
import com.stock.controller.dto.StockCatalogResponse;
import com.stock.controller.dto.StockCatalogWithPriceResponse;
import com.stock.domain.stock.MarketType;
import com.stock.domain.stock.StockMaster;
import com.stock.domain.stock.StockMasterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockCatalogService {

    private static final DateTimeFormatter PRICE_DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final StockMasterRepository stockMasterRepository;
    private final StockMasterSyncService stockMasterSyncService;

    @Cacheable(value = "stockCatalog", key = "#marketType + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<StockCatalogResponse> findAll(MarketType marketType, Pageable pageable) {
        if (marketType != null) {
            return CatalogPageResponse.from(stockMasterRepository.findByMarketType(marketType, pageable)
                    .map(this::toResponse));
        }
        return CatalogPageResponse.from(stockMasterRepository.findAll(pageable)
                .map(this::toResponse));
    }

    @Cacheable(value = "stockSearch", key = "#query + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<StockCatalogResponse> search(String query, Pageable pageable) {
        return CatalogPageResponse.from(stockMasterRepository.findByNameContainingOrStockCodeContaining(query, query, pageable)
                .map(this::toResponse));
    }

    @Cacheable(value = "stockCatalog", key = "#marketType + '_' + #sector + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<StockCatalogResponse> findByMarketTypeAndSector(MarketType marketType, String sector, Pageable pageable) {
        return CatalogPageResponse.from(stockMasterRepository.findByMarketTypeAndSector(marketType, sector, pageable)
                .map(this::toResponse));
    }

    @Cacheable(value = "stockCatalog", key = "'sector_' + #sector + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<StockCatalogResponse> findBySector(String sector, Pageable pageable) {
        return CatalogPageResponse.from(stockMasterRepository.findBySector(sector, pageable)
                .map(this::toResponse));
    }

    @Cacheable(value = "stockCatalog", key = "#marketType + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<StockCatalogWithPriceResponse> findAllWithPrice(MarketType marketType, Pageable pageable) {
        if (marketType != null) {
            return CatalogPageResponse.from(stockMasterRepository.findByMarketType(marketType, pageable)
                    .map(this::toResponseWithPrice));
        }
        return CatalogPageResponse.from(stockMasterRepository.findAll(pageable)
                .map(this::toResponseWithPrice));
    }

    @Cacheable(value = "stockCatalog", key = "#marketType + '_' + #sector + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<StockCatalogWithPriceResponse> findByMarketTypeAndSectorWithPrice(MarketType marketType, String sector, Pageable pageable) {
        return CatalogPageResponse.from(stockMasterRepository.findByMarketTypeAndSector(marketType, sector, pageable)
                .map(this::toResponseWithPrice));
    }

    @Cacheable(value = "stockCatalog", key = "'sector_' + #sector + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<StockCatalogWithPriceResponse> findBySectorWithPrice(String sector, Pageable pageable) {
        return CatalogPageResponse.from(stockMasterRepository.findBySector(sector, pageable)
                .map(this::toResponseWithPrice));
    }

    @Cacheable(value = "stockSearch", key = "#query + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<StockCatalogWithPriceResponse> searchWithPrice(String query, Pageable pageable) {
        return CatalogPageResponse.from(stockMasterRepository.findByNameContainingOrStockCodeContaining(query, query, pageable)
                .map(this::toResponseWithPrice));
    }

    @Cacheable(value = "sectors", key = "'domestic_all'")
    public List<String> findAllSectors() {
        return stockMasterRepository.findDistinctSectors();
    }

    @Cacheable(value = "sectors", key = "'domestic_' + #marketType")
    public List<String> findSectorsByMarketType(MarketType marketType) {
        return stockMasterRepository.findDistinctSectorsByMarketType(marketType);
    }

    @CacheEvict(value = {"stockCatalog", "stockSearch", "sectors"}, allEntries = true)
    @Transactional
    public int syncFromKis() {
        return stockMasterSyncService.syncFromKis();
    }

    @CacheEvict(value = {"stockCatalog", "stockSearch", "sectors"}, allEntries = true)
    @Transactional
    public int remapSectorCodes() {
        return stockMasterSyncService.remapSectorCodes();
    }

    private StockCatalogResponse toResponse(StockMaster stock) {
        return new StockCatalogResponse(
                stock.getStockCode(),
                stock.getName(),
                stock.getSector(),
                stock.getMarketType().name()
        );
    }

    private StockCatalogWithPriceResponse toResponseWithPrice(StockMaster stock) {
        String priceUpdatedAt = stock.getPriceUpdatedAt() != null
                ? stock.getPriceUpdatedAt().format(PRICE_DATETIME_FORMATTER)
                : null;

        if (stock.getCurrentPrice() != null) {
            return StockCatalogWithPriceResponse.of(
                    toResponse(stock),
                    stock.getCurrentPrice(),
                    stock.getChangeValue(),
                    stock.getChangeSign(),
                    stock.getChangeRate(),
                    stock.getVolume(),
                    stock.getMarketCap(),
                    priceUpdatedAt
            );
        }
        return StockCatalogWithPriceResponse.withoutPrice(toResponse(stock));
    }
}