package com.stock.service;

import com.stock.controller.dto.BacktestRequestDto;
import com.stock.controller.dto.BacktestResponseDto;
import com.stock.domain.basket.BasketItem;
import com.stock.domain.basket.BasketRepository;
import com.stock.domain.entity.User;
import com.stock.domain.repository.UserRepository;
import com.stock.domain.stock.StockMasterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BasketService {

    private final BasketRepository basketRepository;
    private final UserRepository userRepository;
    private final StockMasterRepository stockMasterRepository;
    private final StockPriceService stockPriceService;

    @Transactional(readOnly = true)
    public List<BasketItem> getBasketItems(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));
        return basketRepository.findAllByUserId(user.getId());
    }

    @Transactional
    public BasketItem addBasketItem(String email, String stockCode, double targetPrice, int weight) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));

        if (basketRepository.existsByUserIdAndStockCode(user.getId(), stockCode)) {
            throw new IllegalArgumentException("이미 장바구니에 존재하는 종목입니다.");
        }

        String stockName = stockMasterRepository.findByStockCode(stockCode)
                .map(com.stock.domain.stock.StockMaster::getName)
                .orElse(stockCode);

        BasketItem item = new BasketItem(user.getId(), stockCode, stockName, targetPrice, weight);
        return basketRepository.save(item);
    }

    @Transactional
    public BasketItem updateBasketItem(String email, Long id, double targetPrice, int weight) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));
        
        BasketItem item = basketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("장바구니 항목을 찾을 수 없습니다: " + id));

        if (!item.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }

        item.setTargetPrice(targetPrice);
        item.setWeight(weight);
        return basketRepository.save(item);
    }

    @Transactional
    public void deleteBasketItem(String email, Long id) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));

        BasketItem item = basketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("장바구니 항목을 찾을 수 없습니다: " + id));

        if (!item.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }

        basketRepository.delete(item);
    }

    @Transactional
    public BasketItem toggleActive(String email, Long id) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + email));

        BasketItem item = basketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("장바구니 항목을 찾을 수 없습니다: " + id));

        if (!item.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("권한이 없습니다.");
        }

        item.setActive(!item.isActive());
        return basketRepository.save(item);
    }

    @Transactional(readOnly = true)
    public BacktestResponseDto backtest(String email, BacktestRequestDto request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return new BacktestResponseDto(Collections.emptyList(), 0.0, 0.0, "장바구니가 비어 있습니다.");
        }

        // 1. 모든 종목의 과거 6개월 일봉 데이터 수집
        java.time.LocalDate now = java.time.LocalDate.now();
        java.time.LocalDate sixMonthsAgo = now.minusMonths(6);
        String startDateStr = sixMonthsAgo.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String endDateStr = now.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));

        Map<String, List<com.stock.infrastructure.dto.kis.DailyPriceItem>> stockDailyPrices = new HashMap<>();
        java.util.Set<String> allDates = new java.util.TreeSet<>();

        double totalWeight = 0;
        for (BacktestRequestDto.Item item : request.getItems()) {
            totalWeight += item.getWeight();
            List<com.stock.infrastructure.dto.kis.DailyPriceItem> daily = stockPriceService.getDailyPrices(item.getStockCode(), "D", startDateStr, endDateStr);
            if (daily != null && !daily.isEmpty()) {
                // 날짜 오름차순 정렬
                ArrayList<com.stock.infrastructure.dto.kis.DailyPriceItem> sortedDaily = new ArrayList<>(daily);
                sortedDaily.sort(java.util.Comparator.comparing(com.stock.infrastructure.dto.kis.DailyPriceItem::getStck_bsop_date));
                stockDailyPrices.put(item.getStockCode(), sortedDaily);
                for (com.stock.infrastructure.dto.kis.DailyPriceItem d : sortedDaily) {
                    allDates.add(d.getStck_bsop_date());
                }
            }
        }

        if (allDates.isEmpty()) {
            return new BacktestResponseDto(Collections.emptyList(), 0.0, 0.0, "과거 주가 데이터가 존재하지 않습니다.");
        }

        double finalTotalWeight = totalWeight;
        if (finalTotalWeight <= 0) {
            return new BacktestResponseDto(Collections.emptyList(), 0.0, 0.0, "설정된 투자 비중의 합이 0보다 커야 합니다.");
        }

        // 2. 타임라인(일자별) 시뮬레이션
        double initialCapital = 10000000.0;
        List<BacktestResponseDto.ChartPoint> chartData = new ArrayList<>();

        Map<String, Boolean> isBought = new HashMap<>();
        Map<String, Double> buyQty = new HashMap<>();
        Map<String, Double> buyPrice = new HashMap<>();
        Map<String, Double> lastKnownPrice = new HashMap<>();

        for (BacktestRequestDto.Item item : request.getItems()) {
            isBought.put(item.getStockCode(), false);
            buyQty.put(item.getStockCode(), 0.0);
            buyPrice.put(item.getStockCode(), 0.0);
            lastKnownPrice.put(item.getStockCode(), 0.0);
        }

        double peakValue = initialCapital;
        double maxDrawdown = 0.0;

        for (String dateStr : allDates) {
            double dailyPortfolioValue = 0.0;

            for (BacktestRequestDto.Item item : request.getItems()) {
                String code = item.getStockCode();
                double targetPrice = item.getTargetPrice();
                double weightRatio = item.getWeight() / finalTotalWeight;
                double allocatedCapital = initialCapital * weightRatio;

                List<com.stock.infrastructure.dto.kis.DailyPriceItem> prices = stockDailyPrices.get(code);
                com.stock.infrastructure.dto.kis.DailyPriceItem todayPrice = null;
                if (prices != null) {
                    for (com.stock.infrastructure.dto.kis.DailyPriceItem p : prices) {
                        if (p.getStck_bsop_date().equals(dateStr)) {
                            todayPrice = p;
                            break;
                        }
                    }
                }

                double clpr = 0.0;
                double lwpr = 0.0;

                if (todayPrice != null) {
                    clpr = Double.parseDouble(todayPrice.getStck_clpr());
                    lwpr = Double.parseDouble(todayPrice.getStck_lwpr());
                    lastKnownPrice.put(code, clpr);
                } else {
                    clpr = lastKnownPrice.get(code);
                    lwpr = clpr;
                }

                if (clpr <= 0) {
                    dailyPortfolioValue += allocatedCapital;
                    continue;
                }

                if (!isBought.get(code)) {
                    if (lwpr <= targetPrice && targetPrice > 0) {
                        isBought.put(code, true);
                        buyPrice.put(code, targetPrice);
                        double qty = allocatedCapital / targetPrice;
                        buyQty.put(code, qty);
                        dailyPortfolioValue += qty * clpr;
                    } else {
                        dailyPortfolioValue += allocatedCapital;
                    }
                } else {
                    double currentVal = buyQty.get(code) * clpr;
                    dailyPortfolioValue += currentVal;
                }
            }

            if (dailyPortfolioValue > peakValue) {
                peakValue = dailyPortfolioValue;
            }
            double dd = (peakValue - dailyPortfolioValue) / peakValue * 100.0;
            if (dd > maxDrawdown) {
                maxDrawdown = dd;
            }

            double dailyReturn = (dailyPortfolioValue - initialCapital) / initialCapital * 100.0;
            String formattedDate = dateStr.substring(0, 4) + "-" + dateStr.substring(4, 6) + "-" + dateStr.substring(6, 8);
            chartData.add(new BacktestResponseDto.ChartPoint(formattedDate, Math.round(dailyReturn * 100.0) / 100.0));
        }

        double finalReturn = chartData.isEmpty() ? 0.0 : chartData.get(chartData.size() - 1).getReturnValue();
        String aiAdvice = generateAiAdvice(request, finalReturn, maxDrawdown);

        return new BacktestResponseDto(chartData, finalReturn, Math.round(maxDrawdown * 100.0) / 100.0, aiAdvice);
    }

    private String generateAiAdvice(BacktestRequestDto request, double finalReturn, double mdd) {
        StringBuilder advice = new StringBuilder();

        if (finalReturn > 15) {
            advice.append("📈 포트폴리오의 최근 6개월 백테스팅 수익률이 매우 강력합니다. 설정하신 목표가가 과거 가격 하락 구간에서 효과적인 진입 시점을 확보한 것으로 분석됩니다. ");
        } else if (finalReturn > 0) {
            advice.append("💪 최근 6개월 시뮬레이션 결과 안정적인 양수의 수익률을 보였습니다. 보수적이면서도 견고한 목표가 설정이 유효하게 작용하고 있습니다. ");
        } else {
            advice.append("⚠️ 과거 시뮬레이션 결과 손실이 발생했거나 체결 시점이 늦어 충분한 수익을 확보하지 못했습니다. 목표 매수가를 소폭 상향 조정하거나 종목 비중을 재조정하는 것을 권장합니다. ");
        }

        if (mdd > 20) {
            advice.append("또한, 최대 낙폭(MDD)이 20%를 초과하여 포트폴리오의 가격 변동성이 매우 높은 편입니다. 하락장 발생 시 자산 감소 위험이 있으므로, 안정적인 우량주나 배당주 비중을 늘릴 필요가 있습니다. ");
        } else {
            advice.append("최대 낙폭(MDD)이 낮은 수준으로 관리되어 하락장에서의 방어력이 우수할 것으로 기대됩니다. ");
        }

        Map<String, Double> sectorWeights = new HashMap<>();
        double totalWeight = 0;
        for (BacktestRequestDto.Item item : request.getItems()) {
            totalWeight += item.getWeight();
        }

        for (BacktestRequestDto.Item item : request.getItems()) {
            String sector = stockMasterRepository.findByStockCode(item.getStockCode())
                    .map(com.stock.domain.stock.StockMaster::getSector)
                    .orElse("기타");
            if (sector == null || sector.trim().isEmpty()) {
                sector = "기타";
            }
            double itemWeightRatio = (item.getWeight() / totalWeight) * 100.0;
            sectorWeights.put(sector, sectorWeights.getOrDefault(sector, 0.0) + itemWeightRatio);
        }

        String dominantSector = null;
        double maxSectorWeight = 0;
        for (Map.Entry<String, Double> entry : sectorWeights.entrySet()) {
            if (entry.getValue() > maxSectorWeight) {
                maxSectorWeight = entry.getValue();
                dominantSector = entry.getKey();
            }
        }

        if (dominantSector != null && maxSectorWeight > 60.0 && !dominantSector.equals("기타")) {
            advice.append(String.format("현재 [%s] 섹터의 비중이 %.1f%%로 포트폴리오가 특정 산업군에 다소 과집중되어 있습니다. 시장 변동성에 대응하기 위해 다른 산업군의 종목을 섞어 분산 투자를 시도하는 것이 리스크 감소에 유리합니다. 🤖", dominantSector, maxSectorWeight));
        } else {
            advice.append("종목 간 산업 분산도가 적절하게 분배되어 분산 투자 원칙에 부합하는 구성입니다. 🤖");
        }

        return advice.toString();
    }
}
