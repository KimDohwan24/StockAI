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
        log.debug("Calling AI analysis for ticker={}", ticker);
        return aiServerWebClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/v1/recommend/analysis")
                        .queryParam("ticker", ticker)
                        .build())
                .retrieve()
                .onStatus(status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {
                                    log.error("AI analysis API error for ticker={}: {}", ticker, body);
                                    return Mono.error(new RuntimeException("AI analysis API error: " + body));
                                }))
                .bodyToMono(com.stock.infrastructure.dto.ai.StockAiAnalysisResponse.class);
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
}