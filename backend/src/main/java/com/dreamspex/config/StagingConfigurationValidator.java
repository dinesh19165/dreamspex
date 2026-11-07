package com.dreamspex.config;

import com.dreamspex.payment.PaymentProperties;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.List;

@Component
@Profile("staging")
public class StagingConfigurationValidator {
    private final SecurityProperties security;
    private final CorsProperties cors;
    private final PaymentProperties payment;
    private final Environment environment;
    private final String smtpEncryptionKey;
    private final String prescriptionStorageDirectory;
    private final String homepageStorageDirectory;

    public StagingConfigurationValidator(
            SecurityProperties security,
            CorsProperties cors,
            PaymentProperties payment,
            Environment environment,
            @Value("${DREAMSPEX_SMTP_ENCRYPTION_KEY:}") String smtpEncryptionKey,
            @Value("${dreamspex.storage.local-directory}") String prescriptionStorageDirectory,
            @Value("${dreamspex.storage.homepage-images-directory}") String homepageStorageDirectory) {
        this.security = security;
        this.cors = cors;
        this.payment = payment;
        this.environment = environment;
        this.smtpEncryptionKey = smtpEncryptionKey;
        this.prescriptionStorageDirectory = prescriptionStorageDirectory;
        this.homepageStorageDirectory = homepageStorageDirectory;
    }

    @PostConstruct
    public void validate() {
        validateSecrets();
        validateIssuer(security.jwtIssuer());
        validateCorsOrigins(cors.allowedOrigins());
        validateMailConfiguration();
        validateStorageDirectory("DREAMSPEX_STORAGE_DIRECTORY", prescriptionStorageDirectory);
        validateStorageDirectory("DREAMSPEX_HOMEPAGE_IMAGES_DIRECTORY", homepageStorageDirectory);
        validatePaymentConfiguration();
    }

    private void validateSecrets() {
        List<String> secrets = List.of(
                requireSecret("DREAMSPEX_JWT_SECRET", security.jwtSecret()),
                requireSecret("DREAMSPEX_OTP_SECRET", security.otpSecret()),
                requireSecret("DREAMSPEX_DELIVERY_LINK_ENCRYPTION_SECRET",
                        security.deliveryLinkEncryptionSecret()));
        for (int i = 0; i < secrets.size(); i++) {
            for (int j = i + 1; j < secrets.size(); j++) {
                if (sameSecret(secrets.get(i), secrets.get(j))) {
                    throw new IllegalStateException("Staging JWT, OTP, and delivery-link secrets must be different.");
                }
            }
        }

        byte[] smtpKey;
        try {
            smtpKey = Base64.getDecoder().decode(smtpEncryptionKey);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "DREAMSPEX_SMTP_ENCRYPTION_KEY must be base64-encoded and decode to 32 bytes.");
        }
        if (smtpKey.length != 32) {
            throw new IllegalStateException(
                    "DREAMSPEX_SMTP_ENCRYPTION_KEY must be base64-encoded and decode to 32 bytes.");
        }
        for (String secret : secrets) {
            if (MessageDigest.isEqual(smtpKey, secret.getBytes(StandardCharsets.UTF_8))) {
                throw new IllegalStateException(
                        "DREAMSPEX_SMTP_ENCRYPTION_KEY must be independent from staging authentication secrets.");
            }
        }
    }

    private String requireSecret(String name, String value) {
        if (value == null || value.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(name + " must contain at least 32 bytes.");
        }
        return value;
    }

    private boolean sameSecret(String left, String right) {
        return MessageDigest.isEqual(left.getBytes(StandardCharsets.UTF_8),
                right.getBytes(StandardCharsets.UTF_8));
    }

    private void validateIssuer(String issuer) {
        URI uri = parseUri(issuer, "DREAMSPEX_JWT_ISSUER");
        if (!"https".equalsIgnoreCase(uri.getScheme()) || isLocalHost(uri.getHost())
                || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null) {
            throw new IllegalStateException("DREAMSPEX_JWT_ISSUER must be a non-local HTTPS URL.");
        }
    }

    private void validateCorsOrigins(String origins) {
        if (origins == null || origins.isBlank()) {
            throw new IllegalStateException("DREAMSPEX_CORS_ORIGINS must contain exact staging frontend origins.");
        }
        for (String value : origins.split(",")) {
            URI origin = parseUri(value.trim(), "DREAMSPEX_CORS_ORIGINS");
            if (!"https".equalsIgnoreCase(origin.getScheme())
                    || isLocalHost(origin.getHost())
                    || origin.getUserInfo() != null
                    || origin.getQuery() != null
                    || origin.getFragment() != null
                    || (origin.getPath() != null && !origin.getPath().isEmpty() && !"/".equals(origin.getPath()))) {
                throw new IllegalStateException(
                        "DREAMSPEX_CORS_ORIGINS must contain only exact, non-local HTTPS origins.");
            }
        }
    }

    private void validateMailConfiguration() {
        requireEnvironmentValue("MAIL_HOST");
        requireEnvironmentValue("MAIL_USERNAME");
        requireEnvironmentValue("MAIL_PASSWORD");
        requireEnvironmentValue("MAIL_FROM");
        requireEnvironmentValue("MAIL_PORT");
    }

    private void requireEnvironmentValue(String name) {
        String value = environment.getProperty(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " must be configured for the staging profile.");
        }
    }

    private void validateStorageDirectory(String name, String directory) {
        if (directory == null || directory.isBlank() || !Path.of(directory).isAbsolute()) {
            throw new IllegalStateException(name + " must be an absolute directory path.");
        }
    }

    private void validatePaymentConfiguration() {
        if (!"RAZORPAY_TEST".equals(payment.provider())) {
            throw new IllegalStateException("Staging payment provider must be RAZORPAY_TEST.");
        }
        boolean hasKeyId = payment.keyId() != null && !payment.keyId().isBlank();
        boolean hasKeySecret = payment.keySecret() != null && !payment.keySecret().isBlank();
        if (hasKeyId != hasKeySecret) {
            throw new IllegalStateException(
                    "Configure both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or leave both empty.");
        }
        if (hasKeyId && !payment.keyId().startsWith("rzp_test_")) {
            throw new IllegalStateException("Staging accepts only Razorpay test key IDs beginning with rzp_test_.");
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
}
