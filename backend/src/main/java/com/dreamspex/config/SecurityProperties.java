package com.dreamspex.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dreamspex.security")
public record SecurityProperties(
        String jwtIssuer,
        String jwtSecret,
        String otpSecret,
        long accessTokenMinutes,
        long refreshTokenDays,
        String deliveryLinkEncryptionSecret) {
}
