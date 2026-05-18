package com.stock.security.ratelimit;

import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Pattern STOCK_PRICE_PATTERN = Pattern.compile("/api/stocks/[^/]+/price");
    private static final Pattern OVERSEAS_STOCK_PRICE_PATTERN = Pattern.compile("/api/overseas-stocks/[^/]+/price");

    private static final Set<String> BATCH_PATHS = Set.of(
            "/api/stocks/prices",
            "/api/overseas-stocks/prices"
    );

    private final com.github.benmanes.caffeine.cache.Cache<String, Bucket> bucketCache = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(10))
            .maximumSize(5000)
            .build();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String clientIp = resolveClientIp(request);
        String path = request.getRequestURI();
        int limit = resolveLimit(path);
        String bucketKey = clientIp + ":" + path;

        Bucket bucket = bucketCache.asMap().computeIfAbsent(bucketKey, k -> createBucket(limit));
        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else if (BATCH_PATHS.contains(path)) {
            try {
                Thread.sleep(500);
                if (bucket.tryConsume(1)) {
                    filterChain.doFilter(request, response);
                } else {
                    response.setStatus(429);
                    response.setHeader("Retry-After", "10");
                    response.getWriter().write("Too many requests");
                    log.warn("Rate limit exceeded for IP={} path={} (batch, after queue)", clientIp, path);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                response.setStatus(429);
                response.setHeader("Retry-After", "10");
                response.getWriter().write("Too many requests");
            }
        } else {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.getWriter().write("Too many requests");
            log.warn("Rate limit exceeded for IP={} path={}", clientIp, path);
        }
    }

    private Bucket createBucket(int limit) {
        Bandwidth bandwidth = Bandwidth.classic(limit, Refill.intervally(limit, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(bandwidth).build();
    }

    private int resolveLimit(String path) {
        if (path.equals("/api/stocks")) return 120;
        if (path.startsWith("/api/stocks/search")) return 120;
        if (path.startsWith("/api/stocks/sectors")) return 120;
        if (path.equals("/api/overseas-stocks")) return 120;
        if (path.startsWith("/api/overseas-stocks/search")) return 120;
        if (path.startsWith("/api/overseas-stocks/sectors")) return 120;
        if (path.startsWith("/api/auth/login")) return 10;
        if (path.startsWith("/api/auth/signup")) return 5;
        if (path.startsWith("/api/ws/register")) return 30;
        if (path.startsWith("/api/ws/subscribe") || path.startsWith("/api/ws/unsubscribe")) return 120;
        if (path.equals("/api/stocks/prices")) return 100;
        if (path.equals("/api/overseas-stocks/prices")) return 100;
        if (STOCK_PRICE_PATTERN.matcher(path).matches()) return 30;
        if (OVERSEAS_STOCK_PRICE_PATTERN.matcher(path).matches()) return 30;
        if (path.startsWith("/api/trending")) return 30;
        if (path.startsWith("/api/portfolio")) return 60;
        return 60;
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}