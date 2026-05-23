package com.stock.security.config;

import com.stock.security.jwt.JwtAuthenticationFilter;
import com.stock.security.ratelimit.RateLimitFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitFilter rateLimitFilter;
    private final UserDetailsService userDetailsService;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          RateLimitFilter rateLimitFilter,
                          UserDetailsService userDetailsService) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("http://localhost:*", "https://*.vercel.app"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        configuration.setExposedHeaders(List.of("X-Cache"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/auth/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/stocks/prices")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/stocks/{stockCode}/price")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/stocks/{stockCode}/minute")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/stocks/daily")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/stocks")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/stocks/search")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/stocks/sectors")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/overseas-stocks/prices")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/overseas-stocks")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/overseas-stocks/search")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/overseas-stocks/{ticker}/price")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/overseas-stocks/{ticker}/daily")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/overseas-stocks/sectors")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/stocks/trending")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/overseas-stocks/trending")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/trending/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/account/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/portfolio/**")).authenticated()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/v1/stocks/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/api/ws/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/ws/**")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/error")).permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return new ProviderManager(provider);
    }
}