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
    private final com.stock.infrastructure.client.AiServerClient aiServerClient;

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
                if (items != null && !items.isEmpty()) {
                    totalSynced += stockSyncTransactionService.saveDomesticMarketItems(marketDivCode, items);
                }
            } catch (Exception e) {
                log.error("Failed to sync market {} via KIS API: {}", marketDivCode, e.getMessage());
            }
        }

        // KIS API가 실패했거나 결과가 없으면 AI Server (FinanceDataReader)를 통해 전체 상장 주식을 가져와 동기화
        if (totalSynced == 0) {
            log.info("KIS API catalog sync did not return any stocks. Attempting full KRX catalog sync via AI Server (FinanceDataReader)...");
            try {
                List<KisStockMasterItem> items = aiServerClient.getAiDomesticStockMaster();
                if (items != null && !items.isEmpty()) {
                    // KOSPI와 KOSDAQ 구분 저장
                    List<KisStockMasterItem> kospiItems = items.stream()
                            .filter(item -> "KOSPI".equals(item.getMarketType()))
                            .toList();
                    List<KisStockMasterItem> kosdaqItems = items.stream()
                            .filter(item -> "KOSDAQ".equals(item.getMarketType()))
                            .toList();
                    
                    if (!kospiItems.isEmpty()) {
                        totalSynced += stockSyncTransactionService.saveDomesticMarketItems("1", kospiItems);
                    }
                    if (!kosdaqItems.isEmpty()) {
                        totalSynced += stockSyncTransactionService.saveDomesticMarketItems("2", kosdaqItems);
                    }
                    log.info("Successfully synced {} domestic stocks from AI Server (FinanceDataReader)", totalSynced);
                }
            } catch (Exception e) {
                log.error("Failed to sync full domestic stocks via AI Server: {}", e.getMessage(), e);
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
            createFallbackStock("000270", "기아", "자동차", MarketType.KOSPI, "115000", "3000", "2", "2.68", "452901", "46102983"),
            createFallbackStock("207940", "삼성바이오로직스", "바이오", MarketType.KOSPI, "780000", "0", "3", "0.00", "43201", "55129830"),
            createFallbackStock("068270", "셀트리온", "바이오", MarketType.KOSPI, "192000", "2500", "2", "1.32", "283019", "41983012"),
            createFallbackStock("005490", "POSCO홀딩스", "철강소재", MarketType.KOSPI, "385000", "-1000", "5", "-0.26", "112903", "32981029"),
            createFallbackStock("051910", "LG화학", "에너지화학", MarketType.KOSPI, "395000", "-3500", "5", "-0.88", "182901", "27891029"),
            createFallbackStock("006400", "삼성SDI", "에너지화학", MarketType.KOSPI, "412000", "8000", "2", "1.98", "241902", "28301928"),
            createFallbackStock("373220", "LG에너지솔루션", "에너지화학", MarketType.KOSPI, "365000", "-2000", "5", "-0.54", "98102", "85129830"),
            createFallbackStock("105560", "KB금융", "금융", MarketType.KOSPI, "76000", "1200", "2", "1.60", "329810", "31298301"),
            createFallbackStock("055550", "신한지주", "금융", MarketType.KOSPI, "48000", "500", "2", "1.05", "410298", "24893012"),
            createFallbackStock("000810", "삼성화재", "금융", MarketType.KOSPI, "315000", "4500", "2", "1.45", "35102", "14893012"),
            createFallbackStock("028260", "삼성물산", "산업재", MarketType.KOSPI, "152000", "1800", "2", "1.20", "89201", "28190239"),
            createFallbackStock("012330", "현대모비스", "자동차", MarketType.KOSPI, "225000", "-1500", "5", "-0.66", "76102", "21049201"),
            createFallbackStock("003550", "LG", "금융", MarketType.KOSPI, "78000", "200", "2", "0.26", "110298", "12102938"),
            createFallbackStock("034730", "SK", "금융", MarketType.KOSPI, "165000", "-3000", "5", "-1.79", "129031", "11902830"),
            createFallbackStock("015760", "한국전력", "전기가스", MarketType.KOSPI, "21000", "150", "2", "0.72", "891029", "13102938"),
            createFallbackStock("000100", "유한양행", "바이오", MarketType.KOSPI, "74000", "1200", "2", "1.65", "189201", "5893012"),
            createFallbackStock("009150", "삼성전기", "IT", MarketType.KOSPI, "148000", "2200", "2", "1.51", "141029", "11102938"),
            createFallbackStock("010950", "S-Oil", "에너지화학", MarketType.KOSPI, "73500", "-500", "5", "-0.68", "98102", "8293012"),
            createFallbackStock("032640", "LG유플러스", "미디어통신", MarketType.KOSPI, "9800", "40", "2", "0.41", "410298", "4293012"),
            createFallbackStock("017670", "SK텔레콤", "미디어통신", MarketType.KOSPI, "51000", "300", "2", "0.59", "210492", "11102938"),
            createFallbackStock("030200", "KT", "미디어통신", MarketType.KOSPI, "37500", "-200", "5", "-0.53", "190283", "9820129"),
            createFallbackStock("086790", "하나금융지주", "금융", MarketType.KOSPI, "62000", "800", "2", "1.31", "298102", "18290312"),
            createFallbackStock("247540", "에코프로비엠", "에너지화학", MarketType.KOSDAQ, "198000", "-2500", "5", "-1.25", "410298", "19290182"),
            createFallbackStock("086520", "에코프로", "에너지화학", MarketType.KOSDAQ, "92000", "-1800", "5", "-1.92", "671029", "12192039"),
            createFallbackStock("028300", "HLB", "바이오", MarketType.KOSDAQ, "85000", "2200", "2", "2.66", "1102983", "11102938"),
            createFallbackStock("196170", "알테오젠", "바이오", MarketType.KOSDAQ, "178000", "4500", "2", "2.59", "541029", "9293012"),
            createFallbackStock("035900", "JYP Ent.", "자유소비재", MarketType.KOSDAQ, "68000", "-1200", "5", "-1.73", "290182", "2410293"),
            createFallbackStock("253450", "스튜디오드래곤", "미디어통신", MarketType.KOSDAQ, "45000", "300", "2", "0.67", "65102", "1351029"),
            createFallbackStock("091990", "셀트리온제약", "바이오", MarketType.KOSDAQ, "92000", "1500", "2", "1.66", "141029", "3710293"),
            createFallbackStock("277810", "레인보우로보틱스", "중공업", MarketType.KOSDAQ, "168000", "-4200", "5", "-2.44", "410298", "3298102"),
            createFallbackStock("066970", "엘앤에프", "에너지화학", MarketType.KOSDAQ, "145000", "-3500", "5", "-2.36", "182901", "5293012"),
            createFallbackStock("214150", "클래시스", "건강관리", MarketType.KOSDAQ, "37000", "450", "2", "1.23", "92102", "2410293"),
            createFallbackStock("036570", "엔씨소프트", "정보통신", MarketType.KOSPI, "195000", "-2500", "5", "-1.27", "89201", "4293012"),
            createFallbackStock("251270", "넷마블", "정보통신", MarketType.KOSPI, "58000", "600", "2", "1.05", "102931", "4983012"),
            createFallbackStock("293490", "카카오게임즈", "정보통신", MarketType.KOSDAQ, "21000", "-300", "5", "-1.41", "151029", "1710293"),
            createFallbackStock("263750", "펄어비스", "정보통신", MarketType.KOSDAQ, "38500", "400", "2", "1.05", "110293", "2510293"),
            createFallbackStock("058470", "리노공업", "반도체", MarketType.KOSDAQ, "245000", "6000", "2", "2.51", "67102", "3710293"),
            createFallbackStock("000720", "현대건설", "건설", MarketType.KOSPI, "31500", "-400", "5", "-1.25", "182901", "3510293"),
            createFallbackStock("006360", "GS건설", "건설", MarketType.KOSPI, "15800", "200", "2", "1.28", "210492", "1351029"),
            createFallbackStock("047820", "하이브", "자유소비재", MarketType.KOSPI, "215000", "4500", "2", "2.14", "190283", "8920129"),
            createFallbackStock("008770", "호텔신라", "자유소비재", MarketType.KOSPI, "56000", "-800", "5", "-1.41", "76102", "2210293"),
            createFallbackStock("139130", "DGB금융지주", "금융", MarketType.KOSPI, "8500", "120", "2", "1.43", "410298", "1410293"),
            createFallbackStock("175330", "JB금융지주", "금융", MarketType.KOSPI, "12500", "250", "2", "2.04", "151029", "1982012"),
            createFallbackStock("001450", "현대샘표", "필수소비재", MarketType.KOSPI, "51000", "-500", "5", "-0.97", "35102", "1210293"),
            createFallbackStock("004370", "농심", "필수소비재", MarketType.KOSPI, "395000", "7000", "2", "1.80", "41029", "2410293")
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