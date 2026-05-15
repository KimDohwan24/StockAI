# SKILL.md — stock-core-api

> **Verifies**: Spring Boot 4.0.6, Java 17, Gradle, PostgreSQL, Redis
> **Last Checked**: 2026-05-16
> **Module**: `BE/stock-core-api/`

---

## 1. Spring Boot 4 + Gradle Setup

### 1.1 build.gradle

```gradle
// ✅ build.gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '4.0.6'
    id 'io.spring.dependency-management' version '1.1.7'
}

group = 'com.stock'
version = '0.0.1-SNAPSHOT'

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot Starters
    implementation 'org.springframework.boot:spring-boot-starter-web'           // REST API
    implementation 'org.springframework.boot:spring-boot-starter-webflux'        // WebClient (FastAPI 호출)
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'       // JPA
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'   // Redis 캐싱
    implementation 'org.springframework.boot:spring-boot-starter-security'     // 인증/인가
    implementation 'org.springframework.boot:spring-boot-starter-validation'   // DTO 검증

    // JWT
    implementation 'io.jsonwebtoken:jjwt-api:0.12.6'
    runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.6'
    runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.6'

    // Database
    runtimeOnly 'org.postgresql:postgresql'

    // Test
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

tasks.named('test') {
    useJUnitPlatform()
}
```

**⚠️ Key Rule:** Spring Boot 4는 **Java 17 이상**을 요구합니다. `javax.*` 대신 **Jakarta EE** 네임스페이스(`jakarta.*`)를 사용합니다.

### 1.2 application.yml

```yaml
# ✅ src/main/resources/application.yml
spring:
  application:
    name: stock-core-api

  datasource:
    url: jdbc:postgresql://localhost:5432/stockdb
    username: postgres
    password: password
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: validate  # production: validate, dev: update
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect

  data:
    redis:
      host: localhost
      port: 6379
      timeout: 2000ms

server:
  port: 8080
  servlet:
    context-path: /api/v1  # 모든 엔드포인트에 /api/v1 prefix

# Custom Properties
app:
  ai-server:
    url: http://localhost:8000
    timeout: 5000ms
  jwt:
    secret: ${JWT_SECRET:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2}
    expiration: 86400000  # 24h (ms)
```

**⚠️ Key Rule:** `server.servlet.context-path: /api/v1`로 설정하면 모든 Controller에 자동으로 prefix가 붙습니다. `@RequestMapping("/stocks")` → 실제 경로: `/api/v1/stocks`.

---

## 2. Layered Architecture Pattern

```
Controller (REST API + DTO)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Database / Redis / External API
```

### 2.1 Controller Layer

```java
// ✅ com.stock.controller.StockController
package com.stock.controller;

import com.stock.controller.dto.StockResponse;
import com.stock.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    @GetMapping
    public ResponseEntity<List<StockResponse>> getAllStocks() {
        return ResponseEntity.ok(stockService.findAll());
    }

    @GetMapping("/{ticker}")
    public ResponseEntity<StockResponse> getStock(@PathVariable String ticker) {
        return ResponseEntity.ok(stockService.findByTicker(ticker));
    }
}
```

### 2.2 Service Layer

```java
// ✅ com.stock.service.StockService
package com.stock.service;

import com.stock.controller.dto.StockResponse;
import com.stock.domain.stock.Stock;
import com.stock.domain.stock.StockRepository;
import com.stock.infrastructure.client.AiServerClient;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockService {

    private final StockRepository stockRepository;
    private final AiServerClient aiServerClient;

    @Cacheable(value = "stocks", key = "'all'")
    public List<StockResponse> findAll() {
        return stockRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public StockResponse findByTicker(String ticker) {
        Stock stock = stockRepository.findByTicker(ticker)
                .orElseThrow(() -> new StockNotFoundException("STOCK_001", ticker));
        return toResponse(stock);
    }

    private StockResponse toResponse(Stock stock) {
        return new StockResponse(
                stock.getTicker(),
                stock.getName(),
                stock.getCurrentPrice(),
                stock.getChangeRate()
        );
    }
}
```

### 2.3 Domain Layer (JPA Entity)

```java
// ✅ com.stock.domain.user.User
package com.stock.domain.user;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RiskProfile riskProfile;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum Role {
        ROLE_USER, ROLE_ADMIN
    }

    public enum RiskProfile {
        CONSERVATIVE, MODERATE, AGGRESSIVE
    }
}
```

### 2.4 Repository Layer

```java
// ✅ com.stock.domain.stock.StockRepository
package com.stock.domain.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {

    Optional<Stock> findByTicker(String ticker);

    @Query("SELECT s FROM Stock s WHERE s.sector = :sector ORDER BY s.marketCap DESC")
    List<Stock> findTopBySectorOrderByMarketCapDesc(@Param("sector") String sector);

    boolean existsByTicker(String ticker);
}
```

**⚠️ Key Rule:** Repository는 인터페이스만 정의하고, Spring Data JPA가 구현체를 자동 생성합니다. 복잡한 쿼리는 `@Query` 또는 QueryDSL을 사용합니다.

