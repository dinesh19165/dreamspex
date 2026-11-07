package com.dreamspex.config;

import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductionConfigurationValidatorTest {
    private static final String JWT_SECRET = "jwt-secret-with-at-least-32-bytes-value";
    private static final String OTP_SECRET = "otp-secret-with-at-least-32-bytes-value";
    private static final String DELIVERY_SECRET = "delivery-secret-with-at-least-32-bytes";

    @Test
    void acceptsIndependentSecretsSecureOriginsAndAbsoluteStoragePaths() {
        assertDoesNotThrow(() -> validator(JWT_SECRET, OTP_SECRET, DELIVERY_SECRET,
                "https://api.dreamspex.example", "https://dreamspex.example").validate());
    }

    @Test
    void rejectsSecretsThatAreTooShortOrReused() {
        assertThrows(IllegalStateException.class, () -> validator("short", OTP_SECRET, DELIVERY_SECRET,
                "https://api.dreamspex.example", "https://dreamspex.example").validate());
        assertThrows(IllegalStateException.class, () -> validator(JWT_SECRET, JWT_SECRET, DELIVERY_SECRET,
                "https://api.dreamspex.example", "https://dreamspex.example").validate());
    }

    @Test
    void rejectsLocalAndNonHttpsProductionOrigins() {
        assertThrows(IllegalStateException.class, () -> validator(JWT_SECRET, OTP_SECRET, DELIVERY_SECRET,
                "https://api.dreamspex.example", "http://localhost:5173").validate());
    }

    private ProductionConfigurationValidator validator(String jwt, String otp, String delivery,
                                                         String issuer, String origin) {
        SecurityProperties security = new SecurityProperties(issuer, jwt, otp, 15, 30, delivery);
        CorsProperties cors = new CorsProperties(origin);
        String smtpKey = Base64.getEncoder().encodeToString(new byte[32]);
        String storage = Path.of(System.getProperty("java.io.tmpdir"), "dreamspex-test-storage").toString();
        return new ProductionConfigurationValidator(security, cors, new SmtpSecretCipher(smtpKey),
                storage, storage);
    }
}
