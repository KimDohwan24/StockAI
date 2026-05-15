package com.stock.controller;

import com.stock.service.KisAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/kis-auth")
@RequiredArgsConstructor
public class KisAuthController {

    private final KisAuthService kisAuthService;

    @PostMapping("/token")
    public ResponseEntity<String> issueToken() {
        String token = kisAuthService.issueAccessToken();
        return ResponseEntity.ok(token);
    }

    @PostMapping("/websocket-key")
    public ResponseEntity<String> issueWebSocketKey() {
        String key = kisAuthService.issueWebSocketKey();
        return ResponseEntity.ok(key);
    }

    @DeleteMapping("/token")
    public ResponseEntity<String> revokeToken() {
        kisAuthService.revokeToken();
        return ResponseEntity.ok("Token revoked");
    }
}
