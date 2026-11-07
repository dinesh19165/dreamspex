package com.dreamspex.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dreamspex.cors")
public record CorsProperties(String allowedOrigins) {
}
