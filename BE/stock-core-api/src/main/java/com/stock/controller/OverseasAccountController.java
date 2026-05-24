package com.stock.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/overseas-account")
public class OverseasAccountController {

    @GetMapping("/balance")
    public ResponseEntity<Map<String, Object>> getOverseasBalance() {
        Map<String, Object> response = new HashMap<>();
        
        // output1: 빈 해외 주식 보유 종목 리스트
        response.put("output1", new ArrayList<>());
        
        // output2: 해외 자산 요약 정보 (기본값 0으로 세팅)
        Map<String, String> summary = new HashMap<>();
        summary.put("tot_evlu_amt", "0");
        summary.put("frcr_evlu_pfls_amt", "0");
        summary.put("tot_frcr_evlu_pfls_amt", "0");
        summary.put("ovrs_tot_pchs_amt", "0");
        summary.put("ovrs_rlzt_pfls", "0");
        response.put("output2", summary);
        
        return ResponseEntity.ok(response);
    }
}
