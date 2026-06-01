package com.stock.controller;

import com.stock.config.KisConfig;
import com.stock.controller.dto.AdminAiStatusResponse;
import com.stock.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final KisConfig kisConfig;


    @GetMapping("/ai-monitoring")
    public ResponseEntity<List<AdminAiStatusResponse>> getAiMonitoringData() {
        return ResponseEntity.ok(adminService.getAiMonitoringData());
    }

    @PostMapping("/ai-monitoring/reset")
    public ResponseEntity<Void> resetAiAccounts() {
        adminService.resetAiAccounts();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/config/mock-order")
    public ResponseEntity<Map<String, Object>> updateMockOrderConfig(@RequestParam boolean enabled) {
        kisConfig.setMockOrderEnabled(enabled);
        return ResponseEntity.ok(Map.of("mockOrderEnabled", kisConfig.isMockOrderEnabled()));
    }

    @PostMapping("/users/{email}/mock-order")
    public ResponseEntity<Void> toggleUserMockOrder(@PathVariable String email, @RequestParam boolean enabled) {
        adminService.toggleUserMockOrder(email, enabled);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{email}/ai-trading")
    public ResponseEntity<Void> toggleUserAiTrading(@PathVariable String email, @RequestParam boolean enabled) {
        adminService.toggleUserAiTrading(email, enabled);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{email}/initial-balance")
    public ResponseEntity<Void> updateUserInitialBalance(@PathVariable String email, @RequestParam double balance) {
        adminService.updateUserInitialBalance(email, balance);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{email}/reservations/reset")
    public ResponseEntity<Void> resetUserReservations(@PathVariable String email) {
        adminService.resetUserReservations(email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/news/sync")
    public ResponseEntity<Integer> syncNaverNews() {
        int count = adminService.syncNaverNews();
        return ResponseEntity.ok(count);
    }

    @GetMapping("/system-status")
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        return ResponseEntity.ok(adminService.getSystemStatus());
    }

    @PostMapping("/users/{email}/sell-all")
    public ResponseEntity<Void> sellAllHoldings(@PathVariable String email) {
        adminService.sellAllHoldings(email);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/kis/mock-balance")
    public ResponseEntity<Map<String, Object>> getKisMockBalance() {
        return ResponseEntity.ok(adminService.getKisMockBalance());
    }
}