---

## 3. DTO Design Pattern

### 3.1 Request DTO

```java
// ✅ com.stock.controller.dto.SignupRequest
package com.stock.controller.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "유효한 이메일 형식이 아닙니다.")
        String email,

        @NotBlank(message = "비밀번호는 필수입니다.")
        @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다.")
        String password,

        @NotBlank(message = "이름은 필수입니다.")
        @Size(max = 50, message = "이름은 50자 이하여야 합니다.")
        String name
) {}
```

### 3.2 Response DTO

```java
// ✅ com.stock.controller.dto.TokenResponse
package com.stock.controller.dto;

import java.time.LocalDateTime;

public record TokenResponse(
        String accessToken,
        String tokenType,
        LocalDateTime expiresAt
) {}
```

### 3.3 Validation + Exception

```java
// ✅ com.stock.exception.ValidationException
package com.stock.exception;

import lombok.Getter;

@Getter
public class ValidationException extends RuntimeException {
    private final String code;

    public ValidationException(String code, String message) {
        super(message);
        this.code = code;
    }
}
```

---

## 4. WebClient — FastAPI 호출

### 4.1 Configuration

```java
// ✅ com.stock.infrastructure.config.WebClientConfig
package com.stock.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
public class WebClientConfig {

    @Value("${app.ai-server.url}")
    private String aiServerUrl;

    @Value("${app.ai-server.timeout:5000}")
    private int timeoutMs;

    @Bean
    public WebClient aiServerWebClient() {
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofMillis(timeoutMs));

        return WebClient.builder()
                .baseUrl(aiServerUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
```

### 4.2 Client Class

```java
// ✅ com.stock.infrastructure.client.AiServerClient
package com.stock.infrastructure.client;

import com.stock.controller.dto.RecommendationResponse;
import com.stock.controller.dto.SentimentRequest;
import com.stock.controller.dto.SentimentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class AiServerClient {

    private final WebClient aiServerWebClient;

    public Mono<SentimentResponse> analyzeSentiment(SentimentRequest request) {
        return aiServerWebClient.post()
                .uri("/analyze")
                .bodyValue(request)
                .retrieve()
                .onStatus(
                        status -> status.isError(),
                        response -> Mono.error(new AiServerException("AI 서버 호출 실패"))
                )
                .bodyToMono(SentimentResponse.class);
    }

    public Mono<RecommendationResponse> getRecommendations(Long userId, String riskProfile) {
        return aiServerWebClient.post()
                .uri("/recommend")
                .bodyValue(new RecommendationRequest(userId, riskProfile))
                .retrieve()
                .bodyToMono(RecommendationResponse.class);
    }
}
```

### 4.3 Service에서 사용

```java
// ✅ com.stock.service.RecommendationService
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final AiServerClient aiServerClient;
    private final UserRepository userRepository;

    public RecommendationResponse recommend(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("USER_001"));

        // WebClient는 비동기지만, Controller에 맞게 block() 또는 reactive 반환
        return aiServerClient
                .getRecommendations(userId, user.getRiskProfile().name())
                .block(); // or return Mono/Flux for fully reactive
    }
}
```

**⚠️ Key Rule:** `block()`은 동기 방식입니다. 완전한 비동기를 원하면 Controller에서 `Mono<ResponseEntity<?>>`를 반환하세요.

---

## 5. Spring Security + JWT

### 5.1 Security Config

```java
// ✅ com.stock.infrastructure.config.SecurityConfig
package com.stock.infrastructure.config;

import com.stock.infrastructure.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**", "/health").permitAll()
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

### 5.2 JWT Filter

```java
// ✅ com.stock.infrastructure.security.JwtAuthenticationFilter
package com.stock.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String token = resolveToken(request);
        if (token != null && jwtTokenProvider.validateToken(token)) {
            var authentication = jwtTokenProvider.getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
```

### 5.3 JWT Provider

```java
// ✅ com.stock.infrastructure.security.JwtTokenProvider
package com.stock.infrastructure.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long expiration;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration}") long expiration) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }

    public String generateToken(String email, String role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .subject(email)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public Authentication getAuthentication(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String email = claims.getSubject();
        String role = claims.get("role", String.class);

        return new UsernamePasswordAuthenticationToken(
                email,
                null,
                List.of(new SimpleGrantedAuthority(role))
        );
    }
}
```

**⚠️ Key Rule:** Spring Boot 4는 `javax.*`를 사용하지 않습니다. `jakarta.servlet.*`를 import 해야 합니다.

---

## 6. Redis Caching

### 6.1 Enable Caching

```java
// ✅ com.stock.StockCoreApiApplication
package com.stock;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
public class StockCoreApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(StockCoreApiApplication.class, args);
    }
}
```

### 6.2 Cache Configuration

```java
// ✅ com.stock.infrastructure.config.RedisConfig
package com.stock.infrastructure.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;

@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(
                                new GenericJackson2JsonRedisSerializer()
                        )
                );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }
}
```

### 6.3 Cache Usage

```java
// ✅ com.stock.service.StockService
@Service
@RequiredArgsConstructor
public class StockService {

