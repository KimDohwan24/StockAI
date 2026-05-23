package com.stock.controller;

import com.stock.controller.dto.CatalogPageResponse;
import com.stock.controller.dto.StockCatalogResponse;
import com.stock.controller.dto.StockCatalogWithPriceResponse;
import com.stock.domain.stock.MarketType;
import com.stock.service.StockCatalogService;
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

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockCatalogController {

    private final StockCatalogService stockCatalogService;

    @GetMapping("/sectors")
    public ResponseEntity<List<String>> getSectors(@RequestParam(required = false) MarketType marketType) {
        if (marketType != null) {
            return ResponseEntity.ok(stockCatalogService.findSectorsByMarketType(marketType));
        }
        return ResponseEntity.ok(stockCatalogService.findAllSectors());
    }

    @GetMapping
    public ResponseEntity<?> findAll(
            @RequestParam(required = false) MarketType marketType,
            @RequestParam(required = false) String sector,
            @RequestParam(required = false, defaultValue = "false") boolean withoutPrice,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        if (withoutPrice) {
            if (marketType != null && sector != null) {
                return ResponseEntity.ok(stockCatalogService.findByMarketTypeAndSector(marketType, sector, pageable));
            }
            if (sector != null) {
                return ResponseEntity.ok(stockCatalogService.findBySector(sector, pageable));
            }
            return ResponseEntity.ok(stockCatalogService.findAll(marketType, pageable));
        }
        if (marketType != null && sector != null) {
            return ResponseEntity.ok(stockCatalogService.findByMarketTypeAndSectorWithPrice(marketType, sector, pageable));
        }
        if (sector != null) {
            return ResponseEntity.ok(stockCatalogService.findBySectorWithPrice(sector, pageable));
        }
        return ResponseEntity.ok(stockCatalogService.findAllWithPrice(marketType, pageable));
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam String query,
            @RequestParam(required = false, defaultValue = "false") boolean withoutPrice,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {
        if (withoutPrice) {
            return ResponseEntity.ok(stockCatalogService.search(query, pageable));
        }
        return ResponseEntity.ok(stockCatalogService.searchWithPrice(query, pageable));
    }

    @PostMapping("/sync")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Integer> sync(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        int count = stockCatalogService.syncFromKis();
        return ResponseEntity.ok(count);
    }

    @PostMapping("/sync/remap-sector")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Integer> remapSector(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        int count = stockCatalogService.remapSectorCodes();
        return ResponseEntity.ok(count);
    }
}