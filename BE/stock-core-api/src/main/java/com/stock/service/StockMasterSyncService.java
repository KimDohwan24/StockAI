package com.stock.service;

import com.stock.domain.stock.StockMaster;
import com.stock.domain.stock.StockMasterRepository;
import com.stock.domain.stock.MarketType;
import com.stock.infrastructure.client.KisApiClient;
import com.stock.infrastructure.dto.kis.KisStockMasterItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockMasterSyncService {

    private final StockMasterRepository stockMasterRepository;
    private final KisApiClient kisApiClient;
    private final StockSyncTransactionService stockSyncTransactionService;

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



    public int syncFromKis() {
        int totalSynced = 0;
        String[] marketDivCodes = {"1", "2"};
        for (String marketDivCode : marketDivCodes) {
            try {
                List<KisStockMasterItem> items = kisApiClient.getStockMasterList(marketDivCode);
                if (!items.isEmpty()) {
                    totalSynced += stockSyncTransactionService.saveDomesticMarketItems(marketDivCode, items);
                }
            } catch (Exception e) {
                log.error("Failed to sync market {}: {}", marketDivCode, e.getMessage(), e);
            }
        }
        if (totalSynced == 0) {
            totalSynced = seedFallbackDomesticStocks();
        }
        log.info("Stock master sync completed. Total synced: {}", totalSynced);
        return totalSynced;
    }

    @Transactional
    public int seedFallbackDomesticStocks() {
        log.warn("Entering fallback seeding for domestic stocks due to KIS API sync failure...");
        List<StockMaster> fallbackStocks = List.of(
            createFallbackStock("005930", "삼성전자", "반도체", MarketType.KOSPI, "72000", "1500", "2", "2.13", "15482931", "429810482"),
            createFallbackStock("000660", "SK하이닉스", "반도체", MarketType.KOSPI, "185000", "4200", "2", "2.32", "3298102", "134681023"),
            createFallbackStock("035420", "NAVER", "IT", MarketType.KOSPI, "178000", "-1200", "5", "-0.67", "542981", "29104829"),
            createFallbackStock("035720", "카카오", "IT", MarketType.KOSPI, "45000", "200", "2", "0.45", "982103", "19830129"),
            createFallbackStock("005380", "현대차", "자동차", MarketType.KOSPI, "245000", "5000", "2", "2.08", "671029", "51839201"),
            createFallbackStock("207940", "삼성바이오로직스", "바이오", MarketType.KOSPI, "780000", "0", "3", "0.00", "43201", "55129830"),
            createFallbackStock("051910", "LG화학", "에너지화학", MarketType.KOSPI, "395000", "-3500", "5", "-0.88", "182901", "27891029"),
            createFallbackStock("006400", "삼성SDI", "에너지화학", MarketType.KOSPI, "412000", "8000", "2", "1.98", "241902", "28301928"),
            createFallbackStock("091990", "셀트리온헬스케어", "바이오", MarketType.KOSDAQ, "75000", "1200", "2", "1.63", "892102", "11298301"),
            createFallbackStock("277810", "레인보우로보틱스", "중공업", MarketType.KOSDAQ, "168000", "-4200", "5", "-2.44", "410298", "3298102")
        );

        int count = 0;
        for (StockMaster stock : fallbackStocks) {
            if (stockMasterRepository.findByStockCode(stock.getStockCode()).isEmpty()) {
                stockMasterRepository.save(stock);
                count++;
            }
        }
        log.info("Fallback seeding completed. Seeded {} domestic stocks", count);
        return count;
    }

    private StockMaster createFallbackStock(String code, String name, String sector, MarketType marketType,
                                            String price, String change, String sign, String rate, String vol, String cap) {
        StockMaster stock = new StockMaster(code, name, sector, marketType);
        stock.updatePrice(price, change, sign, rate, vol, cap);
        return stock;
    }

    @Transactional
    public int remapSectorCodes() {
        List<StockMaster> allStocks = stockMasterRepository.findAll();
        int updated = 0;
        for (StockMaster stock : allStocks) {
            String sector = stock.getSector();
            if (sector == null || sector.isBlank()) continue;
            if (sector.matches(".*[가-힣].*")) continue;
            String mapped = SECTOR_CODE_MAP.get(sector.trim());
            if (mapped != null) {
                stock.setSector(mapped);
                updated++;
            }
        }
        if (updated > 0) {
            stockMasterRepository.saveAll(allStocks);
        }
        log.info("Sector code remap completed. {} rows updated.", updated);
        return updated;
    }
}