    @Cacheable(value = "stocks", key = "#ticker")
    public StockResponse findByTicker(String ticker) {
        // DB 조회
    }

    @CacheEvict(value = "stocks", key = "#ticker")
    public void updateStockPrice(String ticker, BigDecimal newPrice) {
        // 가격 업데이트 후 캐시 삭제
    }

    @CacheEvict(value = "stocks", allEntries = true)
    public void refreshAllStocks() {
        // 전체 캐시 초기화
    }
}
```

---

## 7. Exception Handling

### 7.1 Global Exception Handler

```java
// ✅ com.stock.exception.GlobalExceptionHandler
package com.stock.exception;

import com.stock.controller.dto.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BaseAppException.class)
    public ResponseEntity<ErrorResponse> handleBaseAppException(BaseAppException e) {
        log.error("App exception: {}", e.getMessage(), e);
        return ResponseEntity
                .status(e.getStatusCode())
                .body(new ErrorResponse(e.getCode(), e.getMessage(), LocalDateTime.now()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .findFirst()
                .orElse("입력값 검증 실패");

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("VALID_001", message, LocalDateTime.now()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception e) {
        log.error("Unexpected error: {}", e.getMessage(), e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("SYSTEM_002", "서버 내부 오류가 발생했습니다.", LocalDateTime.now()));
    }
}
```

### 7.2 Base Exception

```java
// ✅ com.stock.exception.BaseAppException
package com.stock.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class BaseAppException extends RuntimeException {
    private final String code;
    private final HttpStatus statusCode;

    public BaseAppException(String code, String message, HttpStatus statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}
```

---

## 8. Do's and Don'ts

### ✅ Do
- **Jakarta EE** import 사용 (`jakarta.persistence.*`, `jakarta.validation.*`)
- **Record**로 DTO 정의 (Java 16+) — 불변, 간결
- **`@RequiredArgsConstructor`** + `final` 필드로 의존성 주입
- **WebClient**로 외부 API 호출 — `RestTemplate` deprecated
- **`@Transactional(readOnly = true)** on Service class, write 메서드만 `@Transactional`
- **Fetch Join** 또는 **Entity Graph**로 N+1 문제 방지
- **Redis**로 실시간 데이터 캐싱 — TTL 10분 권장

### ❌ Don't
- `javax.*` import 사용 — Spring Boot 4에서 호환 불가
- `RestTemplate` 사용 — WebClient로 마이그레이션
- Entity에 `@Data` (Lombok) 사용 — `toString()` 순환 참조 위험. `@Getter`만 사용
- Controller에서 비즈니스 로직 직접 처리 — Service 계층으로 위임
- DTO에 Entity 직접 노출 — 순환 참조 + 보안 문제
- `application.properties` 사용 — `application.yml` 통일
- 비밀번호 평문 저장 — 반드시 `BCryptPasswordEncoder` 사용

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ClassNotFoundException: javax.*` | Jakarta EE 마이그레이션 미완료 | `jakarta.*`로 import 변경 |
| `LazyInitializationException` | 영속성 컨텍스트 외부에서 지연 로딩 | `@Transactional` 범위 확인 또는 Fetch Join 사용 |
| Redis 연결 실패 | Docker 미실행 | `docker run -p 6379:6379 redis:alpine` |
| JWT 검증 실패 | Secret Key 불일치 또는 만료 | `application.yml`의 `app.jwt.secret` 확인 |
| WebClient timeout | FastAPI 응답 지연 | `app.ai-server.timeout` 값 증가 또는 비동기 처리 |
| Gradle build 실패 | Java 버전 불일치 | `java -version`으로 17 이상 확인, `build.gradle`의 `toolchain` 확인 |

---

## 10. Testing Pattern

### 10.1 Unit Test (Service Layer)

```java
// ✅ src/test/java/com/stock/service/StockServiceTest.java
package com.stock.service;

import com.stock.domain.stock.Stock;
import com.stock.domain.stock.StockRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockServiceTest {

    @Mock
    private StockRepository stockRepository;

    @InjectMocks
    private StockService stockService;

    @Test
    void findByTicker_returnsStock() {
        Stock stock = Stock.builder()
                .ticker("005930")
                .name("삼성전자")
                .currentPrice(new BigDecimal("78500"))
                .build();

        when(stockRepository.findByTicker("005930")).thenReturn(Optional.of(stock));

        var response = stockService.findByTicker("005930");

        assertThat(response.ticker()).isEqualTo("005930");
        assertThat(response.name()).isEqualTo("삼성전자");
    }
}
```

### 10.2 Integration Test (Controller)

```java
// ✅ src/test/java/com/stock/controller/StockControllerTest.java
package com.stock.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class StockControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getStock_returns200() throws Exception {
        mockMvc.perform(get("/stocks/005930"))
                .andExpect(status().isOk());
    }
}
```

---

> 본 문서는 `stock-core-api` 내 **기술 패턴**을 다룹니다.
> 프로젝트 전체 맥락은 [AGENT.md](AGENT.md)를 참조하세요.
