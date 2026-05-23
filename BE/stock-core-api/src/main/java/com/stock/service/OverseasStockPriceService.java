package com.stock.service;

import com.stock.domain.overseas.ExchangeCode;
import com.stock.domain.overseas.OverseasStockMaster;
import com.stock.domain.overseas.OverseasStockMasterRepository;
import com.stock.infrastructure.dto.kis.OverseasStockPriceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class OverseasStockPriceService {

    private final OverseasStockMasterRepository overseasStockMasterRepository;

    @Cacheable(value = "overseas::price", key = "#ticker + '_' + #exchangeCode", unless = "#result.error != null")
    public OverseasStockPriceResponse getOverseasPrice(String ticker, String exchangeCode) {
        try {
            ExchangeCode exCode = ExchangeCode.valueOf(exchangeCode);
            OverseasStockMaster stock = overseasStockMasterRepository
                    .findByTickerAndExchangeCode(ticker, exCode)
                    .orElse(null);

            if (stock != null && stock.getCurrentPrice() != null) {
                return toResponse(stock);
            }
        } catch (Exception e) {
            log.warn("Failed to fetch overseas price from DB for {}_{}: {}", ticker, exchangeCode, e.getMessage());
        }

        OverseasStockPriceResponse response = new OverseasStockPriceResponse();
        response.setError("NO_PRICE_DATA");
        return response;
    }

    private OverseasStockPriceResponse toResponse(OverseasStockMaster stock) {
        OverseasStockPriceResponse response = new OverseasStockPriceResponse();
        response.setLast(stock.getCurrentPrice());
        response.setPrdy_vs(stock.getChangeValue());
        response.setPrdy_clss_code(stock.getChangeSign());
        response.setOvrs_nic_prdy_vs(stock.getChangeRate());
        response.setTr_vol(stock.getVolume());
        return response;
    }
}