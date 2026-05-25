package com.stock.service;

import com.stock.controller.dto.FavoriteStockResponse;
import com.stock.domain.entity.User;
import com.stock.domain.favorite.FavoriteStock;
import com.stock.domain.favorite.FavoriteStockRepository;
import com.stock.domain.overseas.ExchangeCode;
import com.stock.domain.overseas.OverseasStockMaster;
import com.stock.domain.overseas.OverseasStockMasterRepository;
import com.stock.domain.repository.UserRepository;
import com.stock.domain.stock.StockMaster;
import com.stock.domain.stock.StockMasterRepository;
import com.stock.infrastructure.dto.kis.StockPriceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteStockService {

    private final FavoriteStockRepository favoriteStockRepository;
    private final UserRepository userRepository;
    private final StockMasterRepository stockMasterRepository;
    private final OverseasStockMasterRepository overseasStockMasterRepository;
    private final StockPriceBatchService stockPriceBatchService;

    @Transactional
    public boolean toggleFavorite(String email, String stockCode) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        Optional<FavoriteStock> existing = favoriteStockRepository.findByUserIdAndStockCode(user.getId(), stockCode);

        if (existing.isPresent()) {
            favoriteStockRepository.delete(existing.get());
            log.info("Removed favorite stock: {} for user: {}", stockCode, email);
            return false;
        } else {
            // Find stock name from StockMaster (domestic) or OverseasStockMaster (overseas) or fallback
            String resolvedName = stockMasterRepository.findByStockCode(stockCode)
                    .map(StockMaster::getName)
                    .or(() -> overseasStockMasterRepository.findByTickerAndExchangeCode(stockCode, ExchangeCode.NAS).map(OverseasStockMaster::getName))
                    .or(() -> overseasStockMasterRepository.findByTickerAndExchangeCode(stockCode, ExchangeCode.NYS).map(OverseasStockMaster::getName))
                    .or(() -> overseasStockMasterRepository.findByTickerAndExchangeCode(stockCode, ExchangeCode.AMS).map(OverseasStockMaster::getName))
                    .orElse(stockCode);

            FavoriteStock favorite = new FavoriteStock(user.getId(), stockCode, resolvedName);
            favoriteStockRepository.save(favorite);
            log.info("Added favorite stock: {} ({}) for user: {}", stockCode, resolvedName, email);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public boolean isFavorite(String email, String stockCode) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
        return favoriteStockRepository.existsByUserIdAndStockCode(user.getId(), stockCode);
    }

    @Transactional(readOnly = true)
    public List<FavoriteStockResponse> getFavoritesWithPrices(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        List<FavoriteStock> favorites = favoriteStockRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
        if (favorites.isEmpty()) {
            return new ArrayList<>();
        }

        List<String> stockCodes = favorites.stream()
                .map(FavoriteStock::getStockCode)
                .collect(Collectors.toList());

        // Fetch prices in batch
        Map<String, StockPriceResponse> pricesMap = Map.of();
        try {
            pricesMap = stockPriceBatchService.getCurrentPrices(stockCodes).prices();
        } catch (Exception e) {
            log.warn("Failed to fetch batch prices for favorites: {}", e.getMessage());
        }

        List<FavoriteStockResponse> responseList = new ArrayList<>();
        for (FavoriteStock favorite : favorites) {
            StockPriceResponse priceResponse = pricesMap.get(favorite.getStockCode());

            String currentPrice = priceResponse != null ? priceResponse.getStck_prpr() : "0";
            String changeValue = priceResponse != null ? priceResponse.getPrdy_vrss() : "0";
            String changeRate = priceResponse != null ? priceResponse.getPrdy_ctrt() : "0.00";
            String changeSign = priceResponse != null ? priceResponse.getPrdy_vrss_sign() : "3";

            responseList.add(new FavoriteStockResponse(
                    favorite.getStockCode(),
                    favorite.getStockName(),
                    currentPrice,
                    changeValue,
                    changeRate,
                    changeSign
            ));
        }

        return responseList;
    }
}
