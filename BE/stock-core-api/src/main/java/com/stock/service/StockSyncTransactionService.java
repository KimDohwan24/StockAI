package com.stock.service;

import com.stock.domain.overseas.ExchangeCode;
import com.stock.domain.overseas.OverseasStockMaster;
import com.stock.domain.overseas.OverseasStockMasterRepository;
import com.stock.domain.stock.MarketType;
import com.stock.domain.stock.StockMaster;
import com.stock.domain.stock.StockMasterRepository;
import com.stock.infrastructure.dto.kis.KisStockMasterItem;
import com.stock.infrastructure.dto.kis.KisOverseasStockMasterItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockSyncTransactionService {

    private final StockMasterRepository stockMasterRepository;
    private final OverseasStockMasterRepository overseasStockMasterRepository;

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

    private static final Map<String, String> SECTOR_CODE_MAP = Map.ofEntries(
            Map.entry("1", "건설"),
            Map.entry("2", "중공업"),
            Map.entry("3", "철강소재"),
            Map.entry("4", "에너지화학"),
            Map.entry("5", "정보통신"),
            Map.entry("6", "금융"),
            Map.entry("7", "필수소비재"),
            Map.entry("8", "자유소비재"),
            Map.entry("9", "산업재"),
            Map.entry("A", "건강관리"),
            Map.entry("B", "커뮤니케이션서비스"),
            Map.entry("C", "반도체"),
            Map.entry("D", "자동차"),
            Map.entry("E", "은행"),
            Map.entry("F", "바이오"),
            Map.entry("G", "미디어통신"),
            Map.entry("01", "건설"),
            Map.entry("02", "중공업"),
            Map.entry("03", "철강소재"),
            Map.entry("04", "에너지화학"),
            Map.entry("05", "정보통신"),
            Map.entry("06", "금융"),
            Map.entry("07", "필수소비재"),
            Map.entry("08", "자유소비재"),
            Map.entry("09", "산업재"),
            Map.entry("10", "건강관리"),
            Map.entry("11", "커뮤니케이션서비스"),
            Map.entry("12", "반도체"),
            Map.entry("13", "자동차"),
            Map.entry("14", "은행"),
            Map.entry("15", "바이오"),
            Map.entry("16", "미디어통신"),
            Map.entry("17", "철강"),
            Map.entry("18", "기계"),
            Map.entry("19", "조선"),
            Map.entry("20", "전기전자"),
            Map.entry("21", "화학"),
            Map.entry("22", "에너지"),
            Map.entry("23", "정유"),
            Map.entry("24", "비철금속"),
            Map.entry("25", "섬유"),
            Map.entry("26", "종이"),
            Map.entry("27", "광업"),
            Map.entry("28", "농업"),
            Map.entry("29", "건축"),
            Map.entry("30", "식품"),
            Map.entry("31", "의류"),
            Map.entry("32", "유통"),
            Map.entry("33", "호텔"),
            Map.entry("34", "서비스"),
            Map.entry("35", "운수"),
            Map.entry("36", "통신"),
            Map.entry("37", "제약"),
            Map.entry("38", "의료"),
            Map.entry("39", "전력"),
            Map.entry("40", "가스"),
            Map.entry("41", "폐기물"),
            Map.entry("42", "부동산"),
            Map.entry("43", "소프트웨어"),
            Map.entry("44", "하드웨어"),
            Map.entry("45", "인터넷"),
            Map.entry("46", "게임"),
            Map.entry("47", "방송"),
            Map.entry("48", "출판"),
            Map.entry("49", "교육"),
            Map.entry("50", "여가"),
            Map.entry("51", "해운"),
            Map.entry("52", "항공"),
            Map.entry("53", "철도"),
            Map.entry("54", "물류"),
            Map.entry("55", "도소매"),
            Map.entry("56", "증권"),
            Map.entry("57", "보험"),
            Map.entry("58", "기타금융"),
            Map.entry("59", "기타"),
            Map.entry("0000", "기타"),
            Map.entry("0005", "음식료품"),
            Map.entry("0006", "섬유의복"),
            Map.entry("0007", "종이목재"),
            Map.entry("0008", "화학"),
            Map.entry("0009", "의약품"),
            Map.entry("0010", "비철금속"),
            Map.entry("0011", "철강금속"),
            Map.entry("0012", "기계"),
            Map.entry("0013", "전기전자"),
            Map.entry("0014", "의료정밀"),
            Map.entry("0015", "운수장비"),
            Map.entry("0024", "증권"),
            Map.entry("0025", "보험"),
            Map.entry("1019", "음식료품"),
            Map.entry("1020", "섬유의복"),
            Map.entry("1021", "종이목재"),
            Map.entry("1022", "가구"),
            Map.entry("1023", "화학"),
            Map.entry("1024", "의약품"),
            Map.entry("1025", "비철금속"),
            Map.entry("1026", "철강금속"),
            Map.entry("1027", "기계"),
            Map.entry("1028", "전기전자"),
            Map.entry("1029", "의료정밀"),
            Map.entry("1030", "운수장비"),
            Map.entry("1031", "기타"),
            Map.entry("CG01", "음식료품"),
            Map.entry("CG02", "섬유의복"),
            Map.entry("CG03", "종이목재"),
            Map.entry("CG04", "화학"),
            Map.entry("CG05", "의약품"),
            Map.entry("CG06", "비철금속"),
            Map.entry("CG07", "철강금속"),
            Map.entry("CG08", "기계"),
            Map.entry("CG09", "전기전자"),
            Map.entry("CG10", "의료정밀"),
            Map.entry("CG11", "운수장비"),
            Map.entry("CG12", "건설"),
            Map.entry("CG13", "유통"),
            Map.entry("CG14", "운수창고"),
            Map.entry("CG15", "방송통신"),
            Map.entry("CG16", "금융"),
            Map.entry("CG17", "IT"),
            Map.entry("CG18", "전기가스"),
            Map.entry("CG19", "서비스"),
            Map.entry("CG20", "정유"),
            Map.entry("CG21", "철강"),
            Map.entry("CG22", "반도체"),
            Map.entry("CG23", "건축"),
            Map.entry("CG24", "자동차"),
            Map.entry("CG25", "조선"),
            Map.entry("CG26", "농업임업어업"),
            Map.entry("0111", "농업임업어업"),
            Map.entry("0121", "광업"),
            Map.entry("0131", "음식료품"),
            Map.entry("0141", "섬유의복"),
            Map.entry("0151", "종이목재"),
            Map.entry("0159", "가구"),
            Map.entry("0161", "화학"),
            Map.entry("0171", "의약품"),
            Map.entry("0181", "비철금속"),
            Map.entry("0191", "철강금속"),
            Map.entry("0201", "기계"),
            Map.entry("0211", "전기전자"),
            Map.entry("0221", "의료정밀"),
            Map.entry("0231", "운수장비"),
            Map.entry("0241", "건설"),
            Map.entry("0251", "유통"),
            Map.entry("0261", "운수창고"),
            Map.entry("0271", "방송통신"),
            Map.entry("0281", "금융"),
            Map.entry("0291", "IT"),
            Map.entry("0301", "전기가스"),
            Map.entry("0311", "서비스"),
            Map.entry("0321", "정유"),
            Map.entry("0331", "철강"),
            Map.entry("0341", "반도체"),
            Map.entry("0351", "건축"),
            Map.entry("0361", "자동차"),
            Map.entry("0371", "조선"),
            Map.entry("0381", "가스"),
            Map.entry("0391", "부동산"),
            Map.entry("0401", "소프트웨어"),
            Map.entry("0411", "하드웨어"),
            Map.entry("0421", "인터넷"),
            Map.entry("0431", "게임"),
            Map.entry("0441", "방송"),
            Map.entry("0451", "출판"),
            Map.entry("0461", "교육"),
            Map.entry("0471", "여가"),
            Map.entry("0481", "해운"),
            Map.entry("0491", "항공"),
            Map.entry("0501", "철도"),
            Map.entry("0511", "물류"),
            Map.entry("0521", "도소매"),
            Map.entry("0531", "증권"),
            Map.entry("0541", "보험"),
            Map.entry("0551", "기타금융"),
            Map.entry("0561", "호텔"),
            Map.entry("0571", "레저"),
            Map.entry("0581", "환경"),
            Map.entry("0591", "기타")
    );

    private String resolveSectorName(String code) {
        if (code == null || code.isBlank()) return null;
        String trimmed = code.trim();
        if (trimmed.matches(".*[가-힣].*")) return trimmed;
        String name = SECTOR_CODE_MAP.get(trimmed);
        if (name == null) {
            log.warn("Unknown sector code: '{}' — not in SECTOR_CODE_MAP", trimmed);
        }
        return name != null ? name : null;
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

    @Transactional
    public int saveDomesticMarketItems(String marketDivCode, List<KisStockMasterItem> items) {
        List<String> stockCodes = items.stream()
                .map(KisStockMasterItem::getSht_cd)
                .filter(c -> c != null && !c.isBlank())
                .toList();

        MarketType marketType = "1".equals(marketDivCode) ? MarketType.KOSPI : MarketType.KOSDAQ;

        Map<String, StockMaster> existingMap = stockMasterRepository
                .findByStockCodeIn(stockCodes).stream()
                .collect(Collectors.toMap(StockMaster::getStockCode, Function.identity()));

        int count = 0;
        for (KisStockMasterItem item : items) {
            try {
                String stockCode = item.getSht_cd();
                if (stockCode == null || stockCode.isBlank()) continue;

                String sector = resolveSectorName(item.getKor_sect_tp_cd());
                StockMaster existing = existingMap.get(stockCode);
                if (existing != null) {
                    existing.updateFrom(item.getKor_abbrv(), sector);
                } else {
                    StockMaster stock = new StockMaster(stockCode, item.getKor_abbrv(), sector, marketType);
                    existingMap.put(stockCode, stock);
                    count++;
                }
            } catch (Exception e) {
                log.error("Failed to sync stock item: code={}, name={}, error={}",
                        item.getSht_cd(), item.getKor_abbrv(), e.getMessage());
            }
        }

        stockMasterRepository.saveAll(existingMap.values());
        log.info("Synced {} new stocks for market {} (batch saved {} total)", count, marketDivCode, existingMap.size());
        return count;
    }

    @Transactional
    public int saveOverseasExchangeItems(ExchangeCode exchangeCode, List<KisOverseasStockMasterItem> items) {
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

    @Transactional
    public int deleteOverseasStocksNotIn(List<ExchangeCode> exchangeCodes) {
        return overseasStockMasterRepository.deleteByExchangeCodeNotIn(exchangeCodes);
    }
}
