package com.dreamspex.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.List;

@Component
@Profile({"prod", "production"})
public class ProductionConfigurationValidator {
    private final SecurityProperties security;
    private final CorsProperties cors;
    private final SmtpSecretCipher smtpCipher;
    private final String prescriptionStorageDirectory;
    private final String homepageStorageDirectory;

    public ProductionConfigurationValidator(
            SecurityProperties security,
            CorsProperties cors,
            SmtpSecretCipher smtpCipher,
            @Value("${dreamspex.storage.local-directory}") String prescriptionStorageDirectory,
            @Value("${dreamspex.storage.homepage-images-directory}") String homepageStorageDirectory) {
        this.security = security;
        this.cors = cors;
        this.smtpCipher = smtpCipher;
        this.prescriptionStorageDirectory = prescriptionStorageDirectory;
        this.homepageStorageDirectory = homepageStorageDirectory;
    }

    @PostConstruct
    public void validate() {
        requireSecret("DREAMSPEX_JWT_SECRET", security.jwtSecret());
        requireSecret("DREAMSPEX_OTP_SECRET", security.otpSecret());
        requireSecret("DREAMSPEX_DELIVERY_LINK_ENCRYPTION_SECRET",
                security.deliveryLinkEncryptionSecret());
        requireDistinctSecrets();
        validateIssuer(security.jwtIssuer());
        validateCorsOrigins(cors.allowedOrigins());
        smtpCipher.validateConfiguredKey();
        validateStorageDirectory("DREAMSPEX_STORAGE_DIRECTORY", prescriptionStorageDirectory);
        validateStorageDirectory("DREAMSPEX_HOMEPAGE_IMAGES_DIRECTORY", homepageStorageDirectory);
    }

    private void requireSecret(String name, String value) {
        if (value == null || value.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(name + " must contain at least 32 bytes.");
        }
    }

    private void requireDistinctSecrets() {
        List<String> secrets = List.of(security.jwtSecret(), security.otpSecret(),
                security.deliveryLinkEncryptionSecret());
        for (int i = 0; i < secrets.size(); i++) {
            for (int j = i + 1; j < secrets.size(); j++) {
                if (MessageDigest.isEqual(secrets.get(i).getBytes(StandardCharsets.UTF_8),
                        secrets.get(j).getBytes(StandardCharsets.UTF_8))) {
                    throw new IllegalStateException("JWT, OTP, and delivery-link secrets must be different.");
                }
            }
            if (smtpCipher.matchesSecret(secrets.get(i))) {
                throw new IllegalStateException("SMTP encryption key must be independent from authentication secrets.");
            }
        }
    }

    private void validateIssuer(String issuer) {
        URI uri = parseUri(issuer, "DREAMSPEX_JWT_ISSUER");
        if (!"https".equalsIgnoreCase(uri.getScheme()) || isLocalHost(uri.getHost())) {
            throw new IllegalStateException("DREAMSPEX_JWT_ISSUER must use a non-local HTTPS URL.");
        }
    }

    private void validateCorsOrigins(String origins) {
        if (origins == null || origins.isBlank()) {
            throw new IllegalStateException("DREAMSPEX_CORS_ORIGINS must contain at least one production origin.");
        }
        for (String value : origins.split(",")) {
            URI origin = parseUri(value.trim(), "DREAMSPEX_CORS_ORIGINS");
            if (!"https".equalsIgnoreCase(origin.getScheme())
                    || isLocalHost(origin.getHost())
                    || origin.getUserInfo() != null
                    || origin.getQuery() != null
                    || origin.getFragment() != null
                    || (origin.getPath() != null && !origin.getPath().isEmpty() && !"/".equals(origin.getPath()))) {
                throw new IllegalStateException("DREAMSPEX_CORS_ORIGINS must contain only non-local HTTPS origins.");
            }
        }
    }

    private URI parseUri(String value, String propertyName) {
        try {
            URI uri = URI.create(value);
            if (uri.getHost() == null) throw new IllegalArgumentException();
            return uri;
        } catch (RuntimeException exception) {
            throw new IllegalStateException(propertyName + " must contain a valid absolute URL.");
        }
    }

    private boolean isLocalHost(String host) {
        if (host == null) return true;
        String normalized = host.toLowerCase(java.util.Locale.ROOT).replace("[", "").replace("]", "");
        return normalized.equals("localhost") || normalized.endsWith(".localhost")
                || normalized.startsWith("127.") || normalized.equals("::1")
                || normalized.equals("0:0:0:0:0:0:0:1");
    }

    private void validateStorageDirectory(String name, String directory) {
        if (directory == null || directory.isBlank() || !Path.of(directory).isAbsolute()) {
            throw new IllegalStateException(name + " must be configured as an absolute persistent directory.");
        }
    }
}
