package com.stock.controller;

import com.stock.controller.dto.UserProfileResponse;
import com.stock.controller.dto.UserProfileUpdateRequest;
import com.stock.domain.entity.User;
import com.stock.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByEmail(userDetails.getUsername());
        return ResponseEntity.ok(new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().name(),
                user.getCreatedAt(),
                user.getInitialBalance(),
                user.getCashBalance(),
                user.isAiTradingEnabled(),
                user.getRiskProfile().name(),
                user.getAiTradingAllocationRatio(),
                user.isMockOrderEnabled()
        ));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UserProfileUpdateRequest request) {
        User user = userService.updateUserProfile(
                userDetails.getUsername(),
                request.name(),
                request.initialBalance(),
                request.cashBalance()
        );
        return ResponseEntity.ok(new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().name(),
                user.getCreatedAt(),
                user.getInitialBalance(),
                user.getCashBalance(),
                user.isAiTradingEnabled(),
                user.getRiskProfile().name(),
                user.getAiTradingAllocationRatio(),
                user.isMockOrderEnabled()
        ));
    }

    @PutMapping("/me/ai-config")
    public ResponseEntity<UserProfileResponse> updateAiConfig(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam boolean enabled,
            @RequestParam User.RiskProfile riskProfile,
            @RequestParam double aiTradingAllocationRatio) {
        User user = userService.updateAiConfig(userDetails.getUsername(), enabled, riskProfile, aiTradingAllocationRatio);
        return ResponseEntity.ok(new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().name(),
                user.getCreatedAt(),
                user.getInitialBalance(),
                user.getCashBalance(),
                user.isAiTradingEnabled(),
                user.getRiskProfile().name(),
                user.getAiTradingAllocationRatio(),
                user.isMockOrderEnabled()
        ));
    }
}
