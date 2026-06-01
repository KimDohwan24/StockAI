package com.stock.infrastructure.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.util.concurrent.RateLimiter;
import com.stock.config.KisConfig;
import com.stock.infrastructure.dto.kis.*;
import com.stock.service.KisAuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class KisApiClient {

    private final KisConfig kisConfig;
    private final KisAuthService kisAuthService;
    private final ObjectMapper objectMapper;
    private final WebClient kisWebClient;
    private final WebClient kisMockWebClient;
    private final RateLimiter rateLimiter = RateLimiter.create(3.0);
    private static final int MAX_RETRY = 3;
    private static final long BASE_RETRY_DELAY_MS = 1100;

    public KisApiClient(KisConfig kisConfig,
                        KisAuthService kisAuthService,
                        ObjectMapper objectMapper,
                        @Qualifier("kisWebClient") WebClient kisWebClient,
                        @Qualifier("kisMockWebClient") WebClient kisMockWebClient) {
        this.kisConfig = kisConfig;
        this.kisAuthService = kisAuthService;
        this.objectMapper = objectMapper;
        this.kisWebClient = kisWebClient;
        this.kisMockWebClient = kisMockWebClient;
    }

    private String getAuthHeader() {
        return kisAuthService.getAccessToken();
    }

    private void logError(String trId, String errorBody) {
        log.error("KIS API error [tr_id={}]: {}", trId, errorBody);
    }

    // ================== 시세 API ==================

    /**
     * 주식현재가 시세 (모의: VTTC0812Q, 실전: FHKST01010100)
     */
    public StockPriceResponse getStockPrice(String stockCode) {
        rateLimiter.acquire();
        String trId = "FHKST01010100";
        String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/quotations/inquire-price")
                .queryParam("fid_cond_mrkt_div_code", "J")
                .queryParam("fid_input_iscd", stockCode)
                .toUriString();

        Exception lastException = null;
        for (int retry = 0; retry <= MAX_RETRY; retry++) {
            try {
                KisApiResponse<StockPriceResponse> response = kisWebClient
                        .get()
                        .uri(uri)
                        .header("authorization", getAuthHeader())
                        .header("tr_id", trId)
                        .retrieve()
                        .onStatus(status -> status.isError(),
                                clientResponse -> clientResponse.bodyToMono(String.class)
                                        .flatMap(body -> {
                                            logError(trId, body);
                                            return Mono.error(new RuntimeException("KIS API error: " + body));
                                        }))
                        .bodyToMono(new ParameterizedTypeReference<KisApiResponse<StockPriceResponse>>() {})
                        .block();

                return validateAndReturn(response, trId);
            } catch (Exception e) {
                lastException = e;
                if (retry < MAX_RETRY && isRateLimitError(e)) {
                    long delay = BASE_RETRY_DELAY_MS * (1L << retry);
                    log.warn("Rate limited for stock {}, retrying in {}ms... ({}/{})", stockCode, delay, retry + 1, MAX_RETRY);
                    try { Thread.sleep(delay); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); throw new RuntimeException("Interrupted during rate limit retry", ie); }
                    rateLimiter.acquire();
                } else if (!isRateLimitError(e)) {
                    throw e;
                }
            }
        }
        throw new RuntimeException("KIS API rate limit exceeded after " + MAX_RETRY + " retries for stock " + stockCode, lastException);
    }

    /**
     * 국내주식기간별시세(일/주/월/년) (FHKST03010100)
     */
    public List<DailyPriceItem> getDailyPrices(String stockCode, String periodDivCode, String startDate, String endDate) {
        rateLimiter.acquire();
        String trId = "FHKST03010100";
        String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/quotations/inquire-daily-price")
                .queryParam("fid_cond_mrkt_div_code", "J")
                .queryParam("fid_input_iscd", stockCode)
                .queryParam("fid_input_date_1", startDate)
                .queryParam("fid_input_date_2", endDate)
                .queryParam("fid_period_div_code", periodDivCode) // D:일, W:주, M:월, Y:년
                .queryParam("fid_org_adj_prc", "0") // 0:수정주가, 1:원주가
                .toUriString();

        JsonNode root = kisWebClient
                .get()
                .uri(uri)
                .header("authorization", getAuthHeader())
                .header("tr_id", trId)
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    logError(trId, body);
                                    return Mono.error(new RuntimeException("KIS API error: " + body));
                                }))
                .bodyToMono(JsonNode.class)
                .block();

        return parseOutput2List(root, trId, new TypeReference<List<DailyPriceItem>>() {});
    }

    /**
     * 주식당일분봉조회 (FHKST03010200)
     */
    public List<MinutePriceItem> getMinutePrices(String stockCode) {
        rateLimiter.acquire();
        String trId = "FHKST03010200";
        String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice")
                .queryParam("fid_cond_mrkt_div_code", "J")
                .queryParam("fid_input_iscd", stockCode)
                .queryParam("fid_input_hour_1", "0") // 조회 시작 시간 (0: 09시부터)
                .queryParam("fid_etc_cls_code", "") // 기타구분코드 (공란)
                .queryParam("fid_pw_data_incu_yn", "N")
                .toUriString();

        JsonNode root = kisWebClient
                .get()
                .uri(uri)
                .header("authorization", getAuthHeader())
                .header("tr_id", trId)
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    logError(trId, body);
                                    return Mono.error(new RuntimeException("KIS API error: " + body));
                                }))
                .bodyToMono(JsonNode.class)
                .block();

        return parseOutput2List(root, trId, new TypeReference<List<MinutePriceItem>>() {});
    }

    // ================== 주문 API ==================

    /**
     * 주식주문(현금) 매수 (실전: TTTC0802U, 모의: VTTC0802U)
     */
    public OrderResponse buyStock(OrderRequest request) {
        String trId = "VTTC0802U"; // 모의투자 매수
        return placeOrder(trId, request);
    }

    /**
     * 주식주문(현금) 매도 (실전: TTTC0801U, 모의: VTTC0801U)
     */
    public OrderResponse sellStock(OrderRequest request) {
        String trId = "VTTC0801U"; // 모의투자 매도
        return placeOrder(trId, request);
    }

    private OrderResponse placeOrder(String trId, OrderRequest request) {
        rateLimiter.acquire();
        Exception lastException = null;
        for (int retry = 0; retry <= MAX_RETRY; retry++) {
            try {
                KisApiResponse<OrderResponse> response = kisMockWebClient
                        .post()
                        .uri("/uapi/domestic-stock/v1/trading/order-cash")
                        .header("authorization", kisAuthService.getMockAccessToken())
                        .header("tr_id", trId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(request)
                        .retrieve()
                        .onStatus(status -> status.isError(),
                                clientResponse -> clientResponse.bodyToMono(String.class)
                                        .flatMap(body -> {
                                            logError(trId, body);
                                            return Mono.error(new RuntimeException("KIS order API error: " + body));
                                        }))
                        .bodyToMono(new ParameterizedTypeReference<KisApiResponse<OrderResponse>>() {})
                        .block();

                return validateAndReturn(response, trId);
            } catch (Exception e) {
                lastException = e;
                if (retry < MAX_RETRY && isRateLimitError(e)) {
                    long delay = BASE_RETRY_DELAY_MS * (1L << retry) + 500; // Exponential backoff + 500ms buffer
                    log.warn("Rate limited on placeOrder [tr_id={}], retrying in {}ms... ({}/{})", trId, delay, retry + 1, MAX_RETRY);
                    try { Thread.sleep(delay); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); throw new RuntimeException("Interrupted during rate limit retry", ie); }
                    rateLimiter.acquire();
                } else {
                    throw e;
                }
            }
        }
        throw new RuntimeException("KIS placeOrder rate limit exceeded after " + MAX_RETRY + " retries", lastException);
    }

    /**
     * 주식주문정정취소 (실전: TTTC0803U, 모의: VTTC0803U)
     */
    public OrderResponse amendCancelOrder(OrderRequest request) {
        rateLimiter.acquire();
        String trId = "VTTC0803U"; // 모의투자 정정취소
        KisApiResponse<OrderResponse> response = kisMockWebClient
                .post()
                .uri("/uapi/domestic-stock/v1/trading/order-rvsecncl")
                .header("authorization", kisAuthService.getMockAccessToken())
                .header("tr_id", trId)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    logError(trId, body);
                                    return Mono.error(new RuntimeException("KIS amend/cancel API error: " + body));
                                }))
                .bodyToMono(new ParameterizedTypeReference<KisApiResponse<OrderResponse>>() {})
                .block();

        return validateAndReturn(response, trId);
    }

    // ================== 계좌 API ==================

    /**
     * 주식잔고조회 (실전: TTTC8434R, 모의: VTTC8434R)
     */
    public BalanceResponse getBalance() {
        rateLimiter.acquire();
        String trId = "VTTC8434R"; // 모의투자

        String mockCano = (kisConfig.getMock() != null && kisConfig.getMock().getAccount() != null
                && kisConfig.getMock().getAccount().getCano() != null
                && !kisConfig.getMock().getAccount().getCano().trim().isEmpty())
                ? kisConfig.getMock().getAccount().getCano()
                : kisConfig.getAccountNo();
        String mockAcntPrdtCd = (kisConfig.getMock() != null && kisConfig.getMock().getAccount() != null
                && kisConfig.getMock().getAccount().getAcntPrdtCd() != null
                && !kisConfig.getMock().getAccount().getAcntPrdtCd().trim().isEmpty())
                ? kisConfig.getMock().getAccount().getAcntPrdtCd()
                : kisConfig.getAccountProductCode();

        String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/trading/inquire-balance")
                .queryParam("CANO", mockCano)
                .queryParam("ACNT_PRDT_CD", mockAcntPrdtCd)
                .queryParam("AFHR_FLPR_YN", "N")
                .queryParam("OFL_YN", "")
                .queryParam("INQR_DVSN", "01")
                .queryParam("UNPR_DVSN", "01")
                .queryParam("FUND_STTL_ICLD_YN", "N")
                .queryParam("FNCG_AMT_AUTO_RDPT_YN", "N")
                .queryParam("PRCS_DVSN", "00")
                .queryParam("CTX_AREA_FK100", "")
                .queryParam("CTX_AREA_NK100", "")
                .toUriString();

        BalanceResponse response = kisMockWebClient
                .get()
                .uri(uri)
                .header("authorization", kisAuthService.getMockAccessToken())
                .header("tr_id", trId)
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    logError(trId, body);
                                    return Mono.error(new RuntimeException("KIS balance API error: " + body));
                                }))
                .bodyToMono(BalanceResponse.class)
                .block();

        if (response == null) {
            throw new RuntimeException("KIS API returned null [tr_id=" + trId + "]");
        }
        if (!response.isSuccess()) {
            throw new RuntimeException("KIS API error [tr_id=" + trId + ", rt_cd=" + response.getRt_cd() + ", msg=" + response.getMsg1() + "]");
        }
        return response;
    }

    /**
     * 주식잔고조회_실현손익 (TTTC8494R)
     */
    public KisApiResponse<List<RealizedProfitItem>> getRealizedProfit() {
        rateLimiter.acquire();
        String trId = "VTTC8494R";
        String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/trading/inquire-realized-profit")
                .queryParam("CANO", kisConfig.getAccountNo())
                .queryParam("ACNT_PRDT_CD", kisConfig.getAccountProductCode())
                .queryParam("INQR_DVSN", "01")
                .queryParam("CTX_AREA_FK100", "")
                .queryParam("CTX_AREA_NK100", "")
                .toUriString();

        KisApiResponse<List<RealizedProfitItem>> response = kisWebClient
                .get()
                .uri(uri)
                .header("authorization", getAuthHeader())
                .header("tr_id", trId)
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    logError(trId, body);
                                    return Mono.error(new RuntimeException("KIS realized profit API error: " + body));
                                }))
                .bodyToMono(new ParameterizedTypeReference<KisApiResponse<List<RealizedProfitItem>>>() {})
                .block();

        return validateResponse(response, trId);
    }

    /**
     * 매수가능조회 (실전: TTTC8908R, 모의: VTTC8908R)
     */
    public BuyingPowerResponse getBuyingPower(String stockCode) {
        rateLimiter.acquire();
        String trId = "VTTC8908R"; // 모의투자
        String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/trading/inquire-psbl-order")
                .queryParam("CANO", kisConfig.getAccountNo())
                .queryParam("ACNT_PRDT_CD", kisConfig.getAccountProductCode())
                .queryParam("PDNO", stockCode)
                .queryParam("ORD_UNPR", "0")
                .queryParam("ORD_DVSN", "01") // 시장가
                .queryParam("CMA_EVLU_AMT_ICLD_YN", "N")
                .queryParam("OVRS_ICLD_YN", "N")
                .toUriString();

        KisApiResponse<BuyingPowerResponse> response = kisWebClient
                .get()
                .uri(uri)
                .header("authorization", getAuthHeader())
                .header("tr_id", trId)
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    logError(trId, body);
                                    return Mono.error(new RuntimeException("KIS buying power API error: " + body));
                                }))
                .bodyToMono(new ParameterizedTypeReference<KisApiResponse<BuyingPowerResponse>>() {})
                .block();

        return validateAndReturn(response, trId);
    }

    // ================== 유틸리티 ==================

    /**
     * 해외주식 현재체결가 (HHDFS00000300)
     */
    public OverseasStockPriceResponse getOverseasPrice(String ticker, String exchangeCode) {
        rateLimiter.acquire();
        String trId = "HHDFS00000300";
        String uri = UriComponentsBuilder.fromUriString("/uapi/overseas-stock/v1/quotations/price")
                .queryParam("AUTH", "")
                .queryParam("EXCD", exchangeCode)
                .queryParam("SYMB", ticker)
                .toUriString();

        Exception lastException = null;
        for (int retry = 0; retry <= MAX_RETRY; retry++) {
            try {
                KisApiResponse<OverseasStockPriceResponse> response = kisWebClient
                        .get()
                        .uri(uri)
                        .header("authorization", getAuthHeader())
                        .header("tr_id", trId)
                        .retrieve()
                        .onStatus(status -> status.isError(),
                                clientResponse -> clientResponse.bodyToMono(String.class)
                                        .flatMap(body -> {
                                            logError(trId, body);
                                            return Mono.error(new RuntimeException("KIS overseas price API error: " + body));
                                        }))
                        .bodyToMono(new ParameterizedTypeReference<KisApiResponse<OverseasStockPriceResponse>>() {})
                        .block();

                return validateAndReturn(response, trId);
            } catch (Exception e) {
                lastException = e;
                if (retry < MAX_RETRY && isRateLimitError(e)) {
                    long delay = BASE_RETRY_DELAY_MS * (1L << retry);
                    log.warn("Rate limited for overseas stock {}/{}, retrying in {}ms... ({}/{})", ticker, exchangeCode, delay, retry + 1, MAX_RETRY);
                    try { Thread.sleep(delay); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); throw new RuntimeException("Interrupted during rate limit retry", ie); }
                    rateLimiter.acquire();
                } else if (!isRateLimitError(e)) {
                    throw e;
                }
            }
        }
        throw new RuntimeException("KIS API rate limit exceeded after " + MAX_RETRY + " retries for overseas stock " + ticker + "/" + exchangeCode, lastException);
    }

    /**
     * 해외주식 기간별시세 (HHDFS00000400)
     */
    public List<OverseasDailyPriceItem> getOverseasDailyPrices(String ticker, String exchangeCode,
                                                                String periodDivCode, String startDate, String endDate) {
        rateLimiter.acquire();
        String trId = "HHDFS00000400";
        String uri = UriComponentsBuilder.fromUriString("/uapi/overseas-stock/v1/quotations/daily-price")
                .queryParam("EXCD", exchangeCode)
                .queryParam("SYMB", ticker)
                .queryParam("GUBN", periodDivCode)
                .queryParam("BYMD", endDate)
                .queryParam("MODP", "1")
                .toUriString();

        JsonNode root = kisWebClient
                .get()
                .uri(uri)
                .header("authorization", getAuthHeader())
                .header("tr_id", trId)
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    logError(trId, body);
                                    return Mono.error(new RuntimeException("KIS overseas daily price API error: " + body));
                                }))
                .bodyToMono(JsonNode.class)
                .block();

        return parseOutput2List(root, trId, new TypeReference<List<OverseasDailyPriceItem>>() {});
    }

    /**
     * 국내 종목마스터 조회 (CTPF1604R)
     */
    public List<KisStockMasterItem> getStockMasterList(String marketDivCode) {
        rateLimiter.acquire();
        String trId = "CTPF1604R";
        List<KisStockMasterItem> allItems = new java.util.ArrayList<>();
        String ctxAreaFk = "";
        String ctxAreaNk = "";
        int page_count = 0;
        boolean isFirstPage = true;

        while (true) {
            String currentFk = ctxAreaFk;
            String currentNk = ctxAreaNk;
            String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/quotations/inquire-item-code")
                    .queryParam("PDNO", "")
                    .queryParam("PRDT_TYPE_CD", marketDivCode)
                    .queryParam("PAR_PR", "")
                    .queryParam("CRAHN_YN", "")
                    .queryParam("CTX_AREA_FK100", currentFk)
                    .queryParam("CTX_AREA_NK100", currentNk)
                    .toUriString();

            String trCont = isFirstPage ? "N" : "Y";
            JsonNode root = null;
            for (int retry = 0; retry < 5; retry++) {
                try {
                    root = kisWebClient
                            .get()
                            .uri(uri)
                            .header("authorization", getAuthHeader())
                            .header("tr_id", trId)
                            .header("tr_cont", trCont)
                            .retrieve()
                            .onStatus(status -> status.isError(),
                                    clientResponse -> clientResponse.bodyToMono(String.class)
                                            .flatMap(body -> {
                                                logError(trId, body);
                                                return Mono.error(new RuntimeException("KIS stock master API error: " + body));
                                            }))
                            .bodyToMono(JsonNode.class)
                            .block();
                    log.info("KIS stock master response: {}", root);
                    break;
                } catch (Exception e) {
                    if (retry < 4 && (e.getMessage() != null && e.getMessage().contains("EGW00201"))) {
                        log.warn("Rate limited on page {} for market {}, retrying in 3s... ({}/4)", page_count + 1, marketDivCode, retry + 1);
                        try { Thread.sleep(3000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); throw new RuntimeException("Interrupted during rate limit retry", ie); }
                    } else {
                        throw e;
                    }
                }
            }

            List<KisStockMasterItem> page = parseOutput2List(root, trId, new TypeReference<List<KisStockMasterItem>>() {});
            allItems.addAll(page);
            page_count++;
            isFirstPage = false;

            ctxAreaFk = root.path("ctx_area_fk100").asText("");
            ctxAreaNk = root.path("ctx_area_nk100").asText("");

            if (ctxAreaFk.isBlank() || ctxAreaNk.isBlank() || page.isEmpty()) {
                break;
            }
            log.info("Stock master pagination: fetched {} items so far (page {}), continuing...", allItems.size(), page_count);
            try { Thread.sleep(1100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); break; }
        }

        log.info("Stock master list complete: {} items for market {}", allItems.size(), marketDivCode);
        return allItems;
    }

    /**
     * 해외 종목마스터 조회 (CTPF1702R)
     */
    public List<KisOverseasStockMasterItem> getOverseasStockMasterList(String exchangeCode) {
        rateLimiter.acquire();
        String trId = "CTPF1702R";
        List<KisOverseasStockMasterItem> allItems = new java.util.ArrayList<>();
        String ctxAreaFk = "";
        String ctxAreaNk = "";
        int page_count = 0;
        boolean isFirstPage = true;

        while (true) {
            String currentFk = ctxAreaFk;
            String currentNk = ctxAreaNk;
            String uri = UriComponentsBuilder.fromUriString("/uapi/overseas-stock/v1/quotations/inquire-item-code")
                    .queryParam("PDNO", "")
                    .queryParam("PRDT_TYPE_CD", exchangeCode)
                    .queryParam("CTX_AREA_FK100", currentFk)
                    .queryParam("CTX_AREA_NK100", currentNk)
                    .toUriString();

            String trCont = isFirstPage ? "N" : "Y";
            JsonNode root = null;
            for (int retry = 0; retry < 5; retry++) {
                try {
                    root = kisWebClient
                            .get()
                            .uri(uri)
                            .header("authorization", getAuthHeader())
                            .header("tr_id", trId)
                            .header("tr_cont", trCont)
                            .retrieve()
                            .onStatus(status -> status.isError(),
                                    clientResponse -> clientResponse.bodyToMono(String.class)
                                            .flatMap(body -> {
                                                logError(trId, body);
                                                return Mono.error(new RuntimeException("KIS overseas stock master API error: " + body));
                                            }))
                            .bodyToMono(JsonNode.class)
                            .block();
                    log.info("KIS overseas stock master response: {}", root);
                    break;
                } catch (Exception e) {
                    if (retry < 4 && (e.getMessage() != null && e.getMessage().contains("EGW00201"))) {
                        log.warn("Rate limited on page {} for exchange {}, retrying in 3s... ({}/4)", page_count + 1, exchangeCode, retry + 1);
                        try { Thread.sleep(3000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); throw new RuntimeException("Interrupted during rate limit retry", ie); }
                    } else {
                        throw e;
                    }
                }
            }

            List<KisOverseasStockMasterItem> page = parseOutput2List(root, trId, new TypeReference<List<KisOverseasStockMasterItem>>() {});
            allItems.addAll(page);
            page_count++;
            isFirstPage = false;

            ctxAreaFk = root.path("ctx_area_fk100").asText("");
            ctxAreaNk = root.path("ctx_area_nk100").asText("");

            if (ctxAreaFk.isBlank() || ctxAreaNk.isBlank() || page.isEmpty()) {
                break;
            }
            log.info("Overseas stock master pagination: fetched {} items so far for exchange {} (page {}), continuing...", allItems.size(), exchangeCode, page_count);
            try { Thread.sleep(1100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); break; }
        }

        log.info("Overseas stock master list complete: {} items for exchange {}", allItems.size(), exchangeCode);
        return allItems;
    }

    private <T> T validateAndReturn(KisApiResponse<T> response, String trId) {
        if (response == null) {
            throw new RuntimeException("KIS API returned null [tr_id=" + trId + "]");
        }
        if (!response.isSuccess()) {
            throw new RuntimeException("KIS API error [tr_id=" + trId + ", rt_cd=" + response.getRt_cd() + ", msg=" + response.getMsg1() + "]");
        }
        return response.getOutput() != null ? response.getOutput() : response.getOutput1();
    }

    private boolean isRateLimitError(Exception e) {
        String msg = e.getMessage();
        return msg != null && (msg.contains("EGW00201") || msg.contains("rate limit") || msg.contains("거래건수"));
    }

    private <T> KisApiResponse<T> validateResponse(KisApiResponse<T> response, String trId) {
        if (response == null) {
            throw new RuntimeException("KIS API returned null [tr_id=" + trId + "]");
        }
        if (!response.isSuccess()) {
            throw new RuntimeException("KIS API error [tr_id=" + trId + ", rt_cd=" + response.getRt_cd() + ", msg=" + response.getMsg1() + "]");
        }
        return response;
    }

    private <T> List<T> parseOutput2List(JsonNode root, String trId, TypeReference<List<T>> typeRef) {
        if (root == null) {
            throw new RuntimeException("KIS API returned null [tr_id=" + trId + "]");
        }
        String rtCd = root.path("rt_cd").asText("1");
        if (!"0".equals(rtCd)) {
            String msg1 = root.path("msg1").asText("");
            throw new RuntimeException("KIS API error [tr_id=" + trId + ", rt_cd=" + rtCd + ", msg=" + msg1 + "]");
        }
        JsonNode output2 = root.path("output2");
        if (output2.isMissingNode() || !output2.isArray()) {
            return Collections.emptyList();
        }
        return objectMapper.convertValue(output2, typeRef);
    }
}
