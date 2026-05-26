package com.stock.infrastructure.client;

import com.stock.config.AiServerConfig;
import com.stock.infrastructure.dto.ai.AiRecommendationRequest;
import com.stock.infrastructure.dto.ai.AiRecommendationResponse;
import com.stock.infrastructure.dto.ai.AiSentimentRequest;
import com.stock.infrastructure.dto.ai.AiSentimentResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Slf4j
@Component
public class AiServerClient {

    private final WebClient aiServerWebClient;

    public AiServerClient(@Qualifier("aiServerWebClient") WebClient aiServerWebClient) {
        this.aiServerWebClient = aiServerWebClient;
    }

    public AiSentimentResponse analyzeSentiment(String content, String source) {
        AiSentimentRequest request = new AiSentimentRequest(content, source);
        log.debug("Calling AI sentiment analysis for content length={}", content.length());

        return aiServerWebClient
                .post()
                .uri("/analyze")
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    log.error("AI sentiment API error: {}", body);
                                    return Mono.error(new RuntimeException("AI sentiment API error: " + body));
                                }))
                .bodyToMono(AiSentimentResponse.class)
                .block();
    }

    public AiRecommendationResponse getRecommendations(int userId, String riskProfile, java.util.List<String> preferredSectors) {
        AiRecommendationRequest request = new AiRecommendationRequest(userId, riskProfile, preferredSectors);
        log.debug("Calling AI recommendation for userId={}, riskProfile={}", userId, riskProfile);

        return aiServerWebClient
                .post()
                .uri("/recommend")
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    log.error("AI recommendation API error: {}", body);
                                    return Mono.error(new RuntimeException("AI recommendation API error: " + body));
                                }))
                .bodyToMono(AiRecommendationResponse.class)
                .block();
    }

    public Mono<com.stock.infrastructure.dto.ai.StockAiAnalysisResponse> getAiAnalysis(String ticker) {
        return getAiAnalysis(ticker, null, null);
    }

    public Mono<com.stock.infrastructure.dto.ai.StockAiAnalysisResponse> getAiAnalysis(String ticker, String modelName) {
        return getAiAnalysis(ticker, modelName, null);
    }

    public Mono<com.stock.infrastructure.dto.ai.StockAiAnalysisResponse> getAiAnalysis(String ticker, String modelName, String name) {
        log.debug("Calling AI analysis for ticker={} with model={}, name={}", ticker, modelName, name);
        return aiServerWebClient
                .get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder
                            .path("/api/v1/recommend/analysis")
                            .queryParam("ticker", ticker);
                    if (name != null && !name.isBlank()) {
                        builder.queryParam("name", name);
                    }
                    if (modelName != null && !modelName.isBlank()) {
                        builder.queryParam("model", modelName);
                    }
                    return builder.build();
                })
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    log.error("AI analysis API error for ticker={} with model={}, name={}: {}", ticker, modelName, name, body);
                                    return Mono.error(new RuntimeException("AI analysis API error: " + body));
                                }))
                .bodyToMono(com.stock.infrastructure.dto.ai.StockAiAnalysisResponse.class);
    }

    public java.util.List<com.stock.infrastructure.dto.ai.StockNewsItem> searchNews(String query, int limit) {
        log.debug("Calling AI news search for query={}, limit={}", query, limit);
        return aiServerWebClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/v1/recommend/news/search")
                        .queryParam("query", query)
                        .queryParam("limit", limit)
                        .build())
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    log.error("AI news search API error for query={}: {}", query, body);
                                    return Mono.error(new RuntimeException("AI news search API error: " + body));
                                }))
                .bodyToFlux(com.stock.infrastructure.dto.ai.StockNewsItem.class)
                .collectList()
                .block();
    }

    public Mono<com.stock.infrastructure.dto.ai.DashboardRecommendationsResponse> getDashboardRecommendations(String market) {
        log.debug("Calling AI dashboard recommendations for market={}", market);
        return aiServerWebClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/v1/recommend/dashboard")
                        .queryParam("market", market.toLowerCase())
                        .build())
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    log.error("AI dashboard API error for market={}: {}", market, body);
                                    return Mono.error(new RuntimeException("AI dashboard API error: " + body));
                                }))
                .bodyToMono(com.stock.infrastructure.dto.ai.DashboardRecommendationsResponse.class);
    }

    public java.util.List<com.stock.infrastructure.dto.kis.KisStockMasterItem> getAiDomesticStockMaster() {
        log.info("Requesting full domestic stock master from AI NLP server...");
        return aiServerWebClient
                .get()
                .uri("/api/v1/ai/stocks/master/domestic")
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    log.error("AI domestic stock master API error: {}", body);
                                    return Mono.error(new RuntimeException("AI domestic stock master API error: " + body));
                                }))
                .bodyToFlux(com.stock.infrastructure.dto.kis.KisStockMasterItem.class)
                .collectList()
                .block();
    }

    public java.util.List<com.stock.infrastructure.dto.kis.KisOverseasStockMasterItem> getAiOverseasStockMaster() {
        log.info("Requesting full US stock master from AI NLP server...");
        return aiServerWebClient
                .get()
                .uri("/api/v1/ai/stocks/master/overseas")
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    log.error("AI overseas stock master API error: {}", body);
                                    return Mono.error(new RuntimeException("AI overseas stock master API error: " + body));
                                }))
                .bodyToFlux(com.stock.infrastructure.dto.kis.KisOverseasStockMasterItem.class)
                .collectList()
                .block();
    }
}