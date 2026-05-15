package com.stock.controller;

import com.stock.controller.dto.BuyingPowerRequest;
import com.stock.infrastructure.dto.kis.*;
import com.stock.service.StockAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final StockAccountService stockAccountService;

    @GetMapping("/balance")
    public ResponseEntity<List<BalanceItem>> getBalance() {
        return ResponseEntity.ok(stockAccountService.getBalance());
    }

    @GetMapping("/balance/summary")
    public ResponseEntity<BalanceSummary> getBalanceSummary() {
        return ResponseEntity.ok(stockAccountService.getBalanceSummary());
    }

    @GetMapping("/realized-profit")
    public ResponseEntity<List<RealizedProfitItem>> getRealizedProfit() {
        return ResponseEntity.ok(stockAccountService.getRealizedProfit());
    }

    @PostMapping("/buying-power")
    public ResponseEntity<BuyingPowerResponse> getBuyingPower(@RequestBody BuyingPowerRequest request) {
        return ResponseEntity.ok(stockAccountService.getBuyingPower(request.getStockCode()));
    }
}
