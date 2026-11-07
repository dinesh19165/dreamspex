package com.dreamspex.security;
import com.dreamspex.auth.entity.User;
import com.dreamspex.config.SecurityProperties;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.stream.Collectors;

@Service
public class JwtService {
    private final SecurityProperties properties;
    private final SecretKey key;

    public JwtService(SecurityProperties properties) {
        if (properties.jwtSecret() == null || properties.jwtSecret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("DREAMSPEX_JWT_SECRET must contain at least 32 bytes");
        }
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.jwtSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String issue(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(properties.jwtIssuer())
                .subject(user.getId())
                .claim("tokenVersion", user.getTokenVersion())
                .claim("roles", user.getRoles().stream().map(role -> role.getCode()).collect(Collectors.toSet()))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(properties.accessTokenMinutes() * 60)))
                .signWith(key)
                .compact();
    }

    public Jws<Claims> parse(String token) {
        return Jwts.parser().verifyWith(key).requireIssuer(properties.jwtIssuer()).build().parseSignedClaims(token);
    }
}
