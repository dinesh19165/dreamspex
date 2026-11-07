package com.dreamspex.config;

import com.dreamspex.payment.PaymentProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.nio.file.Path;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class StagingConfigurationValidatorTest {
    private static final String JWT_SECRET = "staging-jwt-secret-with-at-least-32-bytes";
    private static final String OTP_SECRET = "staging-otp-secret-with-at-least-32-bytes";
    private static final String DELIVERY_SECRET = "staging-delivery-secret-with-at-least-32-bytes";

    @Test
    void acceptsIndependentSecretsExactOriginsAndRazorpayTestCredentials() {
        assertDoesNotThrow(() -> validator(JWT_SECRET, OTP_SECRET, DELIVERY_SECRET,
                "https://dreamspex-staging.pages.dev", "rzp_test_example", "test-secret").validate());
    }

    @Test
    void permitsPaymentsToRemainDisabledWithoutGatewayCredentials() {
        assertDoesNotThrow(() -> validator(JWT_SECRET, OTP_SECRET, DELIVERY_SECRET,
                "https://dreamspex-staging.pages.dev", "", "").validate());
    }

    @Test
    void rejectsReusedOrShortSecretsAndMissingSmtpEncryptionKey() {
        assertThrows(IllegalStateException.class, () -> validator("short", OTP_SECRET, DELIVERY_SECRET,
                "https://dreamspex-staging.pages.dev", "", "").validate());
        assertThrows(IllegalStateException.class, () -> validator(JWT_SECRET, JWT_SECRET, DELIVERY_SECRET,
                "https://dreamspex-staging.pages.dev", "", "").validate());
        assertThrows(IllegalStateException.class, () -> validator(JWT_SECRET, OTP_SECRET, DELIVERY_SECRET,
                "https://dreamspex-staging.pages.dev", "", "", "").validate());
    }

    @Test
    void rejectsLivePaymentCredentialsAndIncompleteCredentialPairs() {
        assertThrows(IllegalStateException.class, () -> validator(JWT_SECRET, OTP_SECRET, DELIVERY_SECRET,
                "https://dreamspex-staging.pages.dev", "rzp_live_example", "secret").validate());
        assertThrows(IllegalStateException.class, () -> validator(JWT_SECRET, OTP_SECRET, DELIVERY_SECRET,
                "https://dreamspex-staging.pages.dev", "rzp_test_example", "").validate());
    }

    @Test
    void rejectsWildcardAndNonHttpsCorsOrigins() {
        assertThrows(IllegalStateException.class, () -> validator(JWT_SECRET, OTP_SECRET, DELIVERY_SECRET,
                "*", "", "").validate());
        assertThrows(IllegalStateException.class, () -> validator(JWT_SECRET, OTP_SECRET, DELIVERY_SECRET,
                "http://dreamspex-staging.pages.dev", "", "").validate());
    }

    @Test
    void rejectsMissingStagingSmtpSettings() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("MAIL_HOST", "smtp.example.test")
                .withProperty("MAIL_PORT", "587")
                .withProperty("MAIL_USERNAME", "staging@example.test")
                .withProperty("MAIL_FROM", "staging@example.test");
        assertThrows(IllegalStateException.class, () -> validator(JWT_SECRET, OTP_SECRET, DELIVERY_SECRET,
                "https://dreamspex-staging.pages.dev", "", "", environment).validate());
    }

    private StagingConfigurationValidator validator(String jwt, String otp, String delivery,
                                                      String origin, String keyId, String keySecret) {
        return validator(jwt, otp, delivery, origin, keyId, keySecret, environment());
    }

    private StagingConfigurationValidator validator(String jwt, String otp, String delivery,
                                                      String origin, String keyId, String keySecret,
                                                      String smtpKey) {
        return validator(jwt, otp, delivery, origin, keyId, keySecret, environment(), smtpKey);
    }

    private StagingConfigurationValidator validator(String jwt, String otp, String delivery,
                                                      String origin, String keyId, String keySecret,
                                                      MockEnvironment environment) {
        return validator(jwt, otp, delivery, origin, keyId, keySecret, environment,
                Base64.getEncoder().encodeToString(new byte[32]));
    }

    private StagingConfigurationValidator validator(String jwt, String otp, String delivery,
                                                      String origin, String keyId, String keySecret,
                                                      MockEnvironment environment, String smtpKey) {
        SecurityProperties security = new SecurityProperties(
                "https://dreamspex-api.onrender.com", jwt, otp, 15, 30, delivery);
        CorsProperties cors = new CorsProperties(origin);
        PaymentProperties payment = new PaymentProperties("RAZORPAY_TEST", keyId, keySecret, "");
        String storage = Path.of(System.getProperty("java.io.tmpdir"), "dreamspex-staging-test").toString();
        return new StagingConfigurationValidator(security, cors, payment, environment, smtpKey,
                storage, storage);
    }

    private MockEnvironment environment() {
        return new MockEnvironment()
                .withProperty("MAIL_HOST", "smtp.example.test")
                .withProperty("MAIL_PORT", "587")
                .withProperty("MAIL_USERNAME", "staging@example.test")
                .withProperty("MAIL_PASSWORD", "staging-mail-password")
                .withProperty("MAIL_FROM", "staging@example.test");
    }
}
