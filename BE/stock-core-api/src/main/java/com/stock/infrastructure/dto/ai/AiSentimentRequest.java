package com.stock.infrastructure.dto.ai;

import lombok.Data;

@Data
public class AiSentimentRequest {
    private String content;
    private String source;

    public AiSentimentRequest(String content, String source) {
        this.content = content;
        this.source = source;
    }
}