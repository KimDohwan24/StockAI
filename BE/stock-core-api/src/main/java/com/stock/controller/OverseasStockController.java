package com.stock.controller;

import com.stock.controller.dto.CatalogPageResponse;
import com.stock.controller.dto.OverseasDailyPriceRequest;
import com.stock.controller.dto.OverseasPriceBatchRequest;
import com.stock.controller.dto.OverseasStockCatalogResponse;
import com.stock.controller.dto.OverseasStockCatalogWithPriceResponse;
import com.stock.domain.overseas.ExchangeCode;
import com.stock.infrastructure.dto.kis.OverseasDailyPriceItem;
import com.stock.infrastructure.dto.kis.OverseasStockPriceResponse;
import com.stock.service.OverseasStockPriceBatchService;
import com.stock.service.OverseasStockCatalogService;
import com.stock.service.OverseasStockPriceService;
import com.stock.service.StockPriceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/overseas-stocks")
@RequiredArgsConstructor
public class OverseasStockController {

    private final OverseasStockCatalogService overseasStockCatalogService;
    private final OverseasStockPriceService overseasStockPriceService;
    private final OverseasStockPriceBatchService overseasStockPriceBatchService;
    private final StockPriceService stockPriceService;

    @PostMapping("/prices")
    public ResponseEntity<Map<String, OverseasStockPriceResponse>> getPrices(
            @RequestBody @Valid @Size(max = 200, message = "최대 200개 종목까지 조회 가능합니다") List<OverseasPriceBatchRequest> requests) {
        OverseasStockPriceBatchService.OverseasBatchResult result = overseasStockPriceBatchService.getCurrentPrices(requests);
        return ResponseEntity.ok()
                .header("X-Cache", result.getCacheStatus())
                .body(result.prices());
    }

    @GetMapping
    public ResponseEntity<?> findAll(
            @RequestParam(required = false) ExchangeCode exchangeCode,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String sector,
            @RequestParam(required = false, defaultValue = "false") boolean withoutPrice,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        if (withoutPrice) {
            if (exchangeCode != null && sector != null) {
                return ResponseEntity.ok(overseasStockCatalogService.findByExchangeCodeAndSector(exchangeCode, sector, pageable));
            }
            if (sector != null) {
                return ResponseEntity.ok(overseasStockCatalogService.findBySector(sector, pageable));
            }
            if (exchangeCode != null) {
                return ResponseEntity.ok(overseasStockCatalogService.findByExchangeCode(exchangeCode, pageable));
            }
            if (country != null) {
                return ResponseEntity.ok(overseasStockCatalogService.findByCountry(country, pageable));
            }
            return ResponseEntity.ok(overseasStockCatalogService.findAll(pageable));
        }
        if (exchangeCode != null && sector != null) {
            return ResponseEntity.ok(overseasStockCatalogService.findByExchangeCodeAndSectorWithPrice(exchangeCode, sector, pageable));
        }
        if (sector != null) {
            return ResponseEntity.ok(overseasStockCatalogService.findBySectorWithPrice(sector, pageable));
        }
        if (exchangeCode != null) {
            return ResponseEntity.ok(overseasStockCatalogService.findByExchangeCodeWithPrice(exchangeCode, pageable));
        }
        if (country != null) {
            return ResponseEntity.ok(overseasStockCatalogService.findByCountryWithPrice(country, pageable));
        }
        return ResponseEntity.ok(overseasStockCatalogService.findAllWithPrice(pageable));
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam String query,
            @RequestParam(required = false, defaultValue = "false") boolean withoutPrice,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        if (withoutPrice) {
            return ResponseEntity.ok(overseasStockCatalogService.search(query, pageable));
        }
        return ResponseEntity.ok(overseasStockCatalogService.searchWithPrice(query, pageable));
    }

    @GetMapping("/sectors")
    public ResponseEntity<List<String>> getSectors(@RequestParam(required = false) ExchangeCode exchangeCode) {
        if (exchangeCode != null) {
            return ResponseEntity.ok(overseasStockCatalogService.findSectorsByExchangeCode(exchangeCode));
        }
        return ResponseEntity.ok(overseasStockCatalogService.findAllSectors());
    }

    @GetMapping("/{ticker}/price")
    public ResponseEntity<OverseasStockPriceResponse> getPrice(
            @PathVariable String ticker,
            @RequestParam String exchange) {
        return ResponseEntity.ok(overseasStockPriceService.getOverseasPrice(ticker, exchange));
    }

    @GetMapping("/{ticker}/daily")
    public ResponseEntity<List<OverseasDailyPriceItem>> getDailyPrices(
            @PathVariable String ticker,
            @RequestParam String exchange,
            @RequestParam(defaultValue = "D") String period,
            @RequestParam String startDate,
            @RequestParam String endDate) {
        return ResponseEntity.ok(stockPriceService.getOverseasDailyPrices(ticker, exchange, period, startDate, endDate));
    }

    @PostMapping("/sync")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Integer> sync(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        int count = overseasStockCatalogService.syncFromKis();
        return ResponseEntity.ok(count);
    }
}