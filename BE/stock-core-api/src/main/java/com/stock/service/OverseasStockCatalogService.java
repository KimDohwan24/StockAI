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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OverseasStockCatalogService {

    private static final DateTimeFormatter PRICE_DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final OverseasStockMasterRepository overseasStockMasterRepository;
    private final KisApiClient kisApiClient;

    private static final Map<String, String> EXCHANGE_COUNTRY_MAP = new HashMap<>();
    private static final Map<String, String> EXCHANGE_CURRENCY_MAP = new HashMap<>();

    static {
        EXCHANGE_COUNTRY_MAP.put("NAS", "US");
        EXCHANGE_COUNTRY_MAP.put("NYS", "US");
        EXCHANGE_COUNTRY_MAP.put("AMS", "US");

        EXCHANGE_CURRENCY_MAP.put("NAS", "USD");
        EXCHANGE_CURRENCY_MAP.put("NYS", "USD");
        EXCHANGE_CURRENCY_MAP.put("AMS", "USD");
    }

    private String resolveCountry(String apiNatnCd, ExchangeCode exchangeCode) {
        if (apiNatnCd != null && !apiNatnCd.isBlank()) {
            return apiNatnCd;
        }
        return EXCHANGE_COUNTRY_MAP.getOrDefault(exchangeCode.name(), "UNKNOWN");
    }

    private String resolveCurrency(String apiCrcyCd, ExchangeCode exchangeCode) {
        if (apiCrcyCd != null && !apiCrcyCd.isBlank()) {
            return apiCrcyCd;
        }
        return EXCHANGE_CURRENCY_MAP.getOrDefault(exchangeCode.name(), "UNKNOWN");
    }

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
    @Transactional
    public int syncFromKis() {
        int deleted = overseasStockMasterRepository.deleteByExchangeCodeNotIn(
                List.of(ExchangeCode.values())
        );
        if (deleted > 0) {
            log.info("Deleted {} non-US overseas stocks", deleted);
        }

        int totalSynced = 0;
        for (ExchangeCode exchangeCode : ExchangeCode.values()) {
            try {
                totalSynced += syncExchange(exchangeCode);
            } catch (Exception e) {
                log.error("Failed to sync exchange {}: {}", exchangeCode, e.getMessage(), e);
            }
        }
        log.info("Overseas stock master sync completed. Total synced: {}", totalSynced);
        return totalSynced;
    }

    @Transactional
    public int syncExchange(ExchangeCode exchangeCode) {
        List<KisOverseasStockMasterItem> items = kisApiClient.getOverseasStockMasterList(exchangeCode.name());
        if (items.isEmpty()) {
            log.warn("No items returned for exchange {}", exchangeCode);
            return 0;
        }

        List<String> tickers = items.stream()
                .map(KisOverseasStockMasterItem::getSymb)
                .filter(t -> t != null && !t.isBlank())
                .toList();

        Map<String, OverseasStockMaster> existingMap = overseasStockMasterRepository
                .findByTickerInAndExchangeCode(tickers, exchangeCode).stream()
                .collect(Collectors.toMap(OverseasStockMaster::getTicker, Function.identity()));

        int count = 0;
        for (KisOverseasStockMasterItem item : items) {
            try {
                String ticker = item.getSymb();
                if (ticker == null || ticker.isBlank()) continue;

                String country = resolveCountry(item.getTr_natn_cd(), exchangeCode);
                String currency = resolveCurrency(item.getCrcy_cd(), exchangeCode);
                String sector = item.getKor_sect_nm();

                OverseasStockMaster existing = existingMap.get(ticker);
                if (existing != null) {
                    String updateSector = sector != null ? sector : existing.getSector();
                    existing.updateFrom(item.getItem_name(), updateSector, country, currency);
                } else {
                    OverseasStockMaster stock = new OverseasStockMaster(
                            ticker,
                            item.getItem_name(),
                            exchangeCode,
                            country,
                            sector,
                            currency
                    );
                    existingMap.put(ticker, stock);
                    count++;
                }
            } catch (Exception e) {
                log.error("Failed to sync overseas stock item: symb={}, name={}, error={}",
                        item.getSymb(), item.getItem_name(), e.getMessage());
            }
        }

        overseasStockMasterRepository.saveAll(existingMap.values());
        log.info("Synced {} new stocks for exchange {} (batch saved {} total)", count, exchangeCode, existingMap.size());
        return count;
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