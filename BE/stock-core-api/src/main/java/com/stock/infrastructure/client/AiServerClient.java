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
}