package com.stock.infrastructure.client;

import com.stock.config.KisConfig;
import com.stock.infrastructure.dto.kis.*;
import com.stock.service.KisAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class KisApiClient {

    private final KisConfig kisConfig;
    private final KisAuthService kisAuthService;

    private WebClient getWebClient() {
        return WebClient.builder()
                .baseUrl(kisConfig.getBaseUrl())
                .defaultHeader("Content-Type", "application/json; charset=utf-8")
                .defaultHeader("appkey", kisConfig.getAppkey())
                .defaultHeader("appsecret", kisConfig.getAppsecret())
                .defaultHeader("custtype", "P")
                .build();
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
        String trId = "FHKST01010100"; // 실전투자용
        String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/quotations/inquire-price")
                .queryParam("fid_cond_mrkt_div_code", "J")
                .queryParam("fid_input_iscd", stockCode)
                .toUriString();

        KisApiResponse<StockPriceResponse> response = getWebClient()
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
    }

    /**
     * 국내주식기간별시세(일/주/월/년) (FHKST03010100)
     */
    public List<DailyPriceItem> getDailyPrices(String stockCode, String periodDivCode, String startDate, String endDate) {
        String trId = "FHKST03010100";
        String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/quotations/inquire-daily-price")
                .queryParam("fid_cond_mrkt_div_code", "J")
                .queryParam("fid_input_iscd", stockCode)
                .queryParam("fid_input_date_1", startDate)
                .queryParam("fid_input_date_2", endDate)
                .queryParam("fid_period_div_code", periodDivCode) // D:일, W:주, M:월, Y:년
                .queryParam("fid_org_adj_prc", "0") // 0:수정주가, 1:원주가
                .toUriString();

        KisApiResponse<List<DailyPriceItem>> response = getWebClient()
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
                .bodyToMono(new ParameterizedTypeReference<KisApiResponse<List<DailyPriceItem>>>() {})
                .block();

        return validateAndReturn(response, trId);
    }

    /**
     * 주식당일분봉조회 (FHKST03010200)
     */
    public List<MinutePriceItem> getMinutePrices(String stockCode) {
        String trId = "FHKST03010200";
        String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice")
                .queryParam("fid_cond_mrkt_div_code", "J")
                .queryParam("fid_input_iscd", stockCode)
                .queryParam("fid_hour_cls_code", "0") // 0: 30분봉 (KIS API 특성상 30분 단위)
                .queryParam("fid_pw_data_incu_yn", "N")
                .toUriString();

        KisApiResponse<List<MinutePriceItem>> response = getWebClient()
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
                .bodyToMono(new ParameterizedTypeReference<KisApiResponse<List<MinutePriceItem>>>() {})
                .block();

        return validateAndReturn(response, trId);
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
        KisApiResponse<OrderResponse> response = getWebClient()
                .post()
                .uri("/uapi/domestic-stock/v1/trading/order-cash")
                .header("authorization", getAuthHeader())
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
    }

    /**
     * 주식주문정정취소 (실전: TTTC0803U, 모의: VTTC0803U)
     */
    public OrderResponse amendCancelOrder(OrderRequest request) {
        String trId = "VTTC0803U"; // 모의투자 정정취소
        KisApiResponse<OrderResponse> response = getWebClient()
                .post()
                .uri("/uapi/domestic-stock/v1/trading/order-rvsecncl")
                .header("authorization", getAuthHeader())
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
        String trId = "VTTC8434R"; // 모의투자
        String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/trading/inquire-balance")
                .queryParam("CANO", kisConfig.getAccountNo())
                .queryParam("ACNT_PRDT_CD", kisConfig.getAccountProductCode())
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

        BalanceResponse response = getWebClient()
                .get()
                .uri(uri)
                .header("authorization", getAuthHeader())
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
        String trId = "TTTC8494R";
        String uri = UriComponentsBuilder.fromUriString("/uapi/domestic-stock/v1/trading/inquire-realized-profit")
                .queryParam("CANO", kisConfig.getAccountNo())
                .queryParam("ACNT_PRDT_CD", kisConfig.getAccountProductCode())
                .queryParam("INQR_DVSN", "01")
                .queryParam("CTX_AREA_FK100", "")
                .queryParam("CTX_AREA_NK100", "")
                .toUriString();

        KisApiResponse<List<RealizedProfitItem>> response = getWebClient()
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

        KisApiResponse<BuyingPowerResponse> response = getWebClient()
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

    private <T> T validateAndReturn(KisApiResponse<T> response, String trId) {
        if (response == null) {
            throw new RuntimeException("KIS API returned null [tr_id=" + trId + "]");
        }
        if (!response.isSuccess()) {
            throw new RuntimeException("KIS API error [tr_id=" + trId + ", rt_cd=" + response.getRt_cd() + ", msg=" + response.getMsg1() + "]");
        }
        return response.getOutput() != null ? response.getOutput() : response.getOutput1();
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
}
