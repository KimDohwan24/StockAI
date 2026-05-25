package com.stock.service;

import com.stock.controller.dto.CatalogPageResponse;
import com.stock.controller.dto.OverseasStockCatalogResponse;
import com.stock.controller.dto.OverseasStockCatalogWithPriceResponse;
import com.stock.domain.overseas.ExchangeCode;
import com.stock.domain.overseas.OverseasStockMaster;
import com.stock.domain.overseas.OverseasStockMasterRepository;
import com.stock.infrastructure.client.KisApiClient;
import com.stock.infrastructure.dto.kis.KisOverseasStockMasterItem;
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
public class OverseasStockCatalogService {

    private static final DateTimeFormatter PRICE_DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final OverseasStockMasterRepository overseasStockMasterRepository;
    private final KisApiClient kisApiClient;
    private final StockSyncTransactionService stockSyncTransactionService;



    @Cacheable(value = "overseasCatalog", key = "#exchangeCode + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogResponse> findByExchangeCode(ExchangeCode exchangeCode, Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findByExchangeCode(exchangeCode, pageable)
                .map(this::toResponse));
    }

    @Cacheable(value = "overseasCatalog", key = "'sector_' + #sector + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogResponse> findBySector(String sector, Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findBySector(sector, pageable)
                .map(this::toResponse));
    }

    @Cacheable(value = "overseasCatalog", key = "#exchangeCode + '_' + #sector + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogResponse> findByExchangeCodeAndSector(ExchangeCode exchangeCode, String sector, Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findByExchangeCodeAndSector(exchangeCode, sector, pageable)
                .map(this::toResponse));
    }

    @Cacheable(value = "overseasCatalog", key = "#country + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogResponse> findByCountry(String country, Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findByCountry(country, pageable)
                .map(this::toResponse));
    }

    @Cacheable(value = "overseasCatalog", key = "#pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogResponse> findAll(Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findAll(pageable)
                .map(this::toResponse));
    }

    @Cacheable(value = "overseasSearch", key = "#query + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogResponse> search(String query, Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findByNameContainingOrTickerContaining(query, query, pageable)
                .map(this::toResponse));
    }

    @Cacheable(value = "overseasCatalog", key = "#pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogWithPriceResponse> findAllWithPrice(Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findAll(pageable)
                .map(this::toResponseWithPrice));
    }

    @Cacheable(value = "overseasCatalog", key = "#exchangeCode + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogWithPriceResponse> findByExchangeCodeWithPrice(ExchangeCode exchangeCode, Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findByExchangeCode(exchangeCode, pageable)
                .map(this::toResponseWithPrice));
    }

    @Cacheable(value = "overseasCatalog", key = "'sector_' + #sector + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogWithPriceResponse> findBySectorWithPrice(String sector, Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findBySector(sector, pageable)
                .map(this::toResponseWithPrice));
    }

    @Cacheable(value = "overseasCatalog", key = "#exchangeCode + '_' + #sector + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogWithPriceResponse> findByExchangeCodeAndSectorWithPrice(ExchangeCode exchangeCode, String sector, Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findByExchangeCodeAndSector(exchangeCode, sector, pageable)
                .map(this::toResponseWithPrice));
    }

    @Cacheable(value = "overseasCatalog", key = "#country + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogWithPriceResponse> findByCountryWithPrice(String country, Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findByCountry(country, pageable)
                .map(this::toResponseWithPrice));
    }

    @Cacheable(value = "overseasSearch", key = "#query + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public CatalogPageResponse<OverseasStockCatalogWithPriceResponse> searchWithPrice(String query, Pageable pageable) {
        return CatalogPageResponse.from(overseasStockMasterRepository.findByNameContainingOrTickerContaining(query, query, pageable)
                .map(this::toResponseWithPrice));
    }

    @Cacheable(value = "sectors", key = "'overseas_all'")
    public List<String> findAllSectors() {
        return overseasStockMasterRepository.findDistinctSectors();
    }

    @Cacheable(value = "sectors", key = "'overseas_' + #exchangeCode")
    public List<String> findSectorsByExchangeCode(ExchangeCode exchangeCode) {
        return overseasStockMasterRepository.findDistinctSectorsByExchangeCode(exchangeCode);
    }

    @CacheEvict(value = {"overseasCatalog", "overseasSearch", "sectors"}, allEntries = true)
    public int syncFromKis() {
        int deleted = stockSyncTransactionService.deleteOverseasStocksNotIn(
                List.of(ExchangeCode.values())
        );
        if (deleted > 0) {
            log.info("Deleted {} non-US overseas stocks", deleted);
        }

        int totalSynced = 0;
        for (ExchangeCode exchangeCode : ExchangeCode.values()) {
            try {
                List<KisOverseasStockMasterItem> items = kisApiClient.getOverseasStockMasterList(exchangeCode.name());
                if (!items.isEmpty()) {
                    totalSynced += stockSyncTransactionService.saveOverseasExchangeItems(exchangeCode, items);
                }
            } catch (Exception e) {
                log.error("Failed to sync exchange {}: {}", exchangeCode, e.getMessage(), e);
            }
        }
        if (totalSynced == 0) {
            totalSynced = seedFallbackOverseasStocks();
        }
        log.info("Overseas stock master sync completed. Total synced: {}", totalSynced);
        return totalSynced;
    }

    @Transactional
    public int seedFallbackOverseasStocks() {
        log.warn("Entering fallback seeding for overseas stocks due to KIS API sync failure...");
        List<OverseasStockMaster> fallbackStocks = List.of(
            createFallbackOverseasStock("AAPL", "Apple Inc.", ExchangeCode.NAS, "미국", "IT", "USD", "189.84", "2.15", "2", "1.15", "52981023"),
            createFallbackOverseasStock("MSFT", "Microsoft Corp.", ExchangeCode.NAS, "미국", "IT", "USD", "421.90", "4.50", "2", "1.08", "21980312"),
            createFallbackStock("TSLA", "Tesla Inc.", ExchangeCode.NAS, "미국", "자동차", "USD", "179.24", "-3.15", "5", "-1.73", "89102391"),
            createFallbackStock("NVDA", "NVIDIA Corp.", ExchangeCode.NAS, "미국", "반도체", "USD", "942.50", "22.40", "2", "2.43", "48102931"),
            createFallbackStock("GOOGL", "Alphabet Inc.", ExchangeCode.NAS, "미국", "IT", "USD", "173.50", "0.85", "2", "0.49", "29102391"),
            createFallbackStock("AMZN", "Amazon.com Inc.", ExchangeCode.NAS, "미국", "유통", "USD", "180.20", "-1.10", "5", "-0.61", "35102931"),
            createFallbackStock("META", "Meta Platforms Inc.", ExchangeCode.NAS, "미국", "IT", "USD", "475.40", "5.20", "2", "1.11", "18290312"),
            createFallbackStock("NKE", "Nike Inc.", ExchangeCode.NYS, "미국", "자유소비재", "USD", "92.10", "0.45", "2", "0.49", "7820192"),
            createFallbackStock("DIS", "Walt Disney Co.", ExchangeCode.NYS, "미국", "서비스", "USD", "102.50", "-0.80", "5", "-0.77", "9102391"),
            createFallbackStock("KO", "Coca-Cola Co.", ExchangeCode.NYS, "미국", "필수소비재", "USD", "62.40", "0.20", "2", "0.32", "12901239")
        );

        int count = 0;
        for (OverseasStockMaster stock : fallbackStocks) {
            if (overseasStockMasterRepository.findByTickerAndExchangeCode(stock.getTicker(), stock.getExchangeCode()).isEmpty()) {
                overseasStockMasterRepository.save(stock);
                count++;
            }
        }
        log.info("Fallback seeding completed. Seeded {} overseas stocks", count);
        return count;
    }

    private OverseasStockMaster createFallbackOverseasStock(String ticker, String name, ExchangeCode exchangeCode,
                                                            String country, String sector, String currency,
                                                            String price, String change, String sign, String rate, String vol) {
        OverseasStockMaster stock = new OverseasStockMaster(ticker, name, exchangeCode, country, sector, currency);
        stock.updatePrice(price, change, sign, rate, vol);
        return stock;
    }

    private OverseasStockMaster createFallbackStock(String ticker, String name, ExchangeCode exchangeCode,
                                                    String country, String sector, String currency,
                                                    String price, String change, String sign, String rate, String vol) {
        return createFallbackOverseasStock(ticker, name, exchangeCode, country, sector, currency, price, change, sign, rate, vol);
    }

    private OverseasStockCatalogResponse toResponse(OverseasStockMaster stock) {
        return new OverseasStockCatalogResponse(
                stock.getTicker(),
                stock.getName(),
                stock.getExchangeCode().name(),
                stock.getCountry(),
                stock.getSector(),
                stock.getCurrency()
        );
    }

    private OverseasStockCatalogWithPriceResponse toResponseWithPrice(OverseasStockMaster stock) {
        String priceUpdatedAt = stock.getPriceUpdatedAt() != null
                ? stock.getPriceUpdatedAt().format(PRICE_DATETIME_FORMATTER)
                : null;

        if (stock.getCurrentPrice() != null) {
            return OverseasStockCatalogWithPriceResponse.of(
                    toResponse(stock),
                    stock.getCurrentPrice(),
                    stock.getChangeValue(),
                    stock.getChangeSign(),
                    stock.getChangeRate(),
                    stock.getVolume(),
                    priceUpdatedAt
            );
        }
        return OverseasStockCatalogWithPriceResponse.withoutPrice(toResponse(stock));
    }
}