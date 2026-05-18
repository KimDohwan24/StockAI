package com.stock.service;

import com.stock.controller.dto.TrendingResponse;
import com.stock.domain.overseas.OverseasStockMaster;
import com.stock.domain.overseas.OverseasStockMasterRepository;
import com.stock.domain.stock.StockMaster;
import com.stock.domain.stock.StockMasterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrendingService {

    private final StockMasterRepository stockMasterRepository;
    private final OverseasStockMasterRepository overseasStockMasterRepository;

    @Cacheable(value = "trending", key = "'domestic'")
    public List<TrendingResponse> getDomesticTrending(int limit) {
        PageRequest pageRequest = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "volume"));
        List<StockMaster> stocks = stockMasterRepository.findAll(pageRequest).getContent();
        return stocks.stream()
                .filter(s -> s.getCurrentPrice() != null && s.getVolume() != null)
                .map(s -> new TrendingResponse(
                        s.getStockCode(), s.getName(), s.getMarketType().name(),
                        s.getCurrentPrice(), s.getChangeValue(), s.getChangeSign(),
                        s.getChangeRate(), s.getVolume(), s.getMarketCap()))
                .toList();
    }

    @Cacheable(value = "trending", key = "'overseas'")
    public List<TrendingResponse> getOverseasTrending(int limit) {
        PageRequest pageRequest = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "volume"));
        List<OverseasStockMaster> stocks = overseasStockMasterRepository.findAll(pageRequest).getContent();
        return stocks.stream()
                .filter(s -> s.getCurrentPrice() != null && s.getVolume() != null)
                .map(s -> new TrendingResponse(
                        s.getTicker(), s.getName(), s.getExchangeCode().name(),
                        s.getCurrentPrice(), s.getChangeValue(), s.getChangeSign(),
                        s.getChangeRate(), s.getVolume(), null))
                .toList();
    }
}