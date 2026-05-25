package com.stock.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stock.config.KisConfig;
import com.stock.infrastructure.client.AiServerClient;
import com.stock.infrastructure.dto.ai.DashboardRecommendationsResponse;
import com.stock.infrastructure.dto.ai.StockAiAnalysisResponse;
import com.stock.security.jwt.JwtAuthenticationFilter;
import com.stock.security.jwt.JwtTokenProvider;
import com.stock.security.ratelimit.RateLimitFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import reactor.core.publisher.Mono;

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(AiRecommendationController.class)
@AutoConfigureMockMvc(addFilters = false)
public class AiRecommendationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private KisConfig kisConfig;

    @MockBean
    private AiServerClient aiServerClient;

    @MockBean
    private StringRedisTemplate redisTemplate;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private RateLimitFilter rateLimitFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private ValueOperations<String, String> valueOperations;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        valueOperations = Mockito.mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @WithMockUser
    void getAiAnalysis_CacheHit() throws Exception {
        StockAiAnalysisResponse mockResponse = new StockAiAnalysisResponse();
        mockResponse.setScore(45.0);
        mockResponse.setSignal("BUY");
        mockResponse.setReason("Bullish momentum");
        mockResponse.setNews(new ArrayList<>());

        String json = objectMapper.writeValueAsString(mockResponse);
        when(valueOperations.get("ai::analysis::005930")).thenReturn(json);

        var mvcResult = mockMvc.perform(get("/api/v1/stocks/005930/ai-analysis"))
                .andReturn();

        mockMvc.perform(asyncDispatch(mvcResult))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Cache", "HIT"))
                .andExpect(jsonPath("$.score").value(45.0))
                .andExpect(jsonPath("$.signal").value("BUY"))
                .andExpect(jsonPath("$.reason").value("Bullish momentum"));
    }

    @Test
    @WithMockUser
    void getAiAnalysis_CacheMiss() throws Exception {
        StockAiAnalysisResponse mockResponse = new StockAiAnalysisResponse();
        mockResponse.setScore(45.0);
        mockResponse.setSignal("BUY");
        mockResponse.setReason("Bullish momentum");
        mockResponse.setNews(new ArrayList<>());

        when(valueOperations.get(anyString())).thenReturn(null);
        when(aiServerClient.getAiAnalysis("005930")).thenReturn(Mono.just(mockResponse));

        var mvcResult = mockMvc.perform(get("/api/v1/stocks/005930/ai-analysis"))
                .andReturn();

        mockMvc.perform(asyncDispatch(mvcResult))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Cache", "MISS"))
                .andExpect(jsonPath("$.score").value(45.0))
                .andExpect(jsonPath("$.signal").value("BUY"))
                .andExpect(jsonPath("$.reason").value("Bullish momentum"));
    }

    @Test
    @WithMockUser
    void getRecommendations_CacheHit() throws Exception {
        DashboardRecommendationsResponse mockResponse = new DashboardRecommendationsResponse();
        mockResponse.setRecommended(new ArrayList<>());
        mockResponse.setAvoided(new ArrayList<>());

        String json = objectMapper.writeValueAsString(mockResponse);
        when(valueOperations.get("ai::dashboard::domestic")).thenReturn(json);

        var mvcResult = mockMvc.perform(get("/api/v1/stocks/recommendations").param("market", "domestic"))
                .andReturn();

        mockMvc.perform(asyncDispatch(mvcResult))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Cache", "HIT"));
    }

    @Test
    @WithMockUser
    void getRecommendations_CacheMiss() throws Exception {
        DashboardRecommendationsResponse mockResponse = new DashboardRecommendationsResponse();
        mockResponse.setRecommended(new ArrayList<>());
        mockResponse.setAvoided(new ArrayList<>());

        when(valueOperations.get(anyString())).thenReturn(null);
        when(aiServerClient.getDashboardRecommendations("domestic")).thenReturn(Mono.just(mockResponse));

        var mvcResult = mockMvc.perform(get("/api/v1/stocks/recommendations").param("market", "domestic"))
                .andReturn();

        mockMvc.perform(asyncDispatch(mvcResult))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Cache", "MISS"));
    }
}